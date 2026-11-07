import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { lstat, mkdir, mkdtemp, open, readFile, writeFile, rename, realpath, rm, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Busboy from 'busboy';
import { createGeoIndex } from './geo.mjs';
import { createPreviewCache } from './preview-cache.mjs';
import { controlDirectory, createFolderPicker, createStorageController } from './storage.mjs';

export const name = 'travel-journal';
export const inject = ['webServer', 'connection', 'llm', 'agentDefaultModel', 'attachments'];

/** Resolve the optional model adapter defensively: a DSH build that drops an
 * optional AI service should disable that feature, not fail the whole plugin. */
function modelAdapterOrNull(createModelAdapter, ctx, getConfig) {
  try { return createModelAdapter(ctx, getConfig); } catch { return null; }
}
export const API_PREFIX = '/travel-journal/api';
export const DEFAULT_CONFIG = Object.freeze({
  enabled: false, aiEnabled: true, aiImages: true, maxMediaBytes: 50 * 1024 * 1024,
  geocodingEnabled: true, footprintLevel: 'city', modelProvider: '', modelId: '',
});
const BUNDLED_DEMO_DIR = fileURLToPath(new URL('../demo/', import.meta.url));
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost']);
const LOOPBACK_PEERS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/tiff', 'image/avif', 'image/bmp']);
const IMPORT_ROUTES = new Set(['/imports', '/imports/pick', '/imports/folder', '/imports/paths', '/imports/upload', '/imports/receive', '/imports/action']);
const LIBRARY_ROUTES = new Set(['/record', '/records', '/search', '/map', '/media', '/retry-places', '/missing-locations',
  '/archive', '/archive/covers', '/archive/cover',
  '/fill-missing-locations', '/reset-usage', '/import', '/demo', '/draft/commit', '/draft/cancel',
  '/edit-record', '/edit-photo', '/delete-record', '/delete-photo', '/reprocess']);
const emptyImportStatus = () => ({ active: null, waiting: [], waitingPhotos: 0, limit: 2000, recent: [], retryable: [] });
function fail(message, status = 400) { return Object.assign(new Error(message), { status }); }
function textField(value, max, label) {
  if (typeof value !== 'string' || value.length > max) throw fail(`${label}格式不正确。`);
  return value.trim();
}

function downloadName(photo) {
  const original = String(photo.name || '照片').toWellFormed();
  const caption = Array.from(String(photo.caption || '').toWellFormed().trim()).slice(0, 72).join('')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '');
  const captured = String(photo.metadata?.capturedAt || '').match(/^(\d{4})[:-](\d{2})[:-](\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
  if (!caption || !captured) return original;
  const day = captured.slice(1, 4).join('-');
  const time = captured[4] ? `_${captured.slice(4, 7).join('-')}` : '';
  const extension = String(photo.relativePath || original).match(/\.[a-z0-9]{2,5}$/i)?.[0] || '';
  return `${caption}_${day}${time}${extension}`;
}

export function validateConfig(input, previous = DEFAULT_CONFIG) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail('设置格式不正确。');
  const next = { ...DEFAULT_CONFIG };
  // Only these preferences belong to the desktop journal. Old transport secrets never reach the UI.
  for (const key of Object.keys(DEFAULT_CONFIG)) if (Object.hasOwn(previous, key)) next[key] = previous[key];
  for (const key of ['aiEnabled', 'aiImages', 'geocodingEnabled']) {
    if (Object.hasOwn(input, key)) {
      if (typeof input[key] !== 'boolean') throw fail(`${key} 必须是开关。`);
      next[key] = input[key];
    }
  }
  for (const key of ['modelProvider', 'modelId']) {
    if (Object.hasOwn(input, key)) next[key] = textField(input[key], 200, key);
  }
  if (Object.hasOwn(input, 'maxMediaBytes')) {
    if (!Number.isSafeInteger(input.maxMediaBytes) || input.maxMediaBytes < 1024 * 1024 || input.maxMediaBytes > 200 * 1024 * 1024) throw fail('单文件大小设置无效。');
    next.maxMediaBytes = input.maxMediaBytes;
  }
  if (Object.hasOwn(input, 'footprintLevel')) {
    if (!['city', 'district'].includes(input.footprintLevel)) throw fail('足迹粒度必须是市或区县。');
    next.footprintLevel = input.footprintLevel;
  }
  if (Boolean(next.modelProvider) !== Boolean(next.modelId)) throw fail('指定模型时需要同时填写提供方和模型 ID。');
  next.enabled = false;
  return next;
}
function safeError(error) {
  return String(error?.message || error || '操作失败。').replace(/([?&](?:access_token|token|key|secret)=)[^\s&]*/gi, '$1[已隐藏]').slice(0, 600);
}
async function atomicJson(file, value) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, file);
}
function lifecycleDiagnostic(dataDir, ctx) {
  const snapshot = { build: 'desktop-lifecycle-3', instance: randomBytes(6).toString('hex'), pid: process.pid, startedAt: new Date().toISOString(), port: null, events: [] };
  let writing = Promise.resolve();
  return async (stage, details = {}) => {
    try { snapshot.port = ctx.webServer?.port ?? null; } catch { snapshot.port = null; }
    const event = { at: new Date().toISOString(), stage };
    for (const key of ['host', 'remoteAddress', 'status', 'errorName', 'errorCode', 'error']) if (details[key] !== undefined) event[key] = String(details[key]).slice(0, 600);
    snapshot.stage = stage; snapshot.events = [...snapshot.events.slice(-29), event];
    const value = JSON.parse(JSON.stringify(snapshot));
    writing = writing.then(() => atomicJson(join(dataDir, 'lifecycle-diagnostic.json'), value)).catch(() => {});
    await writing;
  };
}
async function readBytes(request, limit) {
  if (Number(request.headers['content-length']) > limit) throw fail('文件过大。', 413);
  let size = 0;
  const chunks = [];
  for await (const part of request) {
    const bytes = Buffer.from(part);
    size += bytes.length;
    if (size > limit) throw fail('文件过大。', 413);
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}
export async function readJsonBody(request, limit = 64 * 1024) {
  if (String(request.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') throw fail('请求需要使用 JSON。', 415);
  const bytes = await readBytes(request, limit);
  try {
    const value = JSON.parse(bytes.toString('utf8') || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw fail('请求 JSON 不正确。'); }
}
export async function readImport(request, dataDir, { signal, assertStorage = () => {}, hashFiles = false } = {}) {
  let parser;
  // Busboy emits partsLimit when the limit itself is reached. Allow the closing
  // boundary after all 50 files and three supported fields; file/field limits
  // independently reject any additional input.
  try { parser = Busboy({ headers: request.headers, defParamCharset: 'utf8', limits: { files: 50, fields: 3, fieldSize: 20000, parts: 54 } }); }
  catch { throw fail('请以表单上传图片。', 415); }
  if (signal?.aborted) throw fail('插件正在关闭。', 503);
  assertStorage();
  const incomingDir = resolve(dataDir, '_incoming');
  await mkdir(incomingDir, { recursive: false }).catch(error => { if (error.code !== 'EEXIST') throw error; });
  assertStorage();
  const incoming = await lstat(incomingDir);
  const realIncoming = join(await realpath(dataDir), '_incoming');
  if (!incoming.isDirectory() || incoming.isSymbolicLink() || await realpath(incomingDir) !== realIncoming) {
    throw fail('导入临时目录不能是链接。', 409);
  }
  const uploadDir = await mkdtemp(join(incomingDir, 'upload-'));
  // Each request owns only this freshly-created directory, including on Windows.
  if (dirname(resolve(uploadDir)) !== incomingDir) throw new Error('上传临时目录不正确。');
  const uploadIdentity = await lstat(uploadDir);
  let cleanupPromise;
  const cleanup = () => cleanupPromise ||= (async () => {
    try {
      assertStorage();
      const current = await lstat(uploadDir);
      if (!current.isDirectory() || current.isSymbolicLink() || current.dev !== uploadIdentity.dev || current.ino !== uploadIdentity.ino || dirname(await realpath(uploadDir)) !== realIncoming) return;
    } catch { return; }
    await rm(uploadDir, { recursive: true, force: true });
  })();
  const files = [], writes = [], fields = {};
  const controller = new AbortController();
  let error;
  const finished = new Promise((done) => parser.once('close', done));
  function stop(problem) {
    error ||= problem;
    request.unpipe(parser);
    controller.abort();
    parser.destroy(error);
    // Do not destroy the HTTP request: its socket must still deliver the error response.
    request.resume();
  }
  const aborted = () => stop(fail('上传已中断。'));
  const closing = () => stop(fail('插件正在关闭。', 503));
  const requestError = () => stop(fail('上传内容未完整收到。'));
  parser.on('file', (key, file, info) => {
    if (error || key !== 'files') { file.resume(); stop(error || fail('未知的上传字段。')); return; }
    try { assertStorage(); } catch (problem) { file.resume(); stop(problem); return; }
    const path = join(uploadDir, randomBytes(16).toString('hex'));
    const received = { path, name: basename(info.filename || 'photo').slice(0, 200) };
    files.push(received);
    const digest = hashFiles ? createHash('sha256') : null;
    const streams = digest ? [new Transform({ transform(chunk, _encoding, done) { digest.update(chunk); done(null, chunk); } })] : [];
    // pipeline propagates disk backpressure through Busboy to the HTTP request.
    writes.push(pipeline(file, ...streams, createWriteStream(path, { flags: 'wx', mode: 0o600 }), { signal: controller.signal })
      .then(() => { if (digest) received.sha256 = digest.digest('hex'); })
      .catch((problem) => stop(error || (problem.code === 'ENOSPC' ? fail('磁盘空间不足，无法保存照片。', 507) : problem))));
  });
  parser.on('field', (key, value, info) => {
    if (!['notes', 'date', 'demo'].includes(key) || info.valueTruncated || Object.hasOwn(fields, key)) { stop(fail('导入说明格式不正确。')); return; }
    fields[key] = value;
  });
  parser.on('filesLimit', () => stop(fail('一次最多导入 50 张照片。', 413)));
  for (const event of ['fieldsLimit', 'partsLimit']) parser.on(event, () => stop(fail('导入字段过多，最多上传 50 张照片。', 413)));
  parser.on('error', () => stop(error || fail('上传内容未完整收到。')));
  request.once('aborted', aborted);
  request.once('error', requestError);
  signal?.addEventListener('abort', closing, { once: true });
  try {
    if (request.aborted) aborted();
    else if (signal?.aborted) closing();
    else request.pipe(parser);
    await finished;
    await Promise.all(writes);
    if (error) throw error;
    if (!files.length) throw fail('请选择至少一张照片。');
    if (fields.date && !/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) throw fail('日期格式应为 YYYY-MM-DD。');
    return { files, notes: fields.notes || '', ...(fields.date ? { date: fields.date } : {}), demo: fields.demo === 'true', cleanup };
  } catch (problem) {
    await cleanup();
    throw problem;
  } finally {
    request.off('aborted', aborted); request.off('error', requestError);
    signal?.removeEventListener('abort', closing);
  }
}
function responseHeaders(response, status, type) {
  response.statusCode = status;
  response.setHeader('content-type', type);
  response.setHeader('cache-control', 'no-store');
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('cross-origin-resource-policy', 'same-origin');
}
function respond(response, status, body, type = 'application/json; charset=utf-8') {
  if (response.headersSent || response.destroyed) return;
  responseHeaders(response, status, type);
  response.end(Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
export function requestRejection(ctx, request, csrfToken) {
  if (typeof ctx.connection?.requestRejection !== 'function') return 503;
  const rejected = ctx.connection.requestRejection(request);
  if (rejected !== undefined) return rejected;
  if (!LOOPBACK_PEERS.has(request.socket?.remoteAddress)) return 403;
  let target;
  try { target = new URL(`http://${request.headers.host}`); } catch { return 403; }
  if (!LOOPBACK_HOSTS.has(target.hostname) || Number(target.port || '80') !== Number(ctx.webServer.port)) return 403;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const given = request.headers['x-travel-csrf'];
    if (typeof given !== 'string') return 403;
    const left = Buffer.from(given), right = Buffer.from(csrfToken);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return 403;
  }
  return undefined;
}
async function controlledFile(dataDir, file) {
  const root = await realpath(dataDir);
  const actual = await realpath(isAbsolute(file) ? resolve(file) : resolve(dataDir, file));
  const rel = relative(root, actual);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw fail('图片路径不在旅行档案内。', 403);
  const info = await stat(actual);
  if (!info.isFile()) throw fail('图片文件不存在。', 404);
  return { absolute: actual, size: info.size };
}

function missingOriginal() {
  return Object.assign(fail('原图在资料文件夹中缺失。重新导入同一张原图可补回档案。', 404), { code: 'TRAVEL_ORIGINAL_MISSING' });
}

async function sendOriginal(response, path, media, resource) {
  const file = await open(path, 'r').catch(error => {
    if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
    resource.assertStorage();
    throw missingOriginal();
  });
  try {
    const before = await file.stat({ bigint: true });
    if (!before.isFile()) throw missingOriginal();
    const signal = resource.controller.signal;
    const stream = () => file.createReadStream({ start: 0, autoClose: false, signal });
    const expected = media.metadata?.sha256;
    if (expected) {
      const digest = createHash('sha256');
      for await (const bytes of stream()) digest.update(bytes);
      const after = await file.stat({ bigint: true });
      if (digest.digest('hex') !== String(expected).toLowerCase() || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) {
        throw Object.assign(fail('原图内容与档案记录不一致。请检查资料文件夹中的文件。', 409), { code: 'TRAVEL_ORIGINAL_CONFLICT' });
      }
    }
    resource.assertStorage();
    response.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName(media))}`);
    responseHeaders(response, 200, media.metadata.mime);
    response.setHeader('content-length', String(before.size));
    await pipeline(stream(), response);
  } finally { await file.close(); }
}

/** Local DSH host. Dependencies are explicit so HTTP tests never need a model or QQ. */
export async function createTravelHost({ ctx, dataDir, controlDir = controlDirectory(dataDir), demoDir = BUNDLED_DEMO_DIR, createEngine, downloadMedia, inspectImage, createModelAdapter, fixedModel, createEnrichment, folderPicker = createFolderPicker(), diagnostic = async () => {} }) {
  await diagnostic('host-enter');
  if (typeof ctx.connection?.requestRejection !== 'function' || typeof ctx.webServer?.register !== 'function') throw new Error('旅行记忆需要 DSH 0.2.1-rc.5 的 connection 与 webServer 接口。');
  const storage = await createStorageController({ dataDir, controlDir });
  const configFile = storage.configFile;
  function desktopConfig(input, previous) {
    if (fixedModel && input && typeof input === 'object' && !Array.isArray(input)) {
      input = { ...input, modelProvider: fixedModel.provider, modelId: fixedModel.model, geocodingEnabled: true };
    }
    return validateConfig(input, previous);
  }
  let config;
  try { config = desktopConfig(JSON.parse(await readFile(configFile, 'utf8'))); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error('旅行记忆设置无法读取，请检查本机控制目录中的 config.json。');
    config = desktopConfig({});
    try { if (storage.legacyConfigPath) config = desktopConfig(JSON.parse(await readFile(storage.legacyConfigPath, 'utf8'))); }
    catch (legacyError) { if (legacyError.code !== 'ENOENT') await diagnostic('legacy-config-unreadable', { error: safeError(legacyError) }); }
    await atomicJson(configFile, config);
  }
  const csrfToken = randomBytes(32).toString('hex');
  const getConfig = () => ({ ...config });
  await diagnostic('config-ready');
  let disposed = false;
  let closePromise;
  let demoPromise;
  let initialStateObserved = false;
  let configQueue = Promise.resolve();
  const activeImports = new Set();
  const importAdmissions = new Set();
  const activeOperations = new Set();
  const uploadController = new AbortController();
  const geo = createGeoIndex();
  const listSearchCities = async () => (await geo.listPlaceChoices()).flatMap(entry => entry.cities);
  async function catalogPlace(input) {
    const province = textField(input.province, 100, '省份');
    const city = textField(input.city, 100, '城市');
    const provinces = await geo.listPlaceChoices();
    if (!provinces.find(entry => entry.name === province)?.cities.includes(city)) {
      throw fail('请从列表选择有效的省份和城市。');
    }
    return { country: '中国', province, city, name: city };
  }
  let runtime = null, switching = false;
  const retired = new Set();
  function importRunning(resource) {
    if (!resource || resource.closePromise || storage.state().status !== 'ready') return false;
    const active = resource?.imports?.status().active;
    return Boolean(active && (active.status !== 'paused' || active.pauseRequested));
  }
  function requireImportPause(resource) {
    if (importAdmissions.size || importRunning(resource)) throw fail('请先暂停当前导入，再进行这项操作。', 409);
  }
  async function admitImport(action) {
    if (activeImports.size || demoPromise) throw fail('已有照片正在保存，请稍后再提交导入任务。', 409);
    const admission = {};
    importAdmissions.add(admission);
    try { return await action(); } finally { importAdmissions.delete(admission); }
  }
  async function stopRuntime(resource) {
    if (!resource) return;
    if (resource.closePromise) return resource.closePromise;
    resource.controller.abort();
    const cacheClosing = resource.previewCache?.close();
    resource.closePromise = (async () => {
      // Stop taking work from the persistent queue before closing its engine.
      // Engine close then aborts model/search operations and releases HTTP handlers.
      const queueClosing = Promise.resolve().then(() => resource.imports?.close());
      const closing = queueClosing.finally(() => resource.engine?.close());
      await Promise.allSettled([...activeOperations, closing]);
      try { await closing; } catch (error) { if (!error.storageStatus && !String(error.code || '').startsWith('TRAVEL_STORAGE_')) throw error; }
      finally { await resource.enrichment?.close?.(); await cacheClosing; }
    })();
    retired.add(resource.closePromise);
    resource.closePromise.finally(() => retired.delete(resource.closePromise)).catch(() => {});
    return resource.closePromise;
  }
  async function openRuntime(library) {
    const resource = { library, accessToken: randomBytes(24).toString('hex'), controller: new AbortController(), engine: null, enrichment: null, imports: null, folderPicks: new Map(), closePromise: null };
    resource.assertStorage = storage.guard(library, () => { if (runtime === resource) { resource.controller.abort(); void stopRuntime(resource).catch(() => {}); } });
    resource.assertStorage();
    resource.enrichment = createEnrichment({ dataDir: library.path, getConfig, geo });
    resource.previewCache = createPreviewCache({ dataDir: library.path, assertStorage: resource.assertStorage, render: (...args) => resource.enrichment.preview(...args) });
    try {
      resource.engine = await createEngine({ dataDir: library.path, assertStorage: resource.assertStorage, getConfig, downloadMedia, inspectImage, askModel: modelAdapterOrNull(createModelAdapter, ctx, getConfig), listSearchCities, enrichment: resource.enrichment, send: async () => { throw new Error('请在桌面查看旅行记录。'); } });
      if (typeof resource.engine.importQueuedFile === 'function') {
        const { createImportQueue } = await import('./import-queue.mjs');
        resource.imports = await createImportQueue({ dataDir: library.path, libraryId: library.libraryId, assertStorage: resource.assertStorage, engine: resource.engine });
      }
      resource.assertStorage();
      return resource;
    } catch (error) {
      try { await resource.imports?.close(); } catch { /* Preserve the startup error. */ }
      try { await resource.engine?.close(); } catch { /* Preserve the startup failure after stopping background work. */ }
      await resource.enrichment.close?.(); await resource.previewCache.close(); throw error;
    }
  }
  const initialLibrary = storage.descriptor();
  if (initialLibrary) {
    try { runtime = await openRuntime(initialLibrary); }
    catch (error) { storage.markUnavailable(initialLibrary, Object.assign(error, { storageStatus: error.storageStatus || 'invalid' })); }
  }
  await diagnostic('engine-ready');
  function visibleRecord(record, resource = runtime) {
    if (!record) return null;
    const { id, title, createdAt, savedAt, date, dateSource, notes, notesSharedAcrossDays, note, summary, tags, summaryStatus, places, cityGroups, undated, processingStatus, demo, usage } = record;
    return {
      id, title, createdAt, savedAt, date, dateSource, notes, notesSharedAcrossDays, note, summary, tags, summaryStatus, places, cityGroups, undated, processingStatus, demo, usage,
      summaryError: record.summaryError ? safeError(record.summaryError) : undefined,
      media: (record.media || []).map((media, index) => ({
        id: media.id, name: media.name, downloadName: downloadName(media), status: media.status, metadata: media.metadata,
        place: media.place, caption: media.caption, tags: media.tags, analysis: media.analysis,
        originalMetadata: media.originalMetadata, userEdits: media.userEdits,
        sourceAttribution: media.sourceAttribution,
        analysisStatus: media.analysisStatus, placeStatus: media.placeStatus, placeError: media.placeError || null, placeAttempts: media.placeAttempts || 0, processingStatus: media.processingStatus,
        error: media.error ? safeError(media.error) : undefined,
        previewUrl: media.status === 'saved' ? `${API_PREFIX}/media?id=${encodeURIComponent(id)}&photoId=${encodeURIComponent(media.id)}&index=${index}&libraryId=${encodeURIComponent(resource?.library.libraryId)}&accessToken=${encodeURIComponent(resource?.accessToken)}` : undefined,
        originalUrl: media.status === 'saved' ? `${API_PREFIX}/media?id=${encodeURIComponent(id)}&photoId=${encodeURIComponent(media.id)}&index=${index}&original=1&libraryId=${encodeURIComponent(resource?.library.libraryId)}&accessToken=${encodeURIComponent(resource?.accessToken)}` : undefined,
      })),
    };
  }
  function visibleCard(record, resource = runtime) {
    const media = record.media || [];
    const cover = media.find(photo => photo.status === 'saved' && record.matchedPhotoIds?.includes(photo.id)) || media.find(photo => photo.status === 'saved');
    const minimal = visibleRecord({ ...record, media: cover ? [cover] : [] }, resource);
    return {
      id: record.id, title: record.title, date: record.date, savedAt: record.savedAt,
      summary: String(record.summary || '').slice(0, 280), tags: (record.tags || []).slice(0, 12),
      photoCount: record.photoCount ?? media.length, demo: record.demo, undated: record.undated,
      cityGroups: (record.cityGroups || []).map(({ key, name, country, province }) => ({ key, name, country, province })),
      summaryStatus: record.summaryStatus, processingStatus: record.processingStatus,
      matchedPhotoIds: record.matchedPhotoIds,
      media: minimal.media.map(photo => ({ id: photo.id, name: photo.name, status: photo.status, previewUrl: photo.previewUrl + '&size=480', originalUrl: photo.originalUrl })),
    };
  }
  function visibleArchivePhoto(photo,resource=runtime){
    if(!photo)return null;
    const params=new URLSearchParams({id:photo.recordId,photoId:photo.photoId,size:'480',libraryId:resource.library.libraryId,accessToken:resource.accessToken});
    return {recordId:photo.recordId,photoId:photo.photoId,name:photo.name,previewUrl:`${API_PREFIX}/media?${params}`};
  }
  function importResponse(result) {
    const records = Array.isArray(result?.records) ? result.records : [result?.firstRecord || result?.record || result].filter(Boolean);
    const visible = records.map(record => visibleRecord(record));
    return { ok: true, record: visible[0] || null, records: visible,
      importedPhotos: Number.isSafeInteger(result?.importedPhotos) ? result.importedPhotos : records.reduce((count, record) => count + (record.media || []).filter((photo) => photo.status === 'saved').length, 0) };
  }
  async function state() {
    let model = null;
    try { model = config.modelId ? { provider: config.modelProvider, model: config.modelId } : ctx.agentDefaultModel?.currentSelection?.() || null; } catch { /* The archive works before a default model is selected. */ }
    const { enabled, ...preferences } = config;
    let draft = null, imports = emptyImportStatus(), page = { records: [], nextCursor: null, hasMore: false, total: 0, revision: 0 }, summary = { records: 0, photos: 0, processing: 0, pendingRecords: 0, placeJobs: 0, usage: { calls: 0 } };
    const resource = runtime;
    if (!switching && resource && !resource.closePromise && storage.state().status === 'ready') {
      const work = (async () => {
        resource.assertStorage();
        const values = { imports: resource.imports?.status() || emptyImportStatus(), draft: await resource.engine.inspectDraft('desktop'), summary: await resource.engine.status(), page: await resource.engine.listRecordPage({ limit: 24 }) };
        resource.assertStorage(); return values;
      })();
      activeOperations.add(work);
      try { ({ draft, imports, summary, page } = await work); }
      catch (error) { if (!error.storageStatus) throw error; }
      finally { activeOperations.delete(work); }
    }
    const missing = [];
    const services = [['llm', '模型服务'], ['attachments', '附件服务']];
    if (!fixedModel) services.push(['agentDefaultModel', '默认模型']);
    for (const [name, feature] of services) {
      try { if (!ctx[name]) missing.push(feature); } catch { missing.push(feature); }
    }
    const storageState = { ...storage.state(), accessToken: resource?.accessToken || '', ...(switching ? { status: 'busy', message: '正在切换资料文件夹，请稍候。' } : {}) };
    const { records, ...recordPage } = page;
    return { ok: true, version: '0.2.5', config: preferences, model, csrfToken, storage: storageState, summary, imports, records: records.map(record => visibleCard(record, resource)), recordPage, recordsRevision: recordPage.revision,
      compat: { missing, pluginVersion: '0.2.5',archiveBrowse:Boolean(resource&&['browseArchive','listArchiveCovers','setArchiveCover'].every(name=>typeof resource.engine[name]==='function')) },
      geocoding: { enabled: config.geocodingEnabled !== false, failed: summary.failedPlaces || 0, failures: summary.failedPlaceKinds || {}, ...(summary.places || {}) },
      draft: draft ? { id: draft.id, notes: (draft.events || []).map((event) => event.text).filter(Boolean), media: (draft.media || []).map((photo) => ({ id: photo.id, name: photo.name, status: photo.status, error: photo.error ? safeError(photo.error) : undefined })) } : null };
  }
  function queued(task) {
    const work = configQueue.then(() => { if (disposed) throw fail('插件正在关闭。', 503); return task(); });
    configQueue = work.catch(() => {});
    return work;
  }
  async function changeLibrary(path, retry = false) {
    if (switching || activeOperations.size) throw fail('请等当前操作或整理完成再切换资料文件夹。', 409);
    requireImportPause(runtime);
    switching = true;
    const previous = runtime, previousLibrary = storage.descriptor();
    let next;
    try {
      if (previous && !previous.closePromise && storage.state().status === 'ready') {
        try { previous.assertStorage(); } catch { /* A missing library may be reselected. */ }
        if (storage.state().status === 'ready') {
          const current = await previous.engine.status();
          if (current.processing || current.pendingRecords || current.placeJobs || current.places?.processing) throw fail('请等整理完成再切换资料文件夹。', 409);
        }
      }
      const library = retry ? await storage.retry() : await storage.candidate(path);
      if (disposed) throw fail('插件正在关闭。', 503);
      if (previous && !previous.closePromise && storage.state().status === 'ready' && library.path === previous.library.path && library.libraryId === previous.library.libraryId) return;
      await stopRuntime(previous); runtime = null;
      next = await openRuntime(library);
      if (disposed) throw fail('插件正在关闭。', 503);
      await storage.commit(library); runtime = next;
    } catch (error) {
      if (next && next !== runtime) await stopRuntime(next).catch(() => {});
      if (!disposed && !runtime && previousLibrary) {
        try { runtime = await openRuntime(previousLibrary); }
        catch (previousError) { storage.markUnavailable(previousLibrary, Object.assign(previousError, { storageStatus: previousError.storageStatus || 'invalid' })); }
      }
      throw error;
    } finally { switching = false; }
  }
  async function demoManifest() {
    const manifest = JSON.parse(await readFile(join(demoDir, 'manifest.json'), 'utf8'));
    if (manifest.synthetic !== true || !Array.isArray(manifest.photos) || manifest.photos.length > 50) throw fail('示例照片清单不完整。');
    return manifest;
  }
  function importDemo(resource) {
    if (demoPromise) return demoPromise;
    demoPromise = (async () => {
      const manifest = await demoManifest();
      const files = [];
      for (const photo of manifest.photos) {
        if (photo.synthetic !== true) throw fail('示例照片的模拟数据标记不完整。');
        if (disposed) throw fail('插件正在关闭。', 503);
        const safe = await controlledFile(demoDir, photo.file);
        files.push({ path: safe.absolute, name: basename(photo.file), sourceAttribution: photo.source });
      }
      // Import the whole mixed batch. Embedded EXIF alone determines day groups;
      // expected dates, cities and tags are never supplied to the archive/model.
      resource.assertStorage();
      return resource.engine.importFiles({ files, notes: manifest.photos.map((photo) => photo.note).filter(Boolean).join('\n'), demo: true });
    })().finally(() => { demoPromise = undefined; });
    return demoPromise;
  }
  async function handler(request, response) {
    try {
      // Capture the real desktop request once for startup diagnostics; normal
      // four-second UI polling must not cause ongoing filesystem writes.
      if (!initialStateObserved && String(request.url).split('?')[0] === `${API_PREFIX}/state`) {
        initialStateObserved = true;
        await diagnostic('state-request', { host: request.headers.host, remoteAddress: request.socket?.remoteAddress });
      }
      const rejection = requestRejection(ctx, request, csrfToken);
      if (rejection !== undefined) { await diagnostic('request-rejected', { status: rejection }); respond(response, rejection, { ok: false, message: rejection === 401 ? '请从 DSH 桌面打开旅行记忆。' : '请求未通过本机身份检查。' }); return; }
      if (disposed) throw fail('插件正在关闭。', 503);
      const url = new URL(request.url, 'http://local.invalid');
      const method = request.method || 'GET';
      const route = url.pathname.startsWith(`${API_PREFIX}/`) ? url.pathname.slice(API_PREFIX.length) : '';
      if (method === 'GET' && route === '/geo/place-choices') {
        respond(response, 200, { ok: true, provinces: await geo.listPlaceChoices() }); return;
      }
      if (method === 'GET' && route.startsWith('/geo/')) {
        const payload = await geo.file(route.slice(5));
        if (!payload) throw fail('地图数据不存在。', 404);
        respond(response, 200, payload); return;
      }
      if (method === 'GET' && route === '/state') { respond(response, 200, await state()); return; }
      if (method === 'GET' && route === '/demo-info') {
        const manifest = await demoManifest();
        respond(response, 200, { ok: true, notice: manifest.notice, photos: manifest.photos.map((photo) => ({ id: photo.id, ...photo.source })) }); return;
      }
      if (method === 'POST' && route === '/config') {
        const body = await readJsonBody(request);
        respond(response, 200, await queued(async () => {
          const next = desktopConfig(body, config);
          await atomicJson(configFile, next); config = next; return state();
        })); return;
      }
      if (method === 'POST' && route === '/storage/pick') {
        await readJsonBody(request);
        respond(response, 200, await folderPicker({ path: storage.state().path })); return;
      }
      if (method === 'POST' && ['/storage', '/storage/retry'].includes(route)) {
        const body = await readJsonBody(request);
        await queued(() => changeLibrary(body.path, route === '/storage/retry'));
        respond(response, 200, await state()); return;
      }
      if (!LIBRARY_ROUTES.has(route) && !IMPORT_ROUTES.has(route)) { respond(response, 404, { ok: false, message: '接口不存在。' }); return; }
      if (switching) throw fail('正在切换资料文件夹，请稍候。', 409);
      const resource = runtime;
      if (!resource || resource.closePromise || storage.state().status !== 'ready') throw fail(storage.state().message || '资料文件夹当前不可用，请重新选择或重试。', 503);
      resource.assertStorage();
      const headerLibrary = request.headers['x-travel-library'], mediaLibrary = route === '/media' ? url.searchParams.get('libraryId') : null, mediaAccess = route === '/media' ? url.searchParams.get('accessToken') : null;
      if ((!headerLibrary && !mediaAccess) || (headerLibrary && headerLibrary !== resource.accessToken) || (mediaLibrary && mediaLibrary !== resource.library.libraryId) || (mediaAccess && mediaAccess !== resource.accessToken)) throw fail('资料库已切换，请刷新当前页面后重试。', 409);
      const operation = (async () => {
      const engine = resource.engine, enrichment = resource.enrichment, dataDir = resource.library.path;
      if (IMPORT_ROUTES.has(route)) {
        const queue = resource.imports;
        if (!queue) throw fail('当前资料库无法使用后台导入。', 503);
        if (method === 'GET' && route === '/imports') {
          respond(response, 200, { ok: true, ...queue.status() }); return;
        }
        if (method !== 'POST' || route === '/imports') throw fail('导入接口不存在。', 404);
        if (route === '/imports/receive') {
          const jobId = textField(url.searchParams.get('jobId'), 100, '任务 ID');
          const manifestKey = textField(url.searchParams.get('manifestKey'), 256, '文件清单');
          const rawOffset = url.searchParams.get('offset'), offset = Number(rawOffset);
          if (rawOffset === null || !/^\d+$/.test(rawOffset) || !Number.isSafeInteger(offset)) throw fail('分批位置不正确。');
          const existing = queue.getJob(jobId);
          if (!existing || existing.kind !== 'upload') throw fail('找不到该导入任务。', 404);
          if (existing.manifestKey !== manifestKey) throw fail('选择的文件与原任务不一致。', 409);
          const rejectSegment = (status, code, message) => { request.resume(); throw Object.assign(fail(message, status), { code }); };
          if (offset >= existing.received) {
            if (['completed', 'cancelled'].includes(existing.status)) rejectSegment(409, 'IMPORT_JOB_FINISHED', '这个导入任务已经结束。');
            if (existing.status === 'paused' || existing.cancelRequested) rejectSegment(409, 'IMPORT_UPLOAD_PAUSED', '任务已暂停或正在取消，请查看当前进度。');
          }
          if (offset >= existing.total) rejectSegment(400, 'IMPORT_INVALID_OFFSET', '上传分段范围不正确。');
          if (offset > existing.received) rejectSegment(409, 'IMPORT_OFFSET_MISMATCH', '上传进度已变化，请从已收到的照片数继续。');
          const { cleanup, files } = await readImport(request, dataDir, { signal: resource.controller.signal, assertStorage: resource.assertStorage, hashFiles: true }).catch(error => {
            if (error.status === 507 || ['ENOSPC', 'EDQUOT'].includes(error.code)) {
              try { queue.action({ jobId, action: 'pause' }); } catch { /* The disk may also be too full to commit a pause. */ }
              throw fail('磁盘空间不足，清理空间后可从已收到的照片数继续。', 507);
            }
            throw error;
          });
          try {
            const job = await queue.receive({ jobId, offset, manifestKey, files });
            respond(response, 200, { ok: true, job });
          } finally { await cleanup(); }
          return;
        }
        const body = await readJsonBody(request, route === '/imports/paths' ? 4 * 1024 * 1024 : undefined);
        if (route === '/imports/pick') {
          const selected = await folderPicker({ purpose: 'import' });
          if (selected.cancelled || !selected.path) { respond(response, 200, { ok: true, cancelled: true }); return; }
          resource.assertStorage();
          const folderToken = randomBytes(24).toString('hex');
          const picks = resource.folderPicks;
          if (picks.size >= 32) picks.delete(picks.keys().next().value);
          picks.set(folderToken, { path: selected.path, expiresAt: Date.now() + 30 * 60 * 1000 });
          respond(response, 200, { ok: true, path: selected.path, folderToken }); return;
        }
        if (route === '/imports/action') {
          const jobId = textField(body.jobId, 100, '任务 ID');
          if (!['pause', 'resume', 'cancel', 'retry'].includes(body.action)) throw fail('导入操作不正确。');
          const job = await (['resume', 'retry'].includes(body.action) ? admitImport(() => queue.action({ jobId, action: body.action })) : queue.action({ jobId, action: body.action }));
          respond(response, 200, { ok: true, job }); return;
        }
        const requestId = textField(body.requestId, 100, '提交编号');
        if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) throw fail('提交编号不正确。');
        const input = { requestId, notes: textField(body.notes ?? '', 20000, '说明'), date: textField(body.date ?? '', 10, '日期') };
        if (input.date && (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date)) throw fail('日期不正确。');
        if (Object.hasOwn(body, 'province') || Object.hasOwn(body, 'city')) input.place = await catalogPlace(body);
        let job;
        if (route === '/imports/folder') {
          const selected = resource.folderPicks.get(textField(body.folderToken, 100, '文件夹选择'));
          if (!selected || selected.expiresAt < Date.now()) throw fail('文件夹选择已失效，请重新选择。', 409);
          job = await admitImport(() => queue.enqueueFolder({ ...input, path: selected.path }));
        } else if (route === '/imports/paths') {
          // DSH's desktop preload supplies paths for the files the user dropped
          // or selected. The route also requires a local session, CSRF and library token.
          if (!Array.isArray(body.paths) || !body.paths.length || body.paths.length > 20000 || body.paths.some(path => typeof path !== 'string' || path.length > 4096 || !isAbsolute(path) || path.includes('\0'))) throw fail('选中的文件或文件夹路径不正确。');
          job = await admitImport(() => queue.enqueuePaths({ ...input, paths: body.paths }));
        } else if (route === '/imports/upload') {
          const manifestKey = textField(body.manifestKey, 256, '文件清单');
          if (!Number.isSafeInteger(body.count) || body.count < 1) throw fail('照片数量不正确。');
          job = await admitImport(() => queue.enqueueUpload({ ...input, count: body.count, manifestKey }));
        } else throw fail('导入接口不存在。', 404);
        respond(response, 200, { ok: true, job }); return;
      }
      if (method === 'GET' && route === '/records') {
        const after = url.searchParams.get('after') || '', limit = Number(url.searchParams.get('limit') || '24');
        if (after.length > 2048 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw fail('分页参数不正确。');
        const page = await engine.listRecordPage({ after, limit });
        resource.assertStorage();
        respond(response, 200, { ok: true, ...page, records: page.records.map(record => visibleCard(record, resource)) }); return;
      }
      if(method==='GET'&&route==='/archive'){
        if(typeof engine.browseArchive!=='function')throw fail('当前版本暂不支持分类浏览。',501);
        const options=Object.fromEntries(['mode','reverse','q','place','province','city','month','after','seed','jump','searchId'].filter(key=>url.searchParams.has(key)).map(key=>[key,url.searchParams.get(key)]));
        options.limit=Number(url.searchParams.get('limit')||'24');
        const result=await (options.q?.trim()&&engine.searchArchive?engine.searchArchive(options):engine.browseArchive(options));resource.assertStorage();
        respond(response,200,{ok:true,...result,groups:(result.groups||[]).map(group=>({...group,cover:visibleArchivePhoto(group.cover,resource)})),records:(result.records||[]).map(record=>visibleCard(record,resource))});return;
      }
      if(method==='GET'&&route==='/archive/covers'){
        if(typeof engine.listArchiveCovers!=='function')throw fail('当前版本暂不支持选择封面。',501);
        const options=Object.fromEntries(['type','key','province','after'].filter(key=>url.searchParams.has(key)).map(key=>[key,url.searchParams.get(key)]));
        options.limit=Number(url.searchParams.get('limit')||'24');const result=await engine.listArchiveCovers(options);resource.assertStorage();
        respond(response,200,{ok:true,...result,photos:result.photos.map(photo=>visibleArchivePhoto(photo,resource))});return;
      }
      if(method==='POST'&&route==='/archive/cover'){
        if(typeof engine.setArchiveCover!=='function')throw fail('当前版本暂不支持选择封面。',501);
        const body=await readJsonBody(request),input={};
        if(!body||typeof body!=='object'||Array.isArray(body))throw fail('封面选择格式不正确。');
        for(const key of ['type','key','province','recordId','photoId'])if(Object.hasOwn(body,key))input[key]=textField(body[key],key==='key'||key==='province'?1000:100,key);
        const result=await engine.setArchiveCover(input);resource.assertStorage();
        respond(response,200,{ok:true,...result,cover:visibleArchivePhoto(result.cover,resource)});return;
      }
      if (method === 'GET' && route === '/record') {
        const record = await engine.getRecord(url.searchParams.get('id') || '');
        if (!record) throw fail('这条旅行记录不存在。', 404);
        respond(response, 200, { ok: true, record: visibleRecord(record) }); return;
      }
      if (method === 'GET' && route === '/search') {
        const query = url.searchParams.get('q') || '';
        const date = url.searchParams.get('date') || undefined;
        const place = url.searchParams.get('place') || undefined;
        if (query.length > 500 || (place && place.length > 200) || (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date))) throw fail('搜索条件格式不正确。');
        const found = await engine.search(query, { date, place });
        respond(response, 200, { ok: true, records: (Array.isArray(found) ? found : found.results || []).map((item) => visibleCard(item.record || item, resource)) }); return;
      }
      if (method === 'GET' && route === '/map') { respond(response, 200, { ok: true, ...await engine.mapData() }); return; }
      if (method === 'GET' && route === '/media') {
        const id = url.searchParams.get('id') || '', photoId = url.searchParams.get('photoId');
        let media;
        if (photoId) media = await engine.getMedia(id, photoId);
        else {
          const index = Number(url.searchParams.get('index'));
          if (!Number.isSafeInteger(index) || index < 0) throw fail('图片编号不正确。', 404);
          media = (await engine.getRecord(id))?.media?.[index];
        }
        if (!media || media.status !== 'saved' || typeof media.relativePath !== 'string') throw fail('图片不存在。', 404);
        let safe;
        try { safe = await controlledFile(dataDir, media.relativePath); }
        catch (error) {
          if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
          resource.assertStorage();
          throw missingOriginal();
        }
        resource.assertStorage();
        response.setHeader('x-travel-library', resource.library.libraryId);
        if (url.searchParams.get('original') === '1') {
          if (!IMAGE_TYPES.has(media.metadata?.mime)) throw fail('文件格式无法作为照片下载。', 415);
          await sendOriginal(response, safe.absolute, media, resource);
        } else {
          const maxDimension = Number(url.searchParams.get('size') || '1600');
          if (![480, 1600].includes(maxDimension)) throw fail('预览尺寸不正确。');
          const preview = await resource.previewCache.get({ path: safe.absolute, sha256: media.metadata?.sha256, maxDimension });
          resource.assertStorage();
          const unchanged = request.headers['if-none-match'] === preview.etag;
          responseHeaders(response, unchanged ? 304 : 200, preview.mediaType);
          response.setHeader('cache-control', 'private, no-cache');
          response.setHeader('etag', preview.etag);
          response.end(unchanged ? undefined : preview.bytes);
        }
        return;
      }
      if (method === 'POST' && route === '/retry-places') {
        const body = await readJsonBody(request);
        const retried = await engine.retryPlaces(typeof body?.id === 'string' && body.id ? body.id : undefined);
        respond(response, 200, { ok: true, retried }); return;
      }
      if (method === 'GET' && route === '/missing-locations') {
        const after = url.searchParams.get('after') || '';
        const limit = Number(url.searchParams.get('limit') || '24');
        if (after.length > 2048 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw fail('分页参数不正确。');
        const page = await engine.listMissingLocations({ after, limit });
        const photos = page.photos.map(photo => {
          const params = new URLSearchParams({ id: photo.recordId, photoId: photo.photoId, size: '480',
            libraryId: resource.library.libraryId, accessToken: resource.accessToken });
          return { ...photo, previewUrl: `${API_PREFIX}/media?${params}` };
        });
        respond(response, 200, { ok: true, ...page, photos }); return;
      }
      if (method === 'POST' && route === '/fill-missing-locations') {
        const body = await readJsonBody(request, 128 * 1024);
        if (!Array.isArray(body.photos) || !body.photos.length || body.photos.length > 200) throw fail('每次请选择 1 至 200 张照片。');
        const photos = body.photos.map(photo => {
          const recordId = textField(photo?.recordId, 200, '记录 ID'), photoId = textField(photo?.photoId, 200, '照片 ID');
          if (!recordId || !photoId) throw fail('所选照片编号不正确。');
          return { recordId, photoId };
        });
        const place = await catalogPlace(body);
        const result = await engine.fillMissingLocations({ photos, place });
        respond(response, 200, { ok: true, ...result }); return;
      }
      if (method === 'POST' && route === '/reset-usage') {
        await readJsonBody(request);
        const usage = await engine.resetUsage();
        respond(response, 200, { ok: true, usage }); return;
      }
      if (method === 'POST' && route === '/import') {
        if (activeImports.size || importAdmissions.size || demoPromise || resource.imports?.status().active) throw fail('已有导入任务，请在导入队列查看进度。', 409);
        const work = (async () => {
          const { cleanup, ...input } = await readImport(request, dataDir, { signal: resource.controller.signal, assertStorage: resource.assertStorage });
          try {
            if (disposed) throw fail('插件正在关闭。', 503);
            resource.assertStorage();
            return importResponse(await engine.importFiles(input));
          } finally { await cleanup(); }
        })();
        activeImports.add(work);
        try { respond(response, 200, await work); }
        finally { activeImports.delete(work); }
        return;
      }
      if (method === 'POST' && route === '/demo') {
        await readJsonBody(request);
        if (activeImports.size || importAdmissions.size || resource.imports?.status().active) throw fail('请先完成当前导入，再导入示例照片。', 409);
        respond(response, 200, importResponse(await importDemo(resource))); return;
      }
      if (method === 'POST' && route === '/draft/commit') {
        await readJsonBody(request);
        if (activeImports.size || importAdmissions.size || demoPromise || resource.imports?.status().active) throw fail('请先完成当前导入，再保存草稿。', 409);
        const work = engine.commitDraft('desktop');
        activeImports.add(work);
        try { respond(response, 200, importResponse(await work)); }
        finally { activeImports.delete(work); }
        return;
      }
      if (method === 'POST' && route === '/draft/cancel') {
        await readJsonBody(request); await engine.cancelDraft('desktop');
        respond(response, 200, await state()); return;
      }
      if (method === 'POST' && route === '/edit-record') {
        const body = await readJsonBody(request), patch = {};
        if (Object.hasOwn(body, 'date')) requireImportPause(resource);
        for (const key of ['title', 'date', 'note']) if (Object.hasOwn(body, key)) patch[key] = textField(body[key], key === 'note' ? 20000 : 200, key);
        const record = await engine.editRecord(textField(body.id, 200, '记录 ID'), patch);
        respond(response, 200, { ok: true, record: visibleRecord(record) }); return;
      }
      if (method === 'POST' && route === '/edit-photo') {
        const body = await readJsonBody(request), patch = {};
        if (Object.hasOwn(body, 'capturedAt')) requireImportPause(resource);
        for (const key of ['capturedAt', 'gps', 'place', 'caption', 'tags']) if (Object.hasOwn(body, key)) patch[key] = body[key];
        const result = await engine.editPhoto(textField(body.recordId, 200, '记录 ID'), textField(body.photoId, 200, '照片 ID'), patch);
        const record = result?.media ? result : await engine.getRecord(body.recordId);
        respond(response, 200, { ok: true, record: visibleRecord(record) }); return;
      }
      if (method === 'POST' && route === '/delete-record') {
        const body = await readJsonBody(request);
        requireImportPause(resource);
        const id = textField(body.id, 200, '记录 ID');
        await engine.deleteRecord(id);
        respond(response, 200, { ok: true, record: null, deletedRecordId: id }); return;
      }
      if (method === 'POST' && route === '/delete-photo') {
        const body = await readJsonBody(request);
        requireImportPause(resource);
        const id = textField(body.recordId, 200, '记录 ID'), photoId = textField(body.photoId, 200, '照片 ID');
        await engine.deletePhoto(id, photoId);
        const record = await engine.getRecord(id);
        respond(response, 200, { ok: true, record: visibleRecord(record), deletedPhotoId: photoId, deletedRecordId: record ? null : id }); return;
      }
      if (method === 'POST' && route === '/reprocess') {
        const body = await readJsonBody(request); requireImportPause(resource); await engine.reprocess(textField(body.id, 200, '记录 ID'));
        respond(response, 200, await state()); return;
      }
      respond(response, 404, { ok: false, message: '接口不存在。' });
      })();
      activeOperations.add(operation);
      try { await operation; } finally { activeOperations.delete(operation); }
    } catch (error) { respond(response, Number(error.status) || 500, { ok: false, message: safeError(error), ...(error.code ? { code: error.code } : {}), ...(Number.isSafeInteger(error.remaining) ? { remaining: error.remaining } : {}), storage: storage.state() }); }
  }
  const disposers = [];
  try {
    await diagnostic('routes-registering');
    // DSH appends its own slash when matching descendants. A trailing slash here
    // makes /api/state miss the route and fall through to the SPA HTML document.
    disposers.push(ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler }));
    await diagnostic('routes-registered');
  } catch (error) {
    for (const dispose of disposers) dispose();
    await stopRuntime(runtime); throw error;
  }
  async function close() {
    if (closePromise) return closePromise;
    disposed = true;
    folderPicker.close?.();
    uploadController.abort();
    runtime?.controller.abort();
    const stopping = stopRuntime(runtime);
    stopping.catch(() => {});
    closePromise = (async () => {
      await diagnostic('dispose-start');
      for (const dispose of disposers.splice(0)) dispose();
      await configQueue;
      await demoPromise?.catch(() => {});
      await Promise.allSettled([...activeImports]);
      await stopping;
      await stopRuntime(runtime);
      await Promise.allSettled([...retired]);
      await diagnostic('disposed');
    })();
    return closePromise;
  }
  ctx.effect(() => close, 'travel-journal: protected routes and local archive lifecycle');
  await diagnostic('host-active');
  return { state, handler, close, getConfig, controlDir: storage.controlDir };
}

export async function apply(ctx) {
  const dataDir = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'plugins-data', 'travel-journal');
  const diagnostic = lifecycleDiagnostic(controlDirectory(dataDir), ctx);
  await diagnostic('apply-enter');
  try {
    const [{ createTravelEngine }, media, { createTravelModelAdapter, TRAVEL_MODEL }, { createEnrichment }] = await Promise.all([
      import('./engine.mjs'), import('./media.mjs'), import('./model.mjs'), import('./enrichment.mjs'),
    ]);
    await diagnostic('imports-ready');
    await createTravelHost({ ctx, dataDir, createEngine: createTravelEngine, downloadMedia: media.downloadMedia,
      inspectImage: media.inspectImage, createModelAdapter: createTravelModelAdapter, fixedModel: TRAVEL_MODEL, createEnrichment, diagnostic });
    await diagnostic('apply-complete');
    // Cordis treats apply's resolved value as a cleanup effect. The host object
    // is a test API, not an effect; returning it makes Cordis dispose this fiber.
  } catch (error) {
    await diagnostic('apply-error', { errorName: error.name, errorCode: error.code, error: safeError(error) });
    throw error;
  }
}
