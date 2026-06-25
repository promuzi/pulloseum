/* 밸런스 패치: 설계상 자기버프 2개였으나 엔진(자기버프 1개 제약)으로 1개로 깎여
   효과 없이 작은 버프 하나만 남은 ind 버프 스킬 17종에 energyGain:1 부여
   → 버프 턴이 에너지 중립이 되어 단계 대비 빈약함 해소(검증된 spark.m 패턴).
   (설계상 단일버프 3종 granite_oak.g·bright_bloom.g·terra_cactus.g는 제외.) */
const fs = require('fs'), path = require('path');
const HTML = path.join(__dirname, '..', 'index.html');
const IDS = [
  'ind.flower_grass.m','ind.thorn.m','ind.vine_bolt.m','ind.grand_mangro.g','ind.draca_vine.m',
  'ind.ember_heart.g','ind.breeze_wood.g','ind.garden_rose.g','ind.terra_bloom.g','ind.aero_petal.g',
  'ind.sunfire_cactus.g','ind.breeze_cactus.g','ind.volt_leech.m','ind.glow_vine.g','ind.kelp_vine.g',
  'ind.green_vine.g','ind.aero_vine.g',
];
let html = fs.readFileSync(HTML, 'utf8');
const lines = html.split(/\r?\n/);
let patched = 0, skipped = [];
IDS.forEach(id => {
  const i = lines.findIndex(l => l.includes(`'${id}':`));
  if(i < 0){ skipped.push(id + ' (없음)'); return; }
  // 스킬 객체는 grade:' 가 있는 줄에서 끝남(단일/2줄 모두)
  let j = i; while(j < lines.length && !lines[j].includes("grade:'")) j++;
  let block = lines.slice(i, j + 1).join('\n');
  if(block.includes('energyGain')){ skipped.push(id + ' (이미 energyGain)'); return; }
  if(!/selfBuff:\{/.test(block) || !/desc:'/.test(block)){ skipped.push(id + ' (형식 불일치)'); return; }
  block = block.replace("desc:'", "energyGain:1, desc:'");
  block = block.replace(/(desc:'[^']*)'/, "$1 + ⚡+1'");
  const nb = block.split('\n');
  for(let k = 0; k < nb.length; k++) lines[i + k] = nb[k];
  patched++;
});
console.log('패치:', patched, '/', IDS.length, '· 건너뜀:', JSON.stringify(skipped));
if(patched !== IDS.length){ console.error('일부 미패치 — 중단'); process.exit(1); }
// 구문 검증(스킬 객체 블록 전체)
IDS.forEach(id => {
  const i = lines.findIndex(x => x.includes(`'${id}':`));
  let j = i; while(j < lines.length && !lines[j].includes("grade:'")) j++;
  const block = lines.slice(i, j + 1).join('\n').replace(/,\s*$/, '');
  try { new Function('return {' + block + '}'); } catch(e){ console.error('구문 에러', id, e.message); process.exit(1); }
});
console.log('구문 검증: OK');
fs.writeFileSync(HTML, lines.join('\n'), 'utf8');
console.log('index.html 패치 완료.');
