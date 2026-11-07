import { stat } from 'node:fs/promises';
import { isAbsolute, win32 } from 'node:path';
import sharp from 'sharp';
import { createGeoIndex } from './geo.mjs';

function abortable(value, signal) {
  if (signal.aborted) return Promise.reject(new Error('cancelled'));
  return new Promise((resolveValue, reject) => {
    const abort = () => reject(new Error('cancelled'));
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(value).then(resolveValue, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function coordinatePair(gps) {
  if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)
    || Math.abs(gps.latitude) > 90 || Math.abs(gps.longitude) > 180) return null;
  return { latitude: Object.is(gps.latitude, -0) ? 0 : gps.latitude, longitude: Object.is(gps.longitude, -0) ? 0 : gps.longitude };
}

const label = (value) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 500) : null;

function normalizedAddress(payload) {
  const address = payload.address;
  const country = label(address.country);
  const province = label(address.state) || label(address.province) || label(address.region);
  let city = label(address.city) || label(address.municipality);
  let district = label(address.city_district) || label(address.district) || label(address.county) || label(address.borough);
  const town = label(address.town) || label(address.village) || label(address.suburb) || label(address.hamlet);
  let citySource = city ? 'raw.address' : null;
  const isChina = String(address.country_code || '').toLowerCase() === 'cn' || ['中国', '中國', '中华人民共和国', '中華人民共和國'].includes(country);
  const districtLabel = (value) => typeof value === 'string' && /^[\p{Script=Han}·]{1,30}(?:区|區|县|縣|旗)$/u.test(value)
    && !/(?:自治区|自治區|特别行政区|特別行政區)$/.test(value) && value !== province;
  const cityLabel = (value) => typeof value === 'string' && /^[\p{Script=Han}·]{1,30}市$/u.test(value);
  if (isChina) {
    // Nominatim's OSM-derived address categories can place a district in `city`.
    // Move that explicit district fact down; only recover a parent city when the
    // same response's comma-delimited hierarchy supplies unambiguous evidence.
    if (districtLabel(city)) { district ||= city; city = null; citySource = null; }
    if (!city && districtLabel(district)) {
      const hierarchy = String(payload.display_name || '').split(/[,，]/).map((part) => part.trim()).filter(Boolean);
      const districtIndex = hierarchy.indexOf(district);
      const provinceIndex = province ? hierarchy.indexOf(province) : -1;
      const countryIndex = country ? hierarchy.lastIndexOf(country) : -1;
      const anchor = provinceIndex > districtIndex ? provinceIndex : countryIndex;
      if (districtIndex >= 0 && anchor > districtIndex) {
        const cities = [...new Set(hierarchy.slice(districtIndex + 1, anchor).filter(cityLabel))];
        if (!cities.length && provinceIndex === anchor && cityLabel(province)) cities.push(province);
        if (cities.length === 1) { city = cities[0]; citySource = 'raw.display_name'; }
      }
    }
  }
  const parts = [...new Set([province, city, district, town].filter(Boolean))];
  if (!parts.length && !country) return null;
  return { country, province, city, district, town, name: parts.join(' · ') || country,
    normalization: { version: 2, citySource } };
}

/** Re-normalize a stored provider response without fetching or changing GPS/raw data.
 * Manual places and entries without their original address evidence are preserved.
 */
export function normalizeStoredPlace(place) {
  if (!place || typeof place !== 'object' || Array.isArray(place)) return place == null ? null : structuredClone(place);
  const result = structuredClone(place);
  if (place.provider === 'manual' || place.source === 'manual') return result;
  const payload = place.raw;
  if (!payload || !payload.address || typeof payload.address !== 'object' || Array.isArray(payload.address)) return result;
  const normalized = normalizedAddress(payload);
  return normalized ? { ...result, ...normalized } : result;
}

// Increment when bundled names/boundaries change so saved derived places can be refreshed.
export const GEO_DATA_VERSION = 2;
const MUNICIPALITIES = new Set(['北京市', '天津市', '上海市', '重庆市', '香港特别行政区', '澳门特别行政区']);
const cityOf = (hit) => label(hit.city) || (MUNICIPALITIES.has(hit.province) ? hit.province : null);

function offlinePlace(hit, gps, now) {
  const city = cityOf(hit);
  const district = Object.hasOwn(hit, 'district') ? label(hit.district) : hit.codeLevel && hit.codeLevel !== 'county' ? null : hit.name;
  return {
    provider: 'offline', dataVersion: GEO_DATA_VERSION,
    raw: { source: 'offline-boundary', ...structuredClone(hit) },
    country: label(hit.country) || '中国', province: hit.province, city, district, town: null,
    name: [...new Set([hit.province, city, hit.name])].join(' · '),
    code: hit.code,
    ...Object.fromEntries(['boundaryId', 'cityBoundaryId', 'boundaryYear', 'codeLevel', 'historicalName', 'citySource', 'countySource', 'cityPublished', 'cityResolution'].filter(key => hit[key] !== undefined).map(key => [key, structuredClone(hit[key])])),
    normalization: { version: 1, citySource: 'offline-boundary' },
    latitude: gps.latitude, longitude: gps.longitude, coordinateSystem: 'WGS84', approximate: true,
    source: 'offline_geocoding', at: new Date(now()).toISOString(),
    attribution: hit.citySource === 'OCHA COD-AB' ? 'OCHA COD-AB' + (hit.countySource ? '; © OpenStreetMap contributors' : '') : '© OpenStreetMap contributors',
    attributionUrl: hit.citySource === 'OCHA COD-AB' ? 'https://data.humdata.org/dataset/cod-ab-chn' : 'https://www.openstreetmap.org/copyright',
  };
}

/** Original-file previews and strictly local administrative lookup.
 * The archived-provider normalizer above only reads already stored evidence.
 * No network provider, endpoint, request queue, or online cache is consulted.
 */
export function createEnrichment({ getConfig = () => ({}), now = () => new Date(), geo = createGeoIndex() } = {}) {
  const lifetime = new AbortController();
  const pending = new Map();
  const previews = new Set();
  let closed = false;
  let closePromise;

  async function preview(input, { maxDimension = 1024 } = {}) {
    if (closed) throw new Error('图片预览服务已关闭');
    if (!Number.isInteger(maxDimension) || maxDimension < 16 || maxDimension > 2048) throw new Error('预览边长需为 16–2048 像素');
    let source;
    if (typeof input === 'string') {
      if (!input || input.includes('\0') || input.includes('://') || input.startsWith('\\\\') || input.startsWith('//') || !(isAbsolute(input) || win32.isAbsolute(input))) {
        throw new Error('图片预览路径必须是内部本地绝对路径');
      }
      const info = await stat(input);
      if (!info.isFile() || !info.size) throw new Error('图片预览输入不是有效的本地文件');
      source = input;
    } else if (Buffer.isBuffer(input)) source = input;
    else if (input instanceof Uint8Array) source = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    else if (input instanceof ArrayBuffer) source = Buffer.from(input);
    else throw new Error('图片预览仅接收文件字节或内部本地路径');
    if (closed) throw new Error('图片预览服务已关闭');
    if (typeof source !== 'string' && !source.length) throw new Error('图片预览输入不能为空');
    // A path is passed directly to libvips; no whole-original Buffer is created.
    const pipeline = sharp(source, { animated: false, pages: 1, limitInputPixels: 100_000_000, failOn: 'error' })
      .rotate().resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).toColourspace('srgb').jpeg({ quality: 76, mozjpeg: true });
    previews.add(pipeline);
    try {
      const result = await abortable(pipeline.toBuffer({ resolveWithObject: true }), lifetime.signal);
      if (closed) throw new Error('closed');
      return { data: result.data.toString('base64'), mediaType: 'image/jpeg', bytes: result.data, width: result.info.width, height: result.info.height };
    } catch { throw new Error('无法生成图片预览；原图无需改动，可稍后重试'); }
    finally { previews.delete(pipeline); }
  }

  function failureOf(kind, message) {
    return { ok: false, failure: { kind, at: new Date(now()).toISOString(), ...(message ? { message } : {}) } };
  }

  /** Resolves without throwing. A polygon hit is not necessarily a known place. */
  async function reverseGeocodeDetailed(input) {
    if (closed) return failureOf('closed', '地点查询已关闭');
    try {
      if (getConfig()?.geocodingEnabled === false) return failureOf('disabled', '离线地点查询未启用');
      const gps = coordinatePair(input);
      if (!gps) return failureOf('no-gps', '照片没有有效的经纬度');
      if (!geo || typeof geo.locate !== 'function') return failureOf('data-unavailable', '本地行政区划数据无法读取，请检查插件文件');
      // Keep exact coordinates: nearby points may lie on opposite sides of a border.
      const key = JSON.stringify([gps.latitude, gps.longitude]);
      if (pending.has(key)) return structuredClone(await pending.get(key));
      const task = (async () => {
        try {
          const hit = await abortable(geo.locate(gps.latitude, gps.longitude), lifetime.signal);
          if (closed) return failureOf('closed', '地点查询已关闭');
          if (getConfig()?.geocodingEnabled === false) return failureOf('disabled', '离线地点查询未启用');
          if (!hit) return failureOf('unsupported-region', '地图未收录该地区，请手动填写');
          if (!label(hit.name) || !cityOf(hit) || !label(hit.province) || !String(hit.code || '').trim()) {
            return failureOf('name-missing', '该区域的地名资料尚未齐全，请手动补充');
          }
          return { ok: true, place: offlinePlace(hit, gps, now) };
        } catch {
          return closed ? failureOf('closed', '地点查询已关闭')
            : failureOf('data-unavailable', '本地行政区划数据无法读取，请检查插件文件');
        }
      })();
      pending.set(key, task);
      try { return structuredClone(await task); }
      finally { if (pending.get(key) === task) pending.delete(key); }
    } catch {
      return failureOf('internal', '离线地点查询暂未完成，请稍后重试');
    }
  }

  /** Compatibility for callers expecting a place or null. */
  async function reverseGeocode(input) {
    const result = await reverseGeocodeDetailed(input);
    return result.ok ? result.place : null;
  }

  function close() {
    if (closePromise) return closePromise;
    closed = true;
    lifetime.abort();
    for (const pipeline of previews) pipeline.destroy();
    closePromise = Promise.allSettled([...pending.values()]).then(() => {});
    return closePromise;
  }

  return Object.freeze({ preview, reverseGeocode, reverseGeocodeDetailed, normalizeStoredPlace, geoDataVersion: GEO_DATA_VERSION, close });
}
