// 작은 정적 서버(촬영·내보내기 도구 공용). ES 모듈·폰트는 file:// 로는 막히므로 http 로 띄운다.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

export function serve(root, port = 0) {
  const base = resolve(root);
  return new Promise(res => {
    const srv = http.createServer(async (req, resp) => {
      try {
        let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (p.endsWith('/')) p += 'index.html';
        const f = normalize(join(base, p));
        if (!f.startsWith(base)) { resp.writeHead(403); return resp.end(); }
        const data = await readFile(f);
        resp.writeHead(200, { 'Content-Type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        resp.end(data);
      } catch (e) { resp.writeHead(404); resp.end('404'); }
    });
    srv.listen(port, '127.0.0.1', () => res({ srv, port: srv.address().port, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}

// 단독 실행: node tools/shots/static-server.mjs [포트]  → 저장소 루트를 서빙
if (process.argv[1] && process.argv[1].endsWith('static-server.mjs')) {
  const port = +(process.argv[2] || 8790);
  const { url } = await serve(resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), port);
  console.log('serving repo at', url, '— 새 버전:', url + '/v2/');
}
