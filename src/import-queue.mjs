import { createHash, randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, lstatSync, mkdirSync, openSync, realpathSync, renameSync, unlinkSync } from 'node:fs';
import { lstat, readdir, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const LIMIT = 2000;
const SCHEMA_VERSION = 3;
const ACTIVE = ['running', 'receiving', 'paused'];
const TERMINAL = ['completed', 'cancelled'];
const RESULT_COLUMNS = { saved: 'saved', duplicate: 'duplicates', deleted: 'deleted', failed: 'failed' };
const IMAGE = /\.(?:jpe?g|png|webp|gif|heic|heif|avif|tiff?|bmp)$/i;
const SOURCE = 'IMPORT_SOURCE_UNAVAILABLE';
const DISK = 'IMPORT_DISK_FULL';
const openQueues = new Set();

function problem(status, code, message) {
  return Object.assign(new Error(message), { status, statusCode: status, code });
}

function blockingProblem(error) {
  if (error?.storageStatus || /^TRAVEL_STORAGE_/.test(error?.code || '')) {
    return { code: error.code, message: '旅行资料库不可用，请连接资料盘后继续。' };
  }
  if (error?.code === SOURCE || ['EIO', 'ENODEV', 'ENXIO'].includes(error?.code)) {
    return { code: SOURCE, message: '导入来源不可用或已被替换，请连接原来源后继续。' };
  }
  if ([DISK, 'ENOSPC', 'EDQUOT', 'SQLITE_FULL'].includes(error?.code) || (error?.errcode & 255) === 13) {
    return { code: DISK, message: '磁盘空间不足，请腾出空间后继续。' };
  }
  return null;
}

function isWithin(parent, path) {
  const difference = relative(parent, path);
  return difference === '' || (difference !== '..' && !difference.startsWith('..' + sep) && !isAbsolute(difference));
}

function pathChain(path) {
  const root = parse(path).root;
  let current = root;
  return [root, ...path.slice(root.length).split(sep).filter(Boolean).map(part => (current = join(current, part)))];
}

function checkedPart(info, last) {
  if (info.isSymbolicLink() || (!last && !info.isDirectory())) {
    throw problem(409, 'IMPORT_UNSAFE_PATH', '导入路径不能经过链接或目录联接。');
  }
  return info;
}

function inspectPathSync(path) {
  const chain = pathChain(path);
  let info;
  for (let i = 0; i < chain.length; i++) info = checkedPart(lstatSync(chain[i], { bigint: true }), i === chain.length - 1);
  return info;
}

async function inspectPath(path) {
  const chain = pathChain(path);
  let info;
  for (let i = 0; i < chain.length; i++) info = checkedPart(await lstat(chain[i], { bigint: true }), i === chain.length - 1);
  return info;
}

const rootKey = info => `${info.dev}:${info.ino}`;
const fileKey = info => `${rootKey(info)}:${info.size}:${info.mtimeNs}`;
function batchKey(values, place) {
  const parts = [...values];
  if (place) parts.push(place);
  // A new import must not alias a legacy job that still skips deleted photos.
  parts.push({ restoreDeleted: true });
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
const storedPlace = job => job.place_json ? JSON.parse(job.place_json) : null;

function inputPath(value) {
  if (typeof value !== 'string' || value.length > 4096 || value.includes('\0') || !isAbsolute(value)) {
    throw problem(400, 'IMPORT_INVALID_PATH', '请选择本机照片或文件夹的完整路径。');
  }
  return resolve(value);
}

function cleanOptions({ requestId, notes = '', date = '', place = null }) {
  if (typeof requestId !== 'string' || !requestId.trim() || requestId.length > 200 || /[\x00-\x1f]/.test(requestId)) {
    throw problem(400, 'IMPORT_INVALID_REQUEST', '导入请求标识不正确。');
  }
  if (typeof notes !== 'string' || notes.length > 20000 || typeof date !== 'string' || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    throw problem(400, 'IMPORT_INVALID_OPTIONS', '导入说明或日期格式不正确。');
  }
  if (place === null) return { requestId, notes, date, place };
  const province = typeof place?.province === 'string' ? place.province.trim() : '';
  const city = typeof place?.city === 'string' ? place.city.trim() : '';
  if (!province || province.length > 60 || !city || city.length > 80 || /[\x00-\x1f]/.test(province + city)) {
    throw problem(400, 'IMPORT_INVALID_PLACE', '请选择有效的省份和城市。');
  }
  return { requestId, notes, date, place: { country: '中国', province, city, name: city } };
}

function validManifest(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 256 || /[\x00-\x1f]/.test(value)) {
    throw problem(400, 'IMPORT_INVALID_MANIFEST', '照片清单标识不正确。');
  }
  return value;
}

export function createImportQueue({ dataDir, libraryId, assertStorage = () => {}, engine }) {
  assertStorage();
  const lexicalRoot = resolve(dataDir), libraryRoot = realpathSync.native(lexicalRoot);
  const queueKey = process.platform === 'win32' ? libraryRoot.toLowerCase() : libraryRoot;
  if (openQueues.has(queueKey)) throw problem(409, 'IMPORT_QUEUE_BUSY', '这个旅行资料库的导入队列已经打开。');
  const databasePath = join(libraryRoot, 'import-queue.sqlite');
  const stagingRoot = join(libraryRoot, 'import-queue-staging');
  const incomingRoot = join(libraryRoot, '_incoming');
  const clock = () => new Date().toISOString();
  const shutdown = new AbortController();
  let db, closing = false, closePromise, worker, scheduled, inFlight, blocked;

  function optionalPath(path) {
    try { return inspectPathSync(path); }
    catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
  }
  function write(work) {
    assertStorage();
    let begun = false;
    try {
      db.exec('BEGIN IMMEDIATE');
      begun = true;
      const result = work();
      assertStorage();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      if (begun) { try { db.exec('ROLLBACK'); } catch { } }
      const issue = blockingProblem(error);
      if (issue?.code === DISK) throw problem(507, DISK, issue.message);
      if ([5, 6].includes(error?.errcode & 255)) throw problem(503, 'IMPORT_QUEUE_BUSY', '导入队列正在写入，请稍后重试。');
      throw error;
    }
  }
  function ready() {
    if (closing) throw problem(503, 'IMPORT_QUEUE_CLOSED', '导入队列正在关闭，请稍后重试。');
    assertStorage();
  }
  const get = (sql, ...params) => db.prepare(sql).get(...params);
  const all = (sql, ...params) => db.prepare(sql).all(...params);
  const run = (sql, ...params) => db.prepare(sql).run(...params);
  const byId = id => typeof id === 'string' && id.length <= 200 ? get('SELECT * FROM jobs WHERE id=?', id) : undefined;
  const byRequest = requestId => get('SELECT jobs.* FROM requests JOIN jobs ON jobs.id=requests.job_id WHERE requests.id=?', requestId);
  const current = () => get("SELECT * FROM jobs WHERE status IN ('running','receiving','paused')");
  const waitingPhotos = () => get("SELECT COALESCE(SUM(remaining),0) AS count FROM jobs WHERE status='waiting'").count;
  const nextOrder = () => get('SELECT COALESCE(MAX(queued_order),0)+1 AS value FROM jobs').value;

  function view(job) {
    if (!job) return null;
    const issue = blocked?.jobId === job.id ? blocked : null;
    const failureReasons = job.failed ? all(`SELECT error_code,COUNT(*) AS count FROM items WHERE job_id=? AND state='failed'
      AND error_code IN ('TRAVEL_ORIGINAL_CONFLICT','TRAVEL_RESTORE_UNSUPPORTED') GROUP BY error_code ORDER BY error_code`, job.id)
      .map(({ error_code, count }) => error_code === 'TRAVEL_ORIGINAL_CONFLICT'
        ? `${count} 张照片的原路径已有不同内容，现有文件已保留。请备份并移开冲突文件后重试。`
        : `${count} 张照片无法在当前磁盘上安全补回。可将整个资料库移到 NTFS 磁盘后重试。`) : [];
    return {
      id: job.id, requestId: job.request_id, kind: job.kind, sourceName: job.source_name,
      status: issue ? 'paused' : job.status, total: job.total, received: job.received, remaining: job.remaining,
      saved: job.saved, duplicates: job.duplicates, deleted: job.deleted, failed: job.failed, cancelled: job.cancelled,
      error: issue?.message ?? job.error, errorCode: issue?.code ?? job.error_code, manifestKey: job.manifest_key,
      ...(failureReasons.length ? { failureReasons } : {}),
      place: storedPlace(job),
      needsFiles: job.kind === 'upload' && job.received < job.total && !TERMINAL.includes(job.status),
      pauseRequested: job.status === 'paused' && inFlight?.jobId === job.id,
      cancelRequested: Boolean(job.cancel_requested), createdAt: job.created_at, updatedAt: job.updated_at,
    };
  }
  function promote() {
    if (current()) return;
    const next = get("SELECT * FROM jobs WHERE status='waiting' ORDER BY queued_order LIMIT 1");
    if (next) run('UPDATE jobs SET status=?,updated_at=? WHERE id=?',
      next.error_code ? 'paused' : next.received < next.total ? 'receiving' : 'running', clock(), next.id);
  }
  function schedule() {
    if (closing || worker || scheduled || blocked) return;
    scheduled = setImmediate(() => {
      scheduled = null;
      if (closing) return;
      worker = workLoop().catch(error => {
        if (closing) return;
        const job = current();
        const issue = blockingProblem(error) || { code: 'IMPORT_QUEUE_FAILED', message: '导入队列暂时无法写入，请检查资料库后继续。' };
        if (job) blocked = { jobId: job.id, ...issue };
      }).finally(() => {
        worker = null;
        if (!closing && !blocked && current()?.status === 'running') schedule();
      });
    });
  }

  function checkCapacity(total) {
    if (!current()) return;
    const remaining = LIMIT - waitingPhotos();
    if (total > remaining) {
      throw Object.assign(problem(409, 'IMPORT_QUEUE_FULL', `等待队列最多容纳 ${LIMIT} 张照片，本批没有加入。`),
        { remaining, limit: LIMIT });
    }
  }
  function insertJob({ kind, total, sourceName, manifestKey = null, options, items, key }) {
    const id = randomUUID(), now = clock();
    return write(() => {
      const previous = byRequest(options.requestId);
      if (previous) return view(previous);
      // An upload manifest describes metadata only; independent requests may hold different bytes.
      const duplicate = kind === 'upload' ? null : get(`SELECT * FROM jobs WHERE batch_key=? AND status NOT IN ('completed','cancelled')
        ORDER BY created_at DESC,queued_order DESC LIMIT 1`, key);
      if (duplicate && !engine.hasDeletionAfter?.(duplicate.created_at)) {
        run('INSERT INTO requests(id,job_id) VALUES (?,?)', options.requestId, duplicate.id);
        return view(duplicate);
      }
      promote();
      checkCapacity(total);
      run(`INSERT INTO jobs(id,request_id,kind,source_name,manifest_key,batch_key,notes,date,place_json,restore_deleted,status,total,received,remaining,queued_order,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,1,'waiting',?,?,?,?,?,?)`, id, options.requestId, kind, sourceName, manifestKey, key,
        options.notes, options.date, options.place ? JSON.stringify(options.place) : null,
        total, items ? total : 0, total, nextOrder(), now, now);
      run('INSERT INTO requests(id,job_id) VALUES (?,?)', options.requestId, id);
      if (items) {
        const insert = db.prepare(`INSERT INTO items(job_id,ordinal,name,source_path,source_root,root_identity,file_identity,size,state)
          VALUES (?,?,?,?,?,?,?,?,'pending')`);
        items.forEach((item, ordinal) => insert.run(id, ordinal, item.name, item.path, item.root, item.rootIdentity, item.identity, item.size));
      }
      promote();
      return view(byId(id));
    });
  }

  async function scan(selected, folderOnly) {
    const results = [], filesSeen = new Set(), scannedDirectories = new Set();
    function addFile(path, info, root, rootIdentity) {
      if (!IMAGE.test(basename(path))) return;
      const identity = fileKey(info);
      const key = info.ino === 0n ? (process.platform === 'win32' ? path.toLowerCase() : path) : identity;
      if (filesSeen.has(key)) return;
      filesSeen.add(key);
      results.push({ path, name: basename(path), root, rootIdentity, identity, size: Number(info.size), key });
    }
    for (const value of selected) {
      ready();
      const requested = inputPath(value);
      const info = await inspectPath(requested);
      const path = await realpath(requested);
      if (isWithin(libraryRoot, path)) throw problem(409, 'IMPORT_LIBRARY_SOURCE', '旅行资料库里的文件不能作为导入来源。');
      if (info.isFile() && !folderOnly) {
        const root = dirname(path), rootInfo = await inspectPath(root);
        addFile(path, info, root, rootKey(rootInfo));
        continue;
      }
      if (!info.isDirectory()) throw problem(400, 'IMPORT_INVALID_PATH', '请选择照片或文件夹。');
      const rootIdentity = rootKey(info), pending = [path];
      while (pending.length) {
        ready();
        const directory = pending.pop();
        if (isWithin(libraryRoot, directory) || scannedDirectories.has(directory)) continue;
        const directoryInfo = await inspectPath(directory);
        if (!directoryInfo.isDirectory()) throw problem(409, 'IMPORT_SOURCE_CHANGED', '扫描时导入文件夹发生变化，请重新选择。');
        scannedDirectories.add(directory);
        const entries = await readdir(directory, { withFileTypes: true });
        if (entries.some(entry => entry.name === '.travel-journal-library.json')) {
          if (directory === path) throw problem(409, 'IMPORT_LIBRARY_SOURCE', '旅行资料库不能作为导入来源。');
          continue;
        }
        entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
        const directories = [];
        for (const entry of entries) {
          if (closing) ready();
          const child = join(directory, entry.name);
          if (entry.isSymbolicLink() || isWithin(libraryRoot, child)) continue;
          if (entry.isDirectory()) directories.push(child);
          else if (entry.isFile() && IMAGE.test(entry.name)) {
            const image = await lstat(child, { bigint: true });
            if (image.isFile() && !image.isSymbolicLink()) addFile(child, image, path, rootIdentity);
          }
        }
        pending.push(...directories.reverse());
      }
      const end = await inspectPath(path);
      if (rootKey(end) !== rootIdentity) throw problem(409, 'IMPORT_SOURCE_CHANGED', '扫描时导入文件夹发生变化，请重新选择。');
    }
    return results;
  }

  async function enqueueSources(input, kind) {
    ready();
    const options = cleanOptions(input);
    const previous = byRequest(options.requestId);
    if (previous) return view(previous);
    const selected = kind === 'folder' ? [input.path] : input.paths;
    if (!Array.isArray(selected) || !selected.length) throw problem(400, 'IMPORT_NO_SOURCES', '请选择要导入的照片或文件夹。');
    let items;
    try { items = await scan(selected, kind === 'folder'); }
    catch (error) {
      const repeated = !closing && byRequest(options.requestId);
      if (repeated) return view(repeated);
      if (error.status || error.storageStatus) throw error;
      throw problem(409, SOURCE, '无法读取所选来源，请检查文件夹、磁盘和访问权限。');
    }
    ready();
    if (!items.length) throw problem(400, 'IMPORT_NO_PHOTOS', '所选来源中没有支持的照片。');
    const sourceName = selected.length === 1 ? basename(inputPath(selected[0])) || '本机文件夹' : `${selected.length} 个本机来源`;
    const key = batchKey(['local', options.notes, options.date, items.map(item => item.key).sort()], options.place);
    const result = insertJob({ kind, total: items.length, sourceName, options, items, key });
    schedule();
    return result;
  }

  function enqueueUpload(input) {
    ready();
    const options = cleanOptions(input), previous = byRequest(options.requestId);
    if (previous) return view(previous);
    if (!Number.isSafeInteger(input.count) || input.count < 1) throw problem(400, 'IMPORT_INVALID_COUNT', '照片数量不正确。');
    const manifestKey = validManifest(input.manifestKey);
    const key = batchKey(['upload', options.notes, options.date, input.count, manifestKey], options.place);
    const result = insertJob({ kind: 'upload', total: input.count, sourceName: '上传照片', manifestKey, options, key });
    schedule();
    return result;
  }

  function stagePath(item) {
    if (!/^[a-f0-9-]{36}$/i.test(item.job_id) || !Number.isSafeInteger(item.ordinal) || item.ordinal < 0) {
      throw problem(409, 'IMPORT_UNSAFE_STAGING', '导入暂存标识不正确。');
    }
    return join(stagingRoot, `${item.job_id}-${item.ordinal}.image`);
  }
  function ensureStageRoot() {
    assertStorage();
    try { mkdirSync(stagingRoot); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    if (!inspectPathSync(stagingRoot).isDirectory()) throw problem(409, 'IMPORT_UNSAFE_STAGING', '导入暂存目录不正确。');
  }
  function incomingPath(path) {
    const local = inputPath(path);
    const canonical = isWithin(lexicalRoot, local) ? resolve(libraryRoot, relative(lexicalRoot, local)) : local;
    const parent = dirname(canonical);
    if (dirname(parent) !== incomingRoot || !/^upload-[A-Za-z0-9]+$/.test(basename(parent)) || !/^[a-f0-9]{32}$/i.test(basename(canonical))) {
      throw problem(400, 'IMPORT_INVALID_UPLOAD', '接收的文件不属于本次上传目录。');
    }
    return canonical;
  }
  function completeStage(item, allowMissing) {
    const destination = stagePath(item);
    let info = optionalPath(destination);
    if (!info) {
      const source = incomingPath(resolve(libraryRoot, item.stage_source)), incoming = optionalPath(source);
      if (!incoming && allowMissing) {
        write(() => run("DELETE FROM items WHERE job_id=? AND ordinal=? AND state='staging'", item.job_id, item.ordinal));
        return;
      }
      if (!incoming?.isFile() || fileKey(incoming) !== item.file_identity) throw problem(409, 'IMPORT_UPLOAD_CHANGED', '上传临时文件已改变，请重新选择并继续。');
      ensureStageRoot();
      const fd = openSync(source, 'r+');
      try { fsyncSync(fd); } finally { closeSync(fd); }
      assertStorage();
      renameSync(source, destination);
      info = inspectPathSync(destination);
    }
    if (!info.isFile() || fileKey(info) !== item.file_identity) throw problem(409, 'IMPORT_UPLOAD_CHANGED', '上传暂存文件已改变，请重新选择并继续。');
    write(() => {
      run("UPDATE items SET state='pending',stage_source=NULL WHERE job_id=? AND ordinal=? AND state='staging'", item.job_id, item.ordinal);
      run(`UPDATE jobs SET received=received+1, updated_at=?,
        status=CASE WHEN status='receiving' AND received+1=total THEN 'running' ELSE status END
        WHERE id=? AND received=?`, clock(), item.job_id, item.ordinal);
    });
  }
  function recoverStages(jobId) {
    for (const item of all("SELECT * FROM items WHERE state='staging' AND job_id=? ORDER BY ordinal", jobId)) completeStage(item, true);
  }

  function receive({ jobId, offset, manifestKey, files }) {
    ready();
    const job = byId(jobId);
    if (!job || job.kind !== 'upload') throw problem(404, 'IMPORT_JOB_NOT_FOUND', '找不到这个上传任务。');
    if (job.manifest_key !== validManifest(manifestKey)) throw problem(409, 'IMPORT_MANIFEST_MISMATCH', '请重新选择与原任务相同的照片清单。');
    if (!Number.isSafeInteger(offset) || offset < 0 || !Array.isArray(files) || !files.length || files.length > 50 || offset + files.length > job.total) {
      throw problem(400, 'IMPORT_INVALID_OFFSET', '上传分段范围不正确。');
    }
    if ((job.status === 'paused' || job.cancel_requested || blocked?.jobId === jobId) && offset + files.length > job.received) {
      throw problem(409, 'IMPORT_UPLOAD_PAUSED', '任务已暂停或正在取消，请查看当前进度。');
    }
    try {
      const entries = files.map(file => {
        const path = incomingPath(file?.path), { name, sha256 } = file;
        const info = optionalPath(path);
        if (!info?.isFile() || typeof name !== 'string' || !name || name.length > 200 || /[\\/\x00-\x1f]/.test(name)
          || typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256)) {
          throw problem(400, 'IMPORT_INVALID_UPLOAD', '上传文件名、类型或临时文件不正确。');
        }
        const size = Number(info.size);
        if (file.size !== undefined && file.size !== size) throw problem(409, 'IMPORT_UPLOAD_CHANGED', '上传文件大小与照片清单不一致。');
        return { path, name, size, sha256, identity: fileKey(info) };
      });
      if (!TERMINAL.includes(job.status)) recoverStages(jobId);
      const received = byId(jobId).received;
      if (offset > received) throw problem(409, 'IMPORT_OFFSET_MISMATCH', '上传进度已变化，请从已收到的照片数继续。');
      if (TERMINAL.includes(job.status) && offset + entries.length > received) throw problem(409, 'IMPORT_JOB_FINISHED', '这个导入任务已经结束。');
      const overlap = Math.min(received - offset, entries.length);
      for (let i = 0; i < overlap; i++) {
        const old = get('SELECT name,size,sha256 FROM items WHERE job_id=? AND ordinal=?', jobId, offset + i);
        const incoming = entries[i];
        if (!old || old.name !== incoming.name || old.size !== incoming.size) {
          throw problem(409, 'IMPORT_MANIFEST_MISMATCH', '重传的照片和原任务不一致。');
        }
        if (!old.sha256) throw problem(409, 'IMPORT_UNVERIFIABLE_PREFIX', '旧任务缺少已接收照片的校验记录，请重新开始导入。');
        if (old.sha256 !== incoming.sha256) throw problem(409, 'IMPORT_MANIFEST_MISMATCH', '重传的照片内容和原任务不一致。');
      }
      for (let i = overlap; i < entries.length; i++) {
        const ordinal = offset + i, entry = entries[i];
        const stageSource = relative(libraryRoot, entry.path);
        write(() => run(`INSERT INTO items(job_id,ordinal,name,file_identity,size,state,stage_source,has_stage,sha256)
          VALUES (?,?,?,?,?,'staging',?,1,?)`, jobId, ordinal, entry.name, entry.identity, entry.size, stageSource, entry.sha256));
        completeStage({ job_id: jobId, ordinal, file_identity: entry.identity, stage_source: stageSource }, false);
      }
      if (job.error_code && job.status === 'waiting') write(() => run('UPDATE jobs SET error=NULL,error_code=NULL WHERE id=?', jobId));
      schedule();
      return view(byId(jobId));
    } catch (error) {
      const issue = blockingProblem(error);
      if (issue) {
        try { setPause(jobId, issue); } catch { if (ACTIVE.includes(job.status)) blocked = { jobId, ...issue }; }
        if (issue.code === DISK) throw problem(507, DISK, issue.message);
      }
      if (error.status) throw error;
      throw problem(409, 'IMPORT_UPLOAD_CHANGED', '暂存照片失败，请核对接收进度后重试。');
    }
  }

  function cleanStaged() {
    for (const item of all("SELECT * FROM items WHERE has_stage=1 AND state IN ('saved','duplicate','deleted','cancelled')")) {
      try {
        assertStorage();
        const path = stagePath(item), info = optionalPath(path);
        if (info) {
          if (!info.isFile() || fileKey(info) !== item.file_identity) continue;
          unlinkSync(path);
        }
        write(() => run('UPDATE items SET has_stage=0 WHERE job_id=? AND ordinal=?', item.job_id, item.ordinal));
      } catch { }
    }
  }

  function terminal(job, status) {
    if (status === 'cancelled') {
      run("UPDATE items SET state='cancelled',stage_source=NULL WHERE job_id=? AND state IN ('pending','processing','staging')", job.id);
    }
    run(`UPDATE jobs SET status=?,cancel_requested=0,cancelled=cancelled+remaining,remaining=0,
      error=NULL,error_code=NULL,finish_pending=1,updated_at=? WHERE id=?`, status, clock(), job.id);
    promote();
  }
  function setPause(jobId, issue) {
    write(() => {
      run("UPDATE items SET state='pending' WHERE job_id=? AND state='processing'", jobId);
      run(`UPDATE jobs SET status=CASE WHEN status IN ('running','receiving') THEN 'paused' ELSE status END,
        error=?,error_code=?,updated_at=? WHERE id=?`,
      issue.message, issue.code, clock(), jobId);
    });
  }
  function commitResult(job, item, status, result) {
    const updated = run("UPDATE items SET state=?,record_id=?,sha256=COALESCE(sha256,?),error_code=? WHERE job_id=? AND ordinal=? AND state='processing'",
      status, result.recordId ?? null, result.sha256 ?? null, result.errorCode ?? null, job.id, item.ordinal);
    if (!updated.changes) return;
    run(`UPDATE jobs SET ${RESULT_COLUMNS[status]}=${RESULT_COLUMNS[status]}+1,remaining=remaining-1,updated_at=? WHERE id=?`, clock(), job.id);
    const latest = byId(job.id);
    if (latest.cancel_requested) terminal(latest, 'cancelled');
    else if (!latest.remaining) terminal(latest, 'completed');
  }
  function recordResult(job, item, status, result = {}) {
    write(() => commitResult(job, item, status, result));
  }

  function failedResult(error) {
    return { status: 'failed', errorCode: String(error?.code || 'IMPORT_PHOTO_FAILED').slice(0, 80) };
  }

  function previousResult(item) {
    try {
      const receipt = engine.queuedImportResult?.({ jobId: item.job_id, itemId: String(item.ordinal) });
      if (receipt && !item.source_path && item.sha256 && receipt.sha256 !== item.sha256) {
        throw problem(409, 'IMPORT_PHOTO_CHANGED', '已归档照片与接收时的校验值不一致。');
      }
      return receipt;
    }
    catch (error) {
      if (blockingProblem(error)) throw error;
      // A bad original is a failed photo, not an unusable queue or library.
      return failedResult(error);
    }
  }

  function cancelJob(job) {
    const processing = get("SELECT * FROM items WHERE job_id=? AND state='processing'", job.id);
    const committed = processing && previousResult(processing);
    if (committed) {
      run('UPDATE jobs SET cancel_requested=1 WHERE id=?', job.id);
      commitResult(job, processing, committed.status, committed);
    } else terminal(job, 'cancelled');
  }

  async function sourceFor(item, kind) {
    if (kind === 'upload') {
      const path = stagePath(item), info = optionalPath(path);
      if (!info?.isFile() || fileKey(info) !== item.file_identity) throw problem(409, 'IMPORT_UPLOAD_CHANGED', '暂存照片已丢失或改变。');
      return path;
    }
    try {
      const root = await inspectPath(item.source_root);
      if (!root.isDirectory() || rootKey(root) !== item.root_identity) throw new Error('source identity mismatch');
    } catch {
      throw problem(409, SOURCE, '原始照片来源不可用或已被替换。');
    }
    const path = item.source_path;
    if (!isWithin(item.source_root, path) || isWithin(libraryRoot, path)) throw problem(409, 'IMPORT_UNSAFE_PATH', '原始照片路径不正确。');
    const info = await inspectPath(path);
    if (!info.isFile() || fileKey(info) !== item.file_identity) throw problem(409, 'IMPORT_PHOTO_CHANGED', '这张原始照片已发生变化。');
    return path;
  }

  async function workLoop() {
    const finishFailures = new Set();
    while (!closing && !blocked) {
      cleanStaged();
      for (const pending of all('SELECT id FROM jobs WHERE finish_pending=1 ORDER BY queued_order')) {
        if (closing) return;
        if (finishFailures.has(pending.id)) continue;
        try {
          assertStorage();
          await engine.finishQueuedImport(pending.id);
          write(() => run('UPDATE jobs SET finish_pending=0 WHERE id=?', pending.id));
        } catch (error) {
          if (blockingProblem(error)) throw error;
          finishFailures.add(pending.id);
        }
      }
      const job = current();
      if (!job || job.status !== 'running' || closing) return;
      const item = get("SELECT * FROM items WHERE job_id=? AND state='pending' ORDER BY ordinal LIMIT 1", job.id);
      if (!item) {
        if (!job.remaining) write(() => terminal(job, 'completed'));
        else setPause(job.id, { code: 'IMPORT_QUEUE_INCOMPLETE', message: '任务进度不完整，请查看状态后重试。' });
        continue;
      }
      write(() => run("UPDATE items SET state='processing' WHERE job_id=? AND ordinal=?", job.id, item.ordinal));
      inFlight = { jobId: job.id };
      let committed;
      try {
        const previous = previousResult(item);
        if (previous) {
          committed = previous;
          recordResult(job, item, committed.status, committed);
          continue;
        }
        const path = await sourceFor(item, job.kind), latest = byId(job.id);
        if (closing || latest.status !== 'running' || latest.cancel_requested) {
          write(() => {
            if (latest.cancel_requested) terminal(latest, 'cancelled');
            else run("UPDATE items SET state='pending' WHERE job_id=? AND ordinal=?", job.id, item.ordinal);
          });
          continue;
        }
        assertStorage();
        const [dev, ino, size, mtimeNs] = item.file_identity.split(':');
        const place = storedPlace(job);
        const result = await engine.importQueuedFile({
          jobId: job.id, itemId: String(item.ordinal), path, name: item.name, notes: job.notes, date: job.date,
          ...(place ? { place } : {}),
          ...(job.restore_deleted === 1 ? { restoreDeleted: true, restoreDeletedBefore: job.created_at } : {}),
          ...(job.kind === 'upload' && item.sha256 ? { sourceSha256: item.sha256 } : {}),
          sourceIdentity: { dev, ino, size, mtimeNs }, signal: shutdown.signal,
        });
        if (!['saved', 'duplicate', 'deleted'].includes(result?.status)) throw new Error('Unexpected import result');
        committed = result;
        recordResult(job, item, committed.status, committed);
      } catch (error) {
        if (closing) continue;
        let issue = blockingProblem(error);
        if (!issue && error?.code === 'ENOENT' && job.kind !== 'upload') {
          try {
            if (rootKey(await inspectPath(item.source_root)) !== item.root_identity) throw new Error('source identity mismatch');
          } catch { issue = { code: SOURCE, message: '原始照片来源不可用，请连接原来源后继续。' }; }
        }
        try {
          // The archive may already be durable even if acknowledging it in SQLite failed.
          if (committed) recordResult(job, item, committed.status, committed);
          else if (byId(job.id).cancel_requested) write(() => cancelJob(byId(job.id)));
          else if (issue) setPause(job.id, issue);
          else recordResult(job, item, 'failed', failedResult(error));
        } catch (stateError) {
          blocked = { jobId: job.id, ...(blockingProblem(stateError) || issue ||
            { code: 'IMPORT_QUEUE_FAILED', message: '导入进度暂时无法保存，请检查资料库后继续。' }) };
        }
      } finally { inFlight = null; }
      if (!closing) await new Promise(done => setImmediate(done));
    }
  }

  function action({ jobId, action: command }) {
    ready();
    const result = write(() => {
      const job = byId(jobId);
      if (!job) throw problem(404, 'IMPORT_JOB_NOT_FOUND', '找不到这个导入任务。');
      const now = clock(), active = ACTIVE.includes(job.status);
      if (command === 'pause' && active && !job.cancel_requested) {
        run("UPDATE jobs SET status='paused',updated_at=? WHERE id=?", now, jobId);
      } else if (command === 'resume' && active && !job.cancel_requested) {
        if (!inFlight) run("UPDATE items SET state='pending' WHERE job_id=? AND state='processing'", jobId);
        run('UPDATE jobs SET status=?,error=NULL,error_code=NULL,updated_at=? WHERE id=?',
          job.received < job.total ? 'receiving' : 'running', now, jobId);
      } else if (command === 'cancel' && !TERMINAL.includes(job.status)) {
        if (inFlight?.jobId === jobId) run('UPDATE jobs SET cancel_requested=1,updated_at=? WHERE id=?', now, jobId);
        else cancelJob(job);
      } else if (command === 'retry' && TERMINAL.includes(job.status) && job.failed > 0) {
        promote();
        checkCapacity(job.failed);
        run("UPDATE items SET state='pending',error_code=NULL WHERE job_id=? AND state='failed'", jobId);
        run(`UPDATE jobs SET status='waiting',remaining=failed,failed=0,error=NULL,error_code=NULL,
          queued_order=?,updated_at=? WHERE id=?`, nextOrder(), now, jobId);
        promote();
      } else if (!['pause', 'resume', 'cancel', 'retry'].includes(command)) {
        throw problem(400, 'IMPORT_INVALID_ACTION', '未知的导入队列操作。');
      } else if (!(command === 'cancel' && job.status === 'cancelled')) {
        throw problem(409, 'IMPORT_ACTION_CONFLICT', '任务当前状态不能执行这个操作。');
      }
      return byId(jobId);
    });
    if (blocked?.jobId === jobId && ['resume', 'cancel'].includes(command)) blocked = null;
    schedule();
    return view(result);
  }

  try {
    for (const path of [databasePath, `${databasePath}-journal`, `${databasePath}-wal`, `${databasePath}-shm`]) {
      const info = optionalPath(path);
      if (info && !info.isFile()) throw problem(409, 'IMPORT_INVALID_DATABASE', '导入队列数据库路径不正确。');
    }
    db = new DatabaseSync(databasePath);
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL');
    const version = get('PRAGMA user_version').user_version;
    if (version === 0) {
      if (get("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' LIMIT 1")) {
        throw problem(409, 'IMPORT_QUEUE_VERSION', '导入队列数据库格式不正确。');
      }
      write(() => {
        db.exec(`
          CREATE TABLE queue_meta (library_id TEXT PRIMARY KEY) STRICT;
          CREATE TABLE jobs (
            id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, source_name TEXT NOT NULL,
            manifest_key TEXT, batch_key TEXT NOT NULL, notes TEXT NOT NULL, date TEXT NOT NULL, status TEXT NOT NULL,
            total INTEGER NOT NULL, received INTEGER NOT NULL, remaining INTEGER NOT NULL,
            saved INTEGER NOT NULL DEFAULT 0, duplicates INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0,
            failed INTEGER NOT NULL DEFAULT 0, cancelled INTEGER NOT NULL DEFAULT 0,
            queued_order INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            error TEXT, error_code TEXT, cancel_requested INTEGER NOT NULL DEFAULT 0, finish_pending INTEGER NOT NULL DEFAULT 0,
            place_json TEXT,
            restore_deleted INTEGER NOT NULL DEFAULT 0 CHECK (restore_deleted IN (0, 1))
          ) STRICT;
          CREATE UNIQUE INDEX only_current_job ON jobs ((1)) WHERE status IN ('running','receiving','paused');
          CREATE INDEX ordered_jobs ON jobs (status, queued_order);
          CREATE INDEX live_batch ON jobs (batch_key) WHERE status NOT IN ('completed','cancelled');
          CREATE TABLE requests (
            id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id)
          ) STRICT;
          CREATE TABLE items (
            job_id TEXT NOT NULL REFERENCES jobs(id), ordinal INTEGER NOT NULL, name TEXT NOT NULL,
            source_path TEXT, source_root TEXT, root_identity TEXT, file_identity TEXT NOT NULL, size INTEGER NOT NULL,
            state TEXT NOT NULL, stage_source TEXT, has_stage INTEGER NOT NULL DEFAULT 0,
            record_id TEXT, sha256 TEXT, error_code TEXT,
            PRIMARY KEY (job_id, ordinal)
          ) STRICT;
          CREATE INDEX ordered_items ON items (job_id, state, ordinal);
          CREATE INDEX staged_cleanup ON items (job_id, ordinal) WHERE has_stage=1 AND state IN ('saved','duplicate','deleted','cancelled');
          PRAGMA user_version=${SCHEMA_VERSION};
        `);
        run('INSERT INTO queue_meta(library_id) VALUES (?)', libraryId);
      });
    } else if (![1, 2, SCHEMA_VERSION].includes(version) || get('SELECT library_id FROM queue_meta')?.library_id !== libraryId) {
      throw problem(409, 'IMPORT_QUEUE_VERSION', '导入队列版本或资料库身份不匹配。');
    } else if (version < SCHEMA_VERSION) {
      write(() => {
        if (version === 1) db.exec('ALTER TABLE jobs ADD COLUMN place_json TEXT;');
        db.exec(`ALTER TABLE jobs ADD COLUMN restore_deleted INTEGER NOT NULL DEFAULT 0 CHECK (restore_deleted IN (0, 1));
          PRAGMA user_version=${SCHEMA_VERSION};`);
      });
    }
    // A crash can land after the archive commit and before the queue result.
    // Resolve that one item from its archive receipt before applying a pending cancellation.
    for (const item of all("SELECT * FROM items WHERE state='processing'")) {
      const previous = previousResult(item);
      if (previous) recordResult(byId(item.job_id), item, previous.status, previous);
    }
    write(() => {
      run("UPDATE items SET state='pending' WHERE state='processing'");
      const job = current();
      if (job?.cancel_requested) terminal(job, 'cancelled');
      promote();
    });
    for (const item of all("SELECT DISTINCT job_id FROM items WHERE state='staging'")) {
      try { recoverStages(item.job_id); }
      catch (error) {
        const issue = blockingProblem(error) || { code: 'IMPORT_UPLOAD_CHANGED', message: '上次上传未能恢复，请检查照片后重试。' };
        setPause(item.job_id, issue);
      }
    }
    openQueues.add(queueKey);
    schedule();
  } catch (error) {
    db?.close();
    throw error;
  }

  return {
    enqueueFolder: input => enqueueSources(input, 'folder'),
    enqueuePaths: input => enqueueSources(input, 'paths'),
    enqueueUpload, receive, action,
    getJob(id) { ready(); return view(byId(id)); },
    status() {
      ready();
      return {
        active: view(current()),
        waiting: all("SELECT * FROM jobs WHERE status='waiting' ORDER BY queued_order").map(view),
        waitingPhotos: waitingPhotos(), limit: LIMIT,
        recent: all("SELECT * FROM jobs WHERE status IN ('completed','cancelled') ORDER BY updated_at DESC,queued_order DESC LIMIT 20").map(view),
        retryable: all("SELECT * FROM jobs WHERE status IN ('completed','cancelled') AND failed>0 ORDER BY updated_at DESC,queued_order DESC").map(view),
      };
    },
    close() {
      if (closePromise) return closePromise;
      closing = true;
      shutdown.abort();
      if (scheduled) clearImmediate(scheduled);
      closePromise = (async () => {
        try { await worker; } finally { try { db.close(); } finally { openQueues.delete(queueKey); } }
      })();
      return closePromise;
    },
  };
}
