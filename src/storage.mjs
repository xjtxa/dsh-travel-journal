import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';

export const LIBRARY_MARKER = '.travel-journal-library.json';
export const LIBRARY_FORMAT = 'dsh-travel-journal-library';
export const LIBRARY_VERSION = 1;
export const controlDirectory = dataDir => resolve(dataDir) + '.local';
const CORE_DIRECTORIES = ['originals', 'records', 'abandoned'];
const LEGACY_NAMES = new Set([...CORE_DIRECTORIES, '_incoming', 'enrichment', 'state.json', 'analysis-cache.json', 'config.json', 'lifecycle-diagnostic.json']);
const isMissing = error => ['ENOENT', 'ENOTDIR', 'ENODEV', 'EIO'].includes(error?.code);
function storageError(status, message) {
  return Object.assign(new Error(message), { status: 503, storageStatus: status, code: status === 'missing' ? 'TRAVEL_STORAGE_MISSING' : 'TRAVEL_STORAGE_INVALID' });
}
function markerValue(value) {
  if (!value || value.format !== LIBRARY_FORMAT || value.version !== LIBRARY_VERSION || typeof value.libraryId !== 'string' || !/^[a-f0-9-]{36}$/i.test(value.libraryId)) throw storageError('invalid', '这个文件夹不是支持的旅行资料库，或资料库标识已损坏。');
  return value;
}
export async function writeLocalJson(file, value) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, file);
}
function selectedPath(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096 || value.includes('\0') || !isAbsolute(value.trim())) throw Object.assign(new Error('请选择资料文件夹的完整路径。'), { status: 400 });
  return resolve(value.trim());
}

/** A descriptor never recreates a missing directory. Its synchronous guard is
 * also passed into the archive engine before writes and background work. */
export async function openLibrary(value, { initialize = false, createMissing = false, adoptLegacy = false, expectedId } = {}) {
  const path = selectedPath(value);
  let info;
  try { info = await stat(path); }
  catch (error) {
    if (!isMissing(error)) throw storageError('invalid', '无法读取资料文件夹，请检查访问权限。');
    if (!createMissing) throw storageError('missing', '资料文件夹找不到了。请连接磁盘、重新选择已移动的文件夹，或先创建一个新文件夹。');
    await mkdir(path, { recursive: true });
    info = await stat(path);
  }
  if (!info.isDirectory()) throw storageError('invalid', '资料路径必须是文件夹。');
  const markerPath = join(path, LIBRARY_MARKER);
  let marker, adoptedLegacy = false;
  try { marker = markerValue(JSON.parse(await readFile(markerPath, 'utf8'))); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error.storageStatus ? error : storageError('invalid', '资料库标识无法读取或已损坏。');
    const entries = await readdir(path, { withFileTypes: true });
    const legacy = adoptLegacy && entries.some(entry => ['originals', 'records', 'state.json'].includes(entry.name)) && entries.every(entry => LEGACY_NAMES.has(entry.name));
    adoptedLegacy = legacy;
    if (!legacy && (!initialize || entries.length)) throw storageError('invalid', '所选文件夹不是旅行资料库。请选已有资料库或一个空文件夹。');
    for (const name of CORE_DIRECTORIES) await mkdir(join(path, name), { recursive: false }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    marker = { format: LIBRARY_FORMAT, version: LIBRARY_VERSION, libraryId: randomUUID(), createdAt: new Date().toISOString() };
    // Exclusive creation protects a folder concurrently claimed by another host.
    try { await writeFile(markerPath, JSON.stringify(marker, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; marker = markerValue(JSON.parse(await readFile(markerPath, 'utf8'))); }
  }
  if (expectedId && marker.libraryId !== expectedId) throw storageError('invalid', '这个路径上的资料库身份已改变，请明确重新选择要打开的资料库。');
  const rootIdentity = statSync(path), markerIdentity = statSync(markerPath), actualPath = realpathSync(path);
  const coreIdentities = new Map();
  try {
    for (const name of CORE_DIRECTORIES) {
      const child = join(path, name), identity = statSync(child), actual = realpathSync(child);
      if (!identity.isDirectory() || actual !== join(actualPath, name)) throw storageError('invalid', '资料库子目录不能指向资料文件夹以外的位置。');
      coreIdentities.set(name, { dev: identity.dev, ino: identity.ino, actual });
    }
  } catch (error) { throw error.storageStatus ? error : storageError('invalid', '资料库目录结构不完整，请检查 originals、records 和 abandoned 文件夹。'); }
  const descriptor = { path, libraryId: marker.libraryId, adoptedLegacy, assertStorage() {
    try {
      const root = statSync(path), identity = statSync(markerPath);
      const current = markerValue(JSON.parse(readFileSync(markerPath, 'utf8')));
      if (!root.isDirectory() || realpathSync(path) !== actualPath || root.dev !== rootIdentity.dev || root.ino !== rootIdentity.ino || identity.dev !== markerIdentity.dev || identity.ino !== markerIdentity.ino || current.libraryId !== marker.libraryId) throw storageError('invalid', '资料文件夹已被替换，请重新选择或重试，避免写入错误的资料库。');
      for (const [name, expected] of coreIdentities) {
        const child = join(path, name), identity = statSync(child);
        if (!identity.isDirectory() || identity.dev !== expected.dev || identity.ino !== expected.ino || realpathSync(child) !== expected.actual) throw storageError('invalid', '资料库子目录已被替换，请检查资料后重新打开。');
      }
    } catch (error) {
      if (error.storageStatus) throw error;
      throw storageError(isMissing(error) ? 'missing' : 'invalid', isMissing(error) ? '资料文件夹或其中的文件已不可用，请连接磁盘或重新选择。' : '资料库无法读取，请检查标识和访问权限。');
    }
  } };
  descriptor.assertStorage();
  return descriptor;
}

export async function createStorageController({ dataDir, controlDir = controlDirectory(dataDir) }) {
  const defaultPath = resolve(dataDir), pointerFile = join(controlDir, 'library.json');
  await mkdir(controlDir, { recursive: true });
  let pointer, descriptor = null, view;
  try {
    pointer = JSON.parse(await readFile(pointerFile, 'utf8'));
    if (pointer.version !== 1 || typeof pointer.path !== 'string' || !isAbsolute(pointer.path) || (pointer.libraryId !== null && typeof pointer.libraryId !== 'string')) throw new Error('invalid pointer');
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('本机资料路径设置无法读取，请检查 ' + pointerFile);
    pointer = { version: 1, path: defaultPath, libraryId: null };
    try { descriptor = await openLibrary(defaultPath, { initialize: true, createMissing: true, adoptLegacy: true }); pointer.libraryId = descriptor.libraryId; }
    catch (problem) { view = { path: defaultPath, libraryId: null, status: problem.storageStatus || 'invalid', message: problem.message }; }
    await writeLocalJson(pointerFile, pointer);
  }
  if (!descriptor && !view) {
    try { descriptor = await openLibrary(pointer.path, { expectedId: pointer.libraryId }); }
    catch (error) { view = { path: pointer.path, libraryId: pointer.libraryId, status: error.storageStatus || 'invalid', message: error.message }; }
  }
  view ||= { path: descriptor.path, libraryId: descriptor.libraryId, status: 'ready', message: '' };
  const markUnavailable = (library, error) => {
    if (library.path === pointer.path && library.libraryId === pointer.libraryId) view = { path: pointer.path, libraryId: pointer.libraryId, status: error.storageStatus || 'invalid', message: error.message };
  };
  return {
    controlDir, configFile: join(controlDir, 'config.json'), legacyConfigPath: descriptor?.adoptedLegacy ? join(defaultPath, 'config.json') : null, descriptor: () => descriptor,
    state: () => ({ ...view }), markUnavailable,
    guard(library, onUnavailable = () => {}) { return () => { try { library.assertStorage(); } catch (error) { markUnavailable(library, error); onUnavailable(error); throw error; } }; },
    candidate: path => selectedPath(path) === pointer.path && pointer.libraryId ? openLibrary(path, { expectedId: pointer.libraryId }) : openLibrary(path, { initialize: true }),
    retry: () => openLibrary(pointer.path, { expectedId: pointer.libraryId }),
    async commit(library) {
      library.assertStorage();
      const next = { version: 1, path: library.path, libraryId: library.libraryId };
      await writeLocalJson(pointerFile, next); pointer = next; descriptor = library;
      view = { path: library.path, libraryId: library.libraryId, status: 'ready', message: '' };
    },
  };
}

/** The fallback helper shows a native Windows folder dialog. The desktop
 * client uses the host-native picker when available. */
export function createFolderPicker({ platform = process.platform, execute = execFile } = {}) {
  const pending = new Set();
  let closed = false;
  const picker = async ({ path = '', purpose = 'library' } = {}) => {
    if (closed) throw Object.assign(new Error('插件已关闭，请重新打开后选择资料文件夹。'), { status: 503 });
    if (platform !== 'win32') throw Object.assign(new Error('当前系统的文件夹选择器不可用。'), { status: 501 });
    const encodedPath = Buffer.from(JSON.stringify(path), 'utf8').toString('base64');
    const importing = purpose === 'import';
    const description = importing ? '选择要导入照片的文件夹' : '选择旅行资料文件夹';
    const script = `$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Windows.Forms; $dialog=New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description='${description}'; $dialog.ShowNewFolderButton=$${importing ? 'false' : 'true'}; $dialog.SelectedPath=([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPath}')) | ConvertFrom-Json); $result=$dialog.ShowDialog(); [Console]::OutputEncoding=[Text.Encoding]::UTF8; if($result -eq [System.Windows.Forms.DialogResult]::OK){ @{path=$dialog.SelectedPath;cancelled=$false}|ConvertTo-Json -Compress }else{ @{path='';cancelled=$true}|ConvertTo-Json -Compress }; $dialog.Dispose()`;
    const output = await new Promise((done, reject) => {
      const entry = { child: null, settled: false, cancel: null };
      const finish = (error, stdout) => {
        if (entry.settled) return;
        entry.settled = true; pending.delete(entry);
        if (error) {
          const timedOut = error.killed || error.code === 'ETIMEDOUT';
          reject(Object.assign(new Error(timedOut ? '文件夹选择已超时，请重新打开选择器。' : '无法打开文件夹选择窗口，请重试。'), { status: timedOut ? 504 : 500 }));
        } else done(stdout);
      };
      entry.cancel = () => {
        finish(null, '{"path":"","cancelled":true}');
        // Kill only the child launched by this picker, never other PowerShell processes.
        try { entry.child?.kill(); } catch { /* Already exited. */ }
      };
      pending.add(entry);
      try {
        entry.child = execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, maxBuffer: 65536, timeout: 300000 }, finish);
      } catch (error) { finish(error); }
    });
    const value = JSON.parse(String(output).replace(/^\uFEFF/, '').trim());
    return value.cancelled ? { path: '', cancelled: true } : { path: selectedPath(value.path), cancelled: false };
  };
  picker.close = () => { closed = true; for (const entry of pending) entry.cancel(); };
  return picker;
}
