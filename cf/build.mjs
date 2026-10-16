// Cloudflare 에 올릴 정적 파일 모으기 → cf/public/(깃 밖). 게임 화면이 실제로 불러 쓰는 것만:
//  v2/index.html · v2/src/main.js 에서 import 로 닿는 모든 .js/.mjs(tools/pixel/big 일부 포함) · 그림·글꼴(assets/fonts · assets/sprites · assets/v2)
//  서버 코드(server/)·저장소·도구·문서는 안 올라감.  실행: node cf/build.mjs
import { readFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), OUT = join(ROOT, 'cf', 'public');
rmSync(OUT, { recursive: true, force: true });
const IMP = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;
const seen = new Set(), stack = [join(ROOT, 'v2', 'src', 'main.js')], missing = [];
while (stack.length) {
  const f = stack.pop();
  if (seen.has(f)) continue;
  if (!existsSync(f)) { missing.push(relative(ROOT, f)); continue; }
  seen.add(f);
  for (const m of readFileSync(f, 'utf8').matchAll(IMP)) { const spec = m[1] || m[2] || m[3]; if (spec && spec.startsWith('.')) stack.push(resolve(dirname(f), spec)); }
}
if (missing.length) { console.error('없는 모듈:', missing.join(', ')); process.exit(1); }
for (const f of seen) { const to = join(OUT, relative(ROOT, f)); mkdirSync(dirname(to), { recursive: true }); cpSync(f, to); }
cpSync(join(ROOT, 'v2', 'index.html'), join(OUT, 'v2', 'index.html'));
cpSync(join(ROOT, 'v2', 'privacy.html'), join(OUT, 'v2', 'privacy.html'));   // 개인정보처리방침(구글 로그인 게시 · 플레이 스토어에 주소가 필요)
for (const d of ['assets/fonts', 'assets/sprites', 'assets/v2']) if (existsSync(join(ROOT, d))) cpSync(join(ROOT, d), join(OUT, d), { recursive: true });
// 무료 한도 확인: 파일 2만 개 · 한 파일 25MiB
let n = 0, total = 0, big = [];
const walk = d => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else { const s = statSync(p).size; n++; total += s; if (s > 25 * 1024 * 1024) big.push(relative(OUT, p)); } } };
walk(OUT);
console.log(`cf/public — 모듈 ${seen.size}개 포함 파일 ${n}개 · ${(total / 1048576).toFixed(1)}MB`);
if (n > 20000 || big.length) { console.error('한도 넘음', n, big); process.exit(1); }
