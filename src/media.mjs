import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import exifr from 'exifr';

const CDN_ROOTS = ['qq.com', 'qq.com.cn', 'qpic.cn', 'gtimg.cn', 'gtimg.com', 'tencent.com'];
const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp|gif|heic|heif|avif|tiff?|bmp)$/i;
const MAX_REDIRECTS = 4;
const HEADER_BYTES = 64 * 1024;
const HASH_CHUNK_BYTES = 1024 * 1024;
const activeWaiters = [];
let activeDownloads = 0;

function failure(code, message = code) {
  return Object.assign(new Error(message), { code });
}

function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function cleanString(value) {
  return typeof value === 'string' ? value.replace(/\0+$/g, '').trim() || null : null;
}

function bufferOf(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  throw new TypeError('Image input must be bytes or an internal absolute local file path');
}

function imageHeader(bytes, totalBytes = bytes.length) {
  const result = { mime: 'application/octet-stream', width: null, height: null, valid: false };
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    result.mime = 'image/jpeg';
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 8) {
        result.height = bytes.readUInt16BE(offset + 3);
        result.width = bytes.readUInt16BE(offset + 5);
        result.valid = result.width > 0 && result.height > 0;
      }
      offset += length;
    }
  } else if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    result.mime = 'image/png';
    if (bytes.length >= 33 && bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.readUInt32BE(8) === 13) {
      result.width = bytes.readUInt32BE(16);
      result.height = bytes.readUInt32BE(20);
      result.valid = result.width > 0 && result.height > 0;
    }
  } else if (bytes.length >= 6 && /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6))) {
    result.mime = 'image/gif';
    if (bytes.length >= 13) {
      result.width = bytes.readUInt16LE(6);
      result.height = bytes.readUInt16LE(8);
      result.valid = result.width > 0 && result.height > 0;
    }
  } else if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    result.mime = 'image/webp';
    result.valid = bytes.readUInt32LE(4) + 8 <= totalBytes && bytes.length >= 20;
    const format = bytes.toString('ascii', 12, 16);
    if (format === 'VP8X' && bytes.length >= 30) {
      result.width = bytes.readUIntLE(24, 3) + 1;
      result.height = bytes.readUIntLE(27, 3) + 1;
    } else if (format === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      const packed = bytes.readUInt32LE(21);
      result.width = (packed & 0x3fff) + 1;
      result.height = ((packed >>> 14) & 0x3fff) + 1;
    } else if (format === 'VP8 ' && bytes.length >= 30 && bytes.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
      result.width = bytes.readUInt16LE(26) & 0x3fff;
      result.height = bytes.readUInt16LE(28) & 0x3fff;
    }
  } else if (bytes.length >= 4 && ['49492a00', '4d4d002a'].includes(bytes.subarray(0, 4).toString('hex'))) {
    result.mime = 'image/tiff';
    result.valid = bytes.length >= 8;
  } else if (bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp') {
    const brands = bytes.toString('ascii', 8, Math.min(bytes.length, bytes.readUInt32BE(0), 128));
    result.mime = /avif|avis/.test(brands) ? 'image/avif' : /heic|heix|hevc|hevx|mif1|msf1/.test(brands) ? 'image/heic' : result.mime;
    const firstBoxSize = bytes.readUInt32BE(0);
    result.valid = result.mime !== 'application/octet-stream' && firstBoxSize >= 16 && firstBoxSize + 8 <= totalBytes;
  } else if (bytes.length >= 2 && bytes.toString('ascii', 0, 2) === 'BM') {
    result.mime = 'image/bmp';
    if (bytes.length >= 54 && bytes.readUInt32LE(14) >= 40) {
      result.width = Math.abs(bytes.readInt32LE(18));
      result.height = Math.abs(bytes.readInt32LE(22));
      result.valid = result.width > 0 && result.height > 0;
    }
  }
  return result;
}

function internalImagePath(value) {
  if (!value || value.includes('\0') || value.includes('://') || value.startsWith('\\\\') || value.startsWith('//')
    || !(path.isAbsolute(value) || path.win32.isAbsolute(value))) {
    throw new TypeError('Image file path must be an internal absolute local path, not a URL or network share');
  }
  return value;
}

// Seek past large JPEG APP/COM payloads. Only marker headers are read, never the
// payload or compressed image, so a padded original has no business byte limit.
async function jpegDimensions(file, totalBytes) {
  const scratch = Buffer.alloc(9);
  let offset = 2;
  for (let segment = 0; segment < 8192 && offset + 4 <= totalBytes; segment++) {
    const { bytesRead } = await file.read(scratch, 0, 4, offset);
    if (bytesRead < 4 || scratch[0] !== 0xff) return null;
    const marker = scratch[1];
    if (marker === 0xff) { offset++; continue; }
    if (marker === 0xda || marker === 0xd9) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { offset += 2; continue; }
    const length = scratch.readUInt16BE(2);
    if (length < 2 || offset + 2 + length > totalBytes) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 8 || (await file.read(scratch, 0, 9, offset)).bytesRead < 9) return null;
      const height = scratch.readUInt16BE(5), width = scratch.readUInt16BE(7);
      return width > 0 && height > 0 ? { width, height, valid: true } : null;
    }
    offset += length + 2;
  }
  return null;
}

async function inspectFileBytes(filePath) {
  const localPath = internalImagePath(filePath);
  const file = await open(localPath, 'r');
  try {
    const before = await file.stat();
    if (!before.isFile()) throw failure('MEDIA_NOT_FILE', 'Image path is not a regular file');
    const hash = createHash('sha256');
    const chunk = Buffer.alloc(HASH_CHUNK_BYTES);
    let head = Buffer.alloc(0), totalBytes = 0;
    for (;;) {
      const { bytesRead } = await file.read(chunk, 0, chunk.length, totalBytes);
      if (!bytesRead) break;
      if (!totalBytes) head = Buffer.from(chunk.subarray(0, Math.min(bytesRead, HEADER_BYTES)));
      hash.update(chunk.subarray(0, bytesRead));
      totalBytes += bytesRead;
    }
    const after = await file.stat();
    if (before.size !== totalBytes || after.size !== totalBytes || before.mtimeMs !== after.mtimeMs) {
      throw failure('MEDIA_FILE_CHANGED', 'Image file changed while it was being inspected');
    }
    const header = imageHeader(head, totalBytes);
    if (header.mime === 'image/jpeg' && !header.valid) Object.assign(header, await jpegDimensions(file, totalBytes));
    return { input: localPath, header, sha256: hash.digest('hex'), bytes: totalBytes };
  } finally { await file.close(); }
}

function gpsCoordinates(tags) {
  function coordinate(value, reference, max) {
    if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) return null;
    if (value[0] < 0 || value[1] < 0 || value[1] >= 60 || value[2] < 0 || value[2] >= 60) return null;
    const cardinal = cleanString(reference)?.toUpperCase();
    if (!(max === 90 ? ['N', 'S'] : ['E', 'W']).includes(cardinal)) return null;
    const decimal = (value[0] + value[1] / 60 + value[2] / 3600) * (['S', 'W'].includes(cardinal) ? -1 : 1);
    return Math.abs(decimal) <= max ? decimal : null;
  }
  const latitude = coordinate(tags.GPSLatitude, tags.GPSLatitudeRef, 90);
  const longitude = coordinate(tags.GPSLongitude, tags.GPSLongitudeRef, 180);
  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}

/** Inspect immutable bytes or an internal trusted archive path. File originals
 * are hashed in fixed-size chunks; EXIF uses exifr's seekable FsReader.
 * A hash alone never proves these were the camera's original bytes.
 */
export async function inspectImage(input) {
  const source = typeof input === 'string' ? await inspectFileBytes(input) : (() => {
    const bytes = bufferOf(input);
    return { input: bytes, header: imageHeader(bytes), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
  })();
  const { header } = source;
  const result = {
    sha256: source.sha256, bytes: source.bytes,
    mime: header.mime, width: header.width, height: header.height,
    exifStatus: 'absent', metadataError: null,
    capturedAt: null, capturedOffset: null, capturedAtSource: null, capturedSubseconds: null,
    gps: null, gpsDate: null, gpsTime: null,
    make: null, model: null, orientation: null,
  };
  if (!header.valid) {
    result.exifStatus = header.mime === 'application/octet-stream' ? 'unsupported' : 'error';
    result.metadataError = header.mime === 'application/octet-stream' ? 'unsupported_image_format' : 'invalid_image_header';
    return result;
  }
  if (header.mime === 'image/gif' || header.mime === 'image/bmp') return result;
  if (header.mime === 'image/webp') {
    result.exifStatus = 'unsupported';
    result.metadataError = 'unsupported_metadata_format';
    return result;
  }
  try {
    const tags = await exifr.parse(source.input, {
      chunked: true, firstChunkSize: HEADER_BYTES, chunkSize: HEADER_BYTES, chunkLimit: 5,
      tiff: true, ifd0: true, exif: true, gps: true, ifd1: false,
      xmp: false, icc: false, iptc: false, jfif: false, ihdr: false,
      translateKeys: true, translateValues: false, reviveValues: false,
      mergeOutput: true, silentErrors: false, makerNote: false, userComment: false,
    });
    if (!tags || !Object.keys(tags).length) return result;
    result.exifStatus = 'present';
    result.width ??= positiveNumber(tags.ExifImageWidth ?? tags.ImageWidth ?? tags.PixelXDimension);
    result.height ??= positiveNumber(tags.ExifImageHeight ?? tags.ImageHeight ?? tags.PixelYDimension);
    const original = cleanString(tags.DateTimeOriginal);
    const digitized = cleanString(tags.CreateDate ?? tags.DateTimeDigitized);
    result.capturedAt = original ?? digitized;
    result.capturedAtSource = original ? 'DateTimeOriginal' : digitized ? 'CreateDate' : null;
    result.capturedOffset = cleanString(original ? tags.OffsetTimeOriginal : tags.OffsetTimeDigitized);
    result.capturedSubseconds = cleanString(original ? tags.SubSecTimeOriginal : tags.SubSecTimeDigitized);
    result.gps = gpsCoordinates(tags);
    result.gpsDate = cleanString(tags.GPSDateStamp);
    result.gpsTime = Array.isArray(tags.GPSTimeStamp) ? tags.GPSTimeStamp.filter(Number.isFinite) : null;
    result.make = cleanString(tags.Make);
    result.model = cleanString(tags.Model);
    result.orientation = Number.isInteger(tags.Orientation) && tags.Orientation >= 1 && tags.Orientation <= 8 ? tags.Orientation : null;
  } catch {
    result.exifStatus = 'error';
    result.metadataError = 'metadata_parse_failed';
  }
  return result;
}

function abortable(promise, signal) {
  if (signal.aborted) return Promise.reject(failure('MEDIA_TIMEOUT'));
  return new Promise((resolve, reject) => {
    const abort = () => reject(failure('MEDIA_TIMEOUT'));
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function acquireSlot(signal) {
  if (signal.aborted) return Promise.reject(failure('MEDIA_TIMEOUT'));
  return new Promise((resolve, reject) => {
    const waiter = { grant: null, abort: null };
    waiter.abort = () => {
      const index = activeWaiters.indexOf(waiter);
      if (index >= 0) activeWaiters.splice(index, 1);
      reject(failure('MEDIA_TIMEOUT'));
    };
    waiter.grant = () => {
      signal.removeEventListener('abort', waiter.abort);
      activeDownloads++;
      let released = false;
      resolve(() => {
        if (released) return;
        released = true;
        activeDownloads--;
        const next = activeWaiters.shift();
        if (next) next.grant();
      });
    };
    if (activeDownloads < 2) waiter.grant();
    else {
      activeWaiters.push(waiter);
      signal.addEventListener('abort', waiter.abort, { once: true });
    }
  });
}

function allowedUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw failure('MEDIA_URL_NOT_ALLOWED'); }
  const host = url.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port ||
      !CDN_ROOTS.some(root => host === root || host.endsWith(`.${root}`))) throw failure('MEDIA_URL_NOT_ALLOWED');
  return url;
}

async function fetchBytes(rawUrl, { maxBytes, signal }) {
  let url = allowedUrl(rawUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const response = await abortable(fetch(url, { redirect: 'manual', signal, headers: { Accept: 'image/*,application/octet-stream;q=0.8' } }), signal);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await abortable(response.body?.cancel(), signal);
      if (!location || redirect === MAX_REDIRECTS) throw failure('MEDIA_REDIRECT_LIMIT');
      url = allowedUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) {
      await abortable(response.body?.cancel(), signal);
      throw failure('MEDIA_HTTP_ERROR');
    }
    const declared = positiveNumber(response.headers.get('content-length'));
    if (declared > maxBytes) {
      await abortable(response.body?.cancel(), signal);
      throw failure('MEDIA_TOO_LARGE');
    }
    if (!response.body) throw failure('MEDIA_EMPTY');
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await abortable(reader.read(), signal);
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) throw failure('MEDIA_TOO_LARGE');
        chunks.push(Buffer.from(value));
      }
    } finally {
      // Cancellation is cleanup: an unresponsive stream must not extend the deadline.
      void reader.cancel().catch(() => {});
    }
    if (!total) throw failure('MEDIA_EMPTY');
    return Buffer.concat(chunks, total);
  }
  throw failure('MEDIA_REDIRECT_LIMIT');
}

function gatewayPath(value) {
  if (typeof value !== 'string' || !value) return null;
  let local = value;
  if (value.startsWith('file:')) {
    try { local = fileURLToPath(value); } catch { return null; }
  }
  // Network shares are not local gateway files. Sender paths never reach this function.
  if (local.startsWith('\\\\') || local.startsWith('//')) return null;
  return path.isAbsolute(local) || path.win32.isAbsolute(local) ? local : null;
}

async function readGatewayFile(localPath, { maxBytes, signal }) {
  const opening = open(localPath, 'r');
  let file;
  try { file = await abortable(opening, signal); }
  catch (error) {
    void opening.then(handle => handle.close()).catch(() => {});
    throw error;
  }
  try {
    const stat = await abortable(file.stat(), signal);
    if (!stat.isFile()) throw failure('MEDIA_NOT_FILE');
    if (stat.size > maxBytes) throw failure('MEDIA_TOO_LARGE');
    if (!stat.size) throw failure('MEDIA_EMPTY');
    const chunks = [];
    let total = 0;
    while (true) {
      const buffer = Buffer.alloc(Math.min(65536, maxBytes - total + 1));
      const { bytesRead } = await abortable(file.read(buffer, 0, buffer.length, null), signal);
      if (!bytesRead) break;
      total += bytesRead;
      if (total > maxBytes) throw failure('MEDIA_TOO_LARGE');
      chunks.push(buffer.subarray(0, bytesRead));
    }
    return Buffer.concat(chunks, total);
  } finally { await file.close(); }
}

function safeReference(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 4096 &&
    !/^[a-z][\w+.-]*:/i.test(value) && !/^[\\/]/.test(value) &&
    !/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(value) && !value.includes('\0') ? value : null;
}

function safeName(value) {
  const name = path.posix.basename(path.win32.basename(String(value || 'image')));
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 180) || 'image';
}

/** Download without decoding/re-encoding. onebot is a trusted local gateway exposing call(action, params). */
export async function downloadMedia(segment, { onebot, maxBytes = 52428800, timeoutMs = 30000 } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw failure('MEDIA_INVALID_LIMIT');
  if (!segment || !['image', 'file'].includes(segment.type)) throw failure('MEDIA_UNSUPPORTED_SEGMENT');
  const data = segment.data ?? {};
  let name = safeName(data.name ?? data.file_name ?? data.file);
  if (segment.type === 'file' && name !== 'image' && !IMAGE_EXTENSION.test(name)) throw failure('MEDIA_NOT_IMAGE_FILE');
  let declaredBytes = positiveNumber(data.file_size ?? data.size);
  if (declaredBytes > maxBytes) throw failure('MEDIA_TOO_LARGE');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const options = { maxBytes, signal: controller.signal };
  let release;
  const attempts = [];
  const attempt = async fn => {
    try { return await fn(); }
    catch (error) {
      if (controller.signal.aborted) throw failure('MEDIA_TIMEOUT');
      const code = /^MEDIA_[A-Z_]+$/.test(error?.code ?? '') ? error.code : 'MEDIA_SOURCE_FAILED';
      if (code === 'MEDIA_TOO_LARGE') throw failure(code);
      attempts.push(code);
      return null;
    }
  };
  try {
    release = await acquireSlot(controller.signal);
    const reference = [data.file_id, data.id, data.file].map(safeReference).find(Boolean);
    let gateway;
    if (onebot && reference) {
      gateway = await attempt(async () => {
        const action = segment.type === 'image' ? 'get_image' : 'get_file';
        const params = segment.type === 'image' ? { file: reference } : { file_id: reference };
        const response = await abortable(typeof onebot === 'function' ? onebot(action, params) : onebot.call(action, params), controller.signal);
        if (response?.status === 'failed' || (response?.retcode != null && Number(response.retcode) !== 0)) throw failure('MEDIA_GATEWAY_FAILED');
        return response?.data ?? response;
      });
    }
    if (gateway && typeof gateway === 'object') {
      name = safeName(gateway.file_name || name);
      declaredBytes = positiveNumber(gateway.file_size) ?? declaredBytes;
      const local = gatewayPath(gateway.file) ?? gatewayPath(gateway.path);
      if (local) {
        const bytes = await attempt(() => readGatewayFile(local, options));
        if (bytes) return { bytes, sourceKind: 'gateway-file', name, declaredBytes };
      }
      if (typeof gateway.base64 === 'string') {
        const bytes = await attempt(async () => {
          const encoded = gateway.base64.replace(/^base64:\/\//, '').replace(/^data:[^;,]+;base64,/, '');
          if (encoded.length > Math.ceil(maxBytes / 3) * 4 + 4) throw failure('MEDIA_TOO_LARGE');
          if (!/^[a-z\d+/]*={0,2}$/i.test(encoded)) throw failure('MEDIA_INVALID_BASE64');
          const decoded = Buffer.from(encoded, 'base64');
          if (!decoded.length) throw failure('MEDIA_EMPTY');
          if (decoded.length > maxBytes) throw failure('MEDIA_TOO_LARGE');
          return decoded;
        });
        if (bytes) return { bytes, sourceKind: 'gateway-base64', name, declaredBytes };
      }
      const gatewayUrl = [gateway.url, gateway.file].find(value => typeof value === 'string' && /^https?:/i.test(value));
      if (gatewayUrl) {
        const bytes = await attempt(() => fetchBytes(gatewayUrl, options));
        if (bytes) return { bytes, sourceKind: 'gateway-url', name, declaredBytes };
      }
    }
    const messageUrl = [data.url, data.file].find(value => typeof value === 'string' && /^https?:/i.test(value)) ?? data.url;
    if (typeof messageUrl === 'string') {
      const bytes = await attempt(() => fetchBytes(messageUrl, options));
      if (bytes) return { bytes, sourceKind: 'message-url', name, declaredBytes };
    }
    const code = attempts.includes('MEDIA_TOO_LARGE') ? 'MEDIA_TOO_LARGE' : attempts.at(-1) ?? 'MEDIA_SOURCE_UNAVAILABLE';
    throw Object.assign(failure(code, 'Unable to download image bytes'), { attempts });
  } finally {
    clearTimeout(timer);
    release?.();
  }
}

const COMPARISON_FIELDS = ['capturedAt', 'capturedOffset', 'capturedSubseconds', 'gps.latitude', 'gps.longitude', 'gpsDate', 'gpsTime', 'make', 'model', 'orientation', 'width', 'height'];
const fieldValue = (value, field) => field.split('.').reduce((object, key) => object?.[key], value) ?? null;

/** Compare to a separately obtained source file. Without a source hash, originality stays unknown. */
export function compareMetadata(before, after) {
  const hashes = [before?.sha256, after?.sha256];
  const hashIdentical = hashes.every(hash => typeof hash === 'string' && /^[a-f\d]{64}$/i.test(hash)) ? hashes[0].toLowerCase() === hashes[1].toLowerCase() : null;
  const missingFields = [], changedFields = [], addedFields = [], sourceMissingFields = [];
  for (const field of COMPARISON_FIELDS) {
    const a = fieldValue(before, field), b = fieldValue(after, field);
    if (a === null) {
      sourceMissingFields.push(field);
      if (b !== null) addedFields.push(field);
    } else if (b === null) missingFields.push(field);
    else if (typeof a === 'number' && typeof b === 'number' && field.startsWith('gps.') ? Math.abs(a - b) > 1e-7 : JSON.stringify(a) !== JSON.stringify(b)) changedFields.push(field);
  }
  const comparable = Boolean(before && after) && ![before.exifStatus, after.exifStatus].some(status => ['error', 'unsupported'].includes(status));
  return {
    hashIdentical, metadataPreserved: comparable ? missingFields.length === 0 && changedFields.length === 0 : null,
    missingFields, changedFields, addedFields, sourceMissingFields,
    beforeStatus: before?.exifStatus ?? null, afterStatus: after?.exifStatus ?? null,
  };
}
