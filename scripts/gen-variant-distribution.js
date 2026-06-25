/* 변이종 탐사 분포 생성기 — 140 변이 개체(released:false)를 지역 시그니처에 배치해
   "지역에서 사냥하는 희귀 돌연변이"로 획득 가능하게 한다(시그니처 경로는 released 우회 → 봇/일반풀 불변).
   매칭: 지역 el ⊇ 변이 속성 & 지역 types ⊇ 변이 타입, 변이형↔행성 cardType 가급적 일치, 부하 균형.
   결과 = MUTANT_SIGNATURES 테이블 + EXPLORE_VIEW 병합 루프를 index.html 에 삽입(EXPLORE_VIEW 원본 미수정·멱등).
   사용: node scripts/gen-variant-distribution.js [--dry]
*/
const fs = require('fs');
const path = require('path');
const HTML = path.join(__dirname, '..', 'index.html');
const DRY = process.argv.includes('--dry');

const KO_TYPE = { '목본형':'tree', '화초형':'flower', '다육형':'cactus', '덩굴형':'vine', '버섯형':'mushroom' };
const FORM_CARD = { pred:'dna', weapon:'weapon', toxic:'potion', dragon:'dragon', normal:'common' };

let html = fs.readFileSync(HTML, 'utf8');

// ── EXPLORE_VIEW / SPECIES_CATALOG 추출(순수 데이터 → eval) ──
const evMatch = html.match(/const EXPLORE_VIEW = (\[[\s\S]*?\n\]);/);
const scMatch = html.match(/const SPECIES_CATALOG = (\{[\s\S]*?\n\});/);
if(!evMatch || !scMatch){ console.error('EXPLORE_VIEW/SPECIES_CATALOG 추출 실패'); process.exit(1); }
const EXPLORE_VIEW = eval(evMatch[1]);
const SPECIES_CATALOG = eval('(' + scMatch[1] + ')');

// ── 변이 종 목록(released:false + baseVariants 보유) ──
const variants = Object.keys(SPECIES_CATALOG).map(k => {
  const c = SPECIES_CATALOG[k];
  return { key:k, type:c.type, element:c.element, form:(c.baseVariants||[])[0], released:c.released };
}).filter(v => v.released === false && v.form);
console.log('변이 종:', variants.length);

// ── 지역 목록 ──
const regions = [];
EXPLORE_VIEW.forEach(p => (p.regions || []).forEach(r => {
  regions.push({
    rid: p.id + '|' + r.name,
    cardTypes: p.cardTypes || [],
    el: r.el || [],
    types: (r.types || []).map(t => KO_TYPE[t]).filter(Boolean),
    load: 0,
  });
}));
console.log('지역:', regions.length);

// ── 할당 ──
const assign = {};            // rid -> [keys]
let fallback = 0;
const tiers = {};
function place(v, cands, why){
  if(why){ tiers[why] = (tiers[why]||0)+1; }
  // cardType 선호 우선, 그다음 최소 부하
  const want = FORM_CARD[v.form];
  let pool = cands.filter(r => r.cardTypes.indexOf(want) >= 0);
  if(!pool.length) pool = cands;
  pool.sort((a, b) => a.load - b.load);
  const r = pool[0];
  (assign[r.rid] = assign[r.rid] || []).push(v.key);
  r.load++;
  if(why) fallback++;
}
variants.forEach(v => {
  let cands = regions.filter(r => r.el.indexOf(v.element) >= 0 && r.types.indexOf(v.type) >= 0);
  if(cands.length) return place(v, cands);
  cands = regions.filter(r => r.el.indexOf(v.element) >= 0);          // 속성만
  if(cands.length) return place(v, cands, 'el-only');
  cands = regions.filter(r => r.types.indexOf(v.type) >= 0);          // 타입만
  if(cands.length) return place(v, cands, 'type-only');
  place(v, regions, 'any');                                           // 최후
});

// ── 리포트 ──
const loads = regions.map(r => r.load);
console.log('폴백(불완전 매칭):', fallback, JSON.stringify(tiers));
console.log('지역당 부하: min', Math.min(...loads), '· max', Math.max(...loads), '· 평균', (variants.length/regions.length).toFixed(1));
console.log('빈 지역:', regions.filter(r => r.load === 0).length);
const totalAssigned = Object.values(assign).reduce((s, a) => s + a.length, 0);
console.log('할당 합계:', totalAssigned, '(=', variants.length, '?)');
console.log('\n샘플 배치:');
Object.keys(assign).slice(0, 3).forEach(rid => console.log(' ', rid, '→', assign[rid].join(', ')));

// ── JS 블록 생성 ──
const entries = Object.keys(assign).sort().map(rid =>
  `  '${rid}': [${assign[rid].map(k => `'${k}'`).join(',')}],`).join('\n');
const block =
`/* ── 변이종 탐사 분포(생성: scripts/gen-variant-distribution.js) ──
   140 태생 변이를 지역 시그니처에 추가 → 희귀 발견으로 획득 가능(시그니처 경로는 released 우회 → 봇/일반풀 불변).
   키 = '<planetId>|<지역명>'. EXPLORE_VIEW 원본은 미수정, 아래 루프로 병합(멱등·중복제거). */
const MUTANT_SIGNATURES = {
${entries}
};
EXPLORE_VIEW.forEach(function(p){ (p.regions||[]).forEach(function(r){
  var add = MUTANT_SIGNATURES[p.id + '|' + r.name];
  if(add){ var cur = r.signature || (r.signature = []); add.forEach(function(k){ if(cur.indexOf(k) < 0) cur.push(k); }); }
}); });
`;

// 구문 검증
try { new Function('const EXPLORE_VIEW=' + evMatch[1] + ';' + block + 'return MUTANT_SIGNATURES;')(); console.log('\n구문 검증: OK'); }
catch(e){ console.error('\n구문 에러:', e.message); process.exit(1); }

if(DRY){ console.log('\n[--dry] index.html 미수정.'); process.exit(0); }

// ── 삽입(EXPLORE_VIEW 닫는 ]; 뒤). 재실행 시 기존 블록 교체(멱등). ──
const startMark = '/* ── 변이종 탐사 분포(생성: scripts/gen-variant-distribution.js) ──';
if(html.includes(startMark)){
  // 기존 블록 교체
  const re = /\/\* ── 변이종 탐사 분포[\s\S]*?\}\); \}\); \}\);\n/;
  if(!re.test(html)){ console.error('기존 분포 블록 경계 탐지 실패'); process.exit(1); }
  html = html.replace(re, block);
} else {
  const anchor = evMatch[0];   // 'const EXPLORE_VIEW = [...];'
  html = html.replace(anchor, anchor + '\n' + block);
}
fs.writeFileSync(HTML, html, 'utf8');
console.log('\nindex.html 삽입 완료.');
