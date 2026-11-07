import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const stopped = () => Object.assign(new Error('预览服务已关闭。'), { status: 503 });
const invalid = () => Object.assign(new Error('预览缓存目录不可用，请检查资料文件夹中的 previews。'), { status: 503 });
const jpeg = bytes => bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;

/** Rebuildable, portable derivatives. Originals are never changed. The cache
 * has its own directory/link guards in addition to the active-library guard. */
export function createPreviewCache({ dataDir, assertStorage, render, concurrency = 2 }) {
  const directory = join(dataDir, 'previews'), flights = new Map(), queue = [];
  let closed = false, active = 0, directoryFlight = null, identity = null;
  const check = () => { if (closed) throw stopped(); assertStorage(); };
  async function ensureDirectory() {
    check();
    if (!directoryFlight) directoryFlight = (async () => {
      const root = await realpath(dataDir);
      check();
      await mkdir(directory).catch(error => { if (error.code !== 'EEXIST') throw error; });
      const info = await lstat(directory), actual = await realpath(directory);
      check();
      if (!info.isDirectory() || info.isSymbolicLink() || actual !== join(root, 'previews')) throw invalid();
      if (identity && (identity.dev !== info.dev || identity.ino !== info.ino || identity.actual !== actual)) throw invalid();
      identity ||= { dev: info.dev, ino: info.ino, actual };
    })().finally(() => { directoryFlight = null; });
    await directoryFlight;
  }
  async function cached(file) {
    await ensureDirectory();
    try {
      const info = await lstat(file);
      if (!info.isFile() || info.isSymbolicLink() || await realpath(file) !== join(identity.actual, basename(file))) throw invalid();
      if (info.size > 10 * 1024 * 1024) return null;
      check();
      const bytes = await readFile(file);
      check();
      return jpeg(bytes) ? { bytes, mediaType: 'image/jpeg', cached: true } : null;
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  function pump() {
    while (!closed && active < concurrency && queue.length) {
      const item = queue.shift(); active++;
      Promise.resolve().then(() => { check(); return item.work(); }).then(item.resolve, item.reject)
        .finally(() => { active--; pump(); });
    }
  }
  const scheduled = work => new Promise((resolve, reject) => {
    if (closed) { reject(stopped()); return; }
    queue.push({ work, resolve, reject }); pump();
  });
  async function get({ path, sha256 = '', maxDimension = 480 }) {
    check();
    if (![480, 1600].includes(maxDimension)) throw new Error('预览尺寸无效。');
    const source = await stat(path);
    check();
    if (!source.isFile() || !source.size) throw new Error('原图不可用。');
    // Include stat evidence to avoid stale previews if an original is replaced.
    // No absolute path is used: moving the whole library keeps cache hits.
    const key = createHash('sha256').update(JSON.stringify(['jpeg-v1-q76', sha256 || basename(path), source.size, source.mtimeMs, maxDimension])).digest('hex');
    if (flights.has(key)) return flights.get(key);
    const work = scheduled(async () => {
      const file = join(directory, key + '.jpg');
      const hit = await cached(file);
      if (hit) return { ...hit, etag: `"${key}"` };
      const preview = await render(path, { maxDimension });
      check();
      const after = await stat(path);
      if (source.size !== after.size || source.mtimeMs !== after.mtimeMs || source.ino !== after.ino) throw new Error('原图已改变，请重新加载预览。');
      if (jpeg(preview.bytes)) {
        await ensureDirectory();
        const temporary = join(directory, `${key}.${randomUUID()}.tmp`);
        try {
          check(); await writeFile(temporary, preview.bytes, { flag: 'wx', mode: 0o600 });
          await ensureDirectory(); check(); await rename(temporary, file);
        } finally {
          // Never clean up through an unavailable/replaced library path.
          if (!closed) {
            try { await ensureDirectory(); await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
            catch { /* A derivative can be rebuilt; preserve the original failure. */ }
          }
        }
      }
      return { bytes: preview.bytes, mediaType: preview.mediaType, cached: false, etag: `"${key}"` };
    });
    flights.set(key, work);
    try { return await work; } finally { if (flights.get(key) === work) flights.delete(key); }
  }
  function close() {
    closed = true;
    for (const item of queue.splice(0)) item.reject(stopped());
    return Promise.allSettled([...flights.values()]);
  }
  return { get, close };
}
