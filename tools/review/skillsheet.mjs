// 종 고유 기술 검토판(PNG) — docs/superpowers/specs/2026-10-18-v2-species-skills.md 를 종마다 카드(생김새 · 컨셉 한 줄 · 개성 · 타고남 · 기술 여섯)로
//  node tools/review/skillsheet.mjs [--out <폴더>] [--per 4]   (기본 = 바탕화면\풀로세움_고유기술_검토)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { SPECIES } from '../../v2/src/game/catalog.js';

const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(repo, 'tools/shots/package.json'));
const puppeteer = require('puppeteer-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', join(process.env.USERPROFILE || repo, 'Desktop', '풀로세움_고유기술_검토')), PER = +arg('per', 4);
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));

// ── 컨셉 한 줄: catalog.js 종 줄 주석 → tools/pixel/big/species/<키>.mjs 첫 줄 → 이름 · 설계 메모에서 ──
const concept = {};
for (const l of readFileSync(join(repo, 'v2/src/game/catalog.js'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^  ([a-z_]+): \{ name: '[^']+',.*type:.*\},?\s*\/\/\s*(.*)$/);
  if (m) { const c = m[2].split('   //')[0].replace(/\s*\(2026.*$/, '').replace(/^2026.*$/, '').trim(); if (c && !/사용자/.test(c)) concept[m[1]] = c; }
}
const spDir = join(repo, 'tools/pixel/big/species');
for (const f of readdirSync(spDir).filter(f => f.endsWith('.mjs'))) {
  const k = f.slice(0, -4), m = readFileSync(join(spDir, f), 'utf8').split(/\r?\n/)[0].match(/—\s*([^.]+)\./);
  if (m && !concept[k]) concept[k] = m[1].trim();
}
Object.assign(concept, {   // 주석 · 그림 메모가 없는 종 = 이름과 설계 메모에서(외형을 새로 짓지 않음)
  frost_bell: '서리 종 모양 꽃', volt_vine: '번개가 흐르는 덩굴', stone_cap: '돌 갓 버섯', jelly_cap: '해파리 버섯',
  fang_trap: '이빨 덫 꽃(파리지옥 · 태생 포식)', blade_vine: '칼날 잎 덩굴(태생 무기)', toxi_cactus: '독가시 선인장(태생 독성)',
  draco_fruit: '서리 용과 선인장 · 탱커', ember_cap: '불씨 버섯(태생 포자)', drake_cactus: '불 선인장 용(태생 용족)', frost_drake: '비늘 몸 · 날개 · 뿔의 서리 용(태생 용족)',
  draco: '서리 용과 선인장 · 탱커',
});

// ── md 읽기 ──
const md = readFileSync(join(repo, 'docs/superpowers/specs/2026-10-18-v2-species-skills.md'), 'utf8').split(/\r?\n/);
const byName = Object.fromEntries(Object.entries(SPECIES).map(([k, s]) => [s.name, k]));
byName['쿵지지덕'] = 'drum_cactus';
const parseSkill = s => { const m = s.trim().match(/^(.*)\(([^()]*)\)\s*:\s*(.*)$/); return m ? { name: m[1].trim(), meta: m[2].trim(), desc: m[3].trim() } : { name: s.trim(), meta: '', desc: '' }; };   // 이름에 괄호가 있어도(검방술(기본)) 마지막 괄호 = 햇빛 · 위력
const list = [];
let cur = null;
for (const l of md) {
  const h = l.match(/^### (\d+)\. (.+)$/);
  if (h) { const parts = h[2].split(' · '); const nm = parts[0].replace(/\(.*$/, '').trim(); cur = { no: +h[1], name: nm, el: parts[1] || '', idea: parts.slice(2).join(' · ').replace(/\(화면 이름.*\)$/, ''), key: byName[nm] || null, innate: '', rows: [] }; list.push(cur); continue; }
  if (!cur) continue;
  const x = l.match(/^(부제|한줄|컨셉|성격):\s*(.*)$/);   // 사용자 설계 종 = 부제 · 한줄 · 컨셉 · 성격 줄
  if (x) { cur[{ 부제: 'sub', 한줄: 'line', 컨셉: 'idea2', 성격: 'char' }[x[1]]] = x[2]; continue; }
  const t = l.match(/^타고남(\([^)]*\))?:\s*(.*)$/);
  if (t) { cur.innate = (t[1] ? t[1] + ' ' : '') + t[2]; continue; }
  const r = l.match(/^- (어린|자라는|다 자란(?:\(맨몸\))?) · (.*)$/);
  if (r) cur.rows.push({ stage: r[1], skills: r[2].split(' / ').map(parseSkill) });
}
const EL = { 풀: '#4fbf5a', 물: '#3f9ae0', 불: '#f07a2e', 대지: '#b58a4c', 바람: '#7fcfc0', 번개: '#e6c13a', 빙결: '#8fd3f0' };

// ── 그림(큰 판 첫 장 96×112) ──
function art(key) {
  const f = key && join(repo, 'assets/v2/plants', key + '.png');
  if (!f || !existsSync(f)) return `<div class="art none">새 종<br>그림 없음</div>`;
  const b = readFileSync(f), W = b.readUInt32BE(16), H = b.readUInt32BE(20), k = 2;
  return `<div class="art" style="background-image:url('${pathToFileURL(f).href}');background-size:${W * k}px ${H * k}px"></div>`;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const card = s => `
<section class="card">
  <div class="left">${art(s.key)}<div class="no">${s.no}</div></div>
  <div class="right">
    <div class="head"><span class="nm">${esc(s.name)}</span><span class="chip" style="background:${EL[s.el.replace(/\(.*$/, '')] || '#8899aa'}">${esc(s.el)}</span><span class="chip idea">${esc(s.idea)}</span></div>
    ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ''}
    ${s.line ? `<div class="concept">“${esc(s.line)}”</div>` : ''}
    <div class="concept">${esc(s.idea2 || concept[s.key] || '')}</div>
    ${s.char ? `<div class="concept">성격 · ${esc(s.char)}</div>` : ''}
    <div class="innate"><b>타고남</b> ${esc(s.innate)}</div>
    <table>${s.rows.map(r => r.skills.map((k, i) => `<tr>${i === 0 ? `<td class="st" rowspan="${r.skills.length}">${esc(r.stage)}</td>` : ''}<td class="sk">${esc(k.name)}</td><td class="mt">${esc(k.meta)}</td><td class="ds">${esc(k.desc)}</td></tr>`).join('')).join('')}</table>
  </div>
</section>`;
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;background:#101826;color:#e8f0fa;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;padding:28px}
h1{font-size:30px;margin-bottom:6px}
.legend{font-size:17px;color:#9fb3c8;margin-bottom:18px}
.card{display:flex;gap:20px;background:#182436;border:2px solid #2c3e58;border-radius:14px;padding:18px;margin-bottom:18px}
.left{position:relative;flex:0 0 200px}
.art{width:192px;height:224px;background-repeat:no-repeat;background-position:0 0;image-rendering:pixelated;background-color:#22324a;border-radius:12px}
.art.none{display:flex;align-items:center;justify-content:center;text-align:center;color:#7d93ad;font-size:20px}
.no{position:absolute;top:6px;left:8px;font-size:18px;color:#9fb3c8}
.right{flex:1;min-width:0}
.head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.nm{font-size:30px;font-weight:700}
.chip{font-size:17px;padding:3px 12px;border-radius:999px;color:#101826;font-weight:700}
.chip.idea{background:#ff9a3c}
.concept{font-size:18px;color:#b8cce0;margin:6px 0 8px}
.sub{font-size:20px;color:#ffc27a;margin-top:6px}
.innate{font-size:18px;background:#22324a;border-left:4px solid #ff9a3c;padding:8px 12px;border-radius:6px;margin-bottom:10px;line-height:1.45}
table{width:100%;border-collapse:collapse;font-size:17px}
td{padding:6px 8px;border-top:1px solid #2c3e58;vertical-align:top;line-height:1.4}
td.st{width:72px;color:#ffc27a;font-weight:700;white-space:nowrap}
td.sk{width:170px;font-weight:700}
td.mt{width:150px;color:#8ccfff;white-space:nowrap}
td.ds{color:#d6e2ef}`;

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (/^고유기술_\d+\.png$/.test(f)) rmSync(join(OUT, f));
const tmp = join(repo, 'tools/review/_sheet.html'), pages = Math.ceil(list.length / PER);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
const page = await b.newPage();
await page.setViewport({ width: 1080, height: 800, deviceScaleFactor: 1 });
for (let p = 0; p < pages; p++) {
  const part = list.slice(p * PER, (p + 1) * PER);
  writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body><h1>풀로세움 종 고유 기술 ${p + 1}/${pages}</h1><div class="legend">(햇빛 · 위력) · N타×P = 연타(한 타 위력 P) · 광역 = 확정 명중 · 판마다 n = 그 판에 쓸 수 있는 횟수 · 수치는 시제품</div>${part.map(card).join('')}</body>`);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  const h = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1080, height: h, deviceScaleFactor: 1 });
  const name = `고유기술_${String(p + 1).padStart(2, '0')}.png`;
  await page.screenshot({ path: join(OUT, name), fullPage: true });
  console.log(name, part.map(s => s.name).join(' · '));
}
await b.close();
rmSync(tmp, { force: true });
console.log('→', OUT, `(${list.length}종 · ${pages}장)`);
