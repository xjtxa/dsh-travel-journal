import { execFile } from 'node:child_process';
import { isAbsolute } from 'node:path';

/** Open a verified local photo with the operating system's file association.
 * Windows receives the path as data, never as interpolated PowerShell code. */
export function createOriginalOpener({ platform = process.platform, execute = execFile } = {}) {
  return async (path, { signal } = {}) => {
    if (typeof path !== 'string' || !isAbsolute(path) || path.includes('\0')) throw new Error('原图路径无效。');
    signal?.throwIfAborted();
    let command, args, options = { windowsHide: true, timeout: 15000, maxBuffer: 16384, signal };
    if (platform === 'win32') {
      command = 'powershell.exe';
      const script = "$ErrorActionPreference='Stop'; Invoke-Item -LiteralPath $env:DSH_TRAVEL_ORIGINAL_PATH";
      args = ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')];
      options.env = { ...process.env, DSH_TRAVEL_ORIGINAL_PATH: path };
    } else if (platform === 'darwin') {
      command = 'open'; args = [path];
    } else if (platform === 'linux') {
      command = 'xdg-open'; args = [path];
    } else {
      throw Object.assign(new Error('当前系统暂不支持打开原图，请使用下载原图。'), { status: 501 });
    }
    await new Promise((resolve, reject) => {
      const finish = error => error ? reject(Object.assign(new Error('无法打开原图，请检查系统默认图片查看器。'), { status: 500, cause: error })) : resolve();
      try { execute(command, args, options, finish); } catch (error) { finish(error); }
    });
  };
}
