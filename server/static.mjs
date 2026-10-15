// 게임 파일 내보내기(정해 둔 폴더만): v2/(화면 코드) · assets/(그림·글꼴) · 화면이 가져다 쓰는 공격 연출 두 파일
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.css': 'text/css; charset=utf-8',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};
const PREFIX = ['/v2/', '/assets/'];
const FILES = new Set(['/tools/pixel/big/attack.mjs', '/tools/pixel/big/fxcore.mjs']);

export function makeStatic(root) {
  const ROOT = resolve(root);
  return async function serve(req, res, path) {
    if (path === '/' || path === '/index.html') { res.writeHead(302, { location: '/v2/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '') }); res.end(); return true; }
    if (path.endsWith('/')) path += 'index.html';
    if (!(PREFIX.some(p => path.startsWith(p)) || FILES.has(path))) return false;
    if (path.includes('..') || path.includes('\0') || /\/\./.test(path)) return false;
    const file = resolve(ROOT, '.' + path);
    if (!file.startsWith(ROOT + sep)) return false;
    const type = TYPES[extname(file).toLowerCase()];
    if (!type) return false;
    let st;
    try { st = await stat(file); } catch { return false; }
    if (!st.isFile()) return false;
    const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
    const head = { 'content-type': type, etag, 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, head); res.end(); return true; }
    const body = await readFile(file);
    res.writeHead(200, { ...head, 'content-length': body.length });
    res.end(req.method === 'HEAD' ? undefined : body);
    return true;
  };
}
