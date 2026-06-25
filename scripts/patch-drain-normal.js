/* #2 흡혈=변이형 전용: 일반형(form==='normal') 개체의 흡혈 스킬을 흡혈이 아닌
   "다양한 요소"의 스킬로 교체한다. 멱등(흡혈 제거된 스킬은 재실행 시 건너뜀).
   - 대상 = SPECIES_CATALOG에서 baseVariants 없음/['normal']인 종의 ind 스킬 중 lifesteal/drain.
   - 변이형(pred/toxic/dragon/weapon/spore) 흡혈은 보존.
   - 이미 부가효과(dot/디버프/버프/크리/관통/회복) 있으면 흡혈만 제거 → 그 효과로 다채로움 유지.
     부가효과 없던 순수 흡혈(물 속성 5종)엔 서로 다른 효과를 새로 부여(디버프/회복/버프 분산).
   사용: node scripts/patch-drain-normal.js --dry  (계획 출력) / node scripts/patch-drain-normal.js (적용)
*/
const fs = require('fs'), path = require('path');
const HTML = path.join(__dirname, '..', 'index.html');
const DRY = process.argv.includes('--dry');

const STAT_KO = { atk:'공격', def:'방어', spd:'기동' };
const DOT_KO = { burn:'화상', poison:'중독', bleed:'출혈' };

/* 부가효과 없던 순수 흡혈(물 속성)에 부여할 서로 다른 효과 */
const RIDER_ADD = {
  'ind.tree_water.e': { enemyDebuff:{stat:'def',pct:0.15,turns:2} }, // 해일이 방어를 무너뜨림
  'ind.aqua.e':       { heal:0.10 },                                  // 범람이 체력 회복
  'ind.vine_water.g': { enemyDebuff:{stat:'spd',pct:0.15,turns:2} }, // 물줄기로 결박
  'ind.vine_water.e': { selfBuff:{stat:'def',pct:0.15,turns:3} },    // 소용돌이 결계
  'ind.kelp_vine.e':  { enemyDebuff:{stat:'atk',pct:0.15,turns:2} }, // 해초가 공격 둔화
};
/* 이름 토큰 치환(흡혈/포식 어휘 → 효과 중립 어휘) */
const NAME_TOK = [['포식','폭발'],['흡식','포박'],['흡수','응축'],['흡혈','강타'],['흡반','휘감기'],['삼키기','붕괴']];
/* 흡혈 테마 아이콘(🩸) 교정 */
const ICON_FIX = { 'ind.vine_fire.m':'🔥', 'ind.vine_earth.m':'🪨' };

function descOf(o){
  const segs = [];
  if(o.power > 0) segs.push(`위력${o.power} · ${o.aoe ? '광역' : '단일'}`);
  else if(o.heal > 0) segs.push(`체력 ${Math.round(o.heal*100)}% 회복`);
  const riders = [];
  if(o.dot) riders.push(`${DOT_KO[o.dot.kind]}(${o.dot.turns}턴)`);
  if(o.enemyDebuff) riders.push(`적 ${STAT_KO[o.enemyDebuff.stat]} ${Math.round(o.enemyDebuff.pct*100)}%↓(${o.enemyDebuff.turns}턴)`);
  if(o.selfBuff) riders.push(`자신 ${STAT_KO[o.selfBuff.stat]} ${Math.round(o.selfBuff.pct*100)}%↑(${o.selfBuff.turns}턴)`);
  if(o.pierce) riders.push('방어 관통');
  if(o.critBonus) riders.push(`치명타율 +${Math.round(o.critBonus*100)}%`);
  if(o.heal > 0 && o.power > 0) riders.push(`체력 ${Math.round(o.heal*100)}% 회복`);
  if(o.cleanse) riders.push('디버프 해제');
  if(o.energyGain) riders.push('⚡+1');
  return segs.concat(riders).join(' + ');
}
function serialize(id, o){
  const f = [`name:'${o.name}'`, `icon:'${o.icon}'`, `cost:${o.cost}`, `kind:'${o.kind}'`];
  if(o.power > 0){ f.push(`power:${o.power}`); f.push(o.aoe ? 'aoe:true' : 'single:true'); }
  if(o.pierce) f.push(`pierce:${o.pierce}`);
  if(o.critBonus) f.push(`critBonus:${o.critBonus}`);
  if(o.dot) f.push(`dot:{kind:'${o.dot.kind}',pct:${o.dot.pct},turns:${o.dot.turns}}`);
  if(o.enemyDebuff) f.push(`enemyDebuff:{stat:'${o.enemyDebuff.stat}',pct:${o.enemyDebuff.pct},turns:${o.enemyDebuff.turns}}`);
  if(o.selfBuff) f.push(`selfBuff:{stat:'${o.selfBuff.stat}',pct:${o.selfBuff.pct},turns:${o.selfBuff.turns}}`);
  if(o.heal > 0) f.push(`heal:${o.heal}`);
  if(o.cleanse) f.push('cleanse:true');
  if(o.energyGain) f.push(`energyGain:${o.energyGain}`);
  f.push(`desc:'${descOf(o)}'`, `tag:'${o.tag||'개체'}'`, `grade:'${o.grade}'`);
  return `  '${id}': { ${f.join(', ')} },`;
}

let html = fs.readFileSync(HTML, 'utf8');
const lines = html.split(/\r?\n/);

// 종 form + ind 소유 매핑
const skillOwner = {};
const catRe = /^\s{2}([a-z][a-z0-9_]*):\s*\{.*stageSkills:\{/;
lines.forEach(l => {
  const m = l.match(catRe); if(!m) return;
  const bv = l.match(/baseVariants:\[([^\]]*)\]/);
  let form = 'normal';
  if(bv){ const fs2 = bv[1].replace(/['\s]/g,'').split(',').filter(Boolean);
    form = fs2.length === 1 ? fs2[0] : (fs2.includes('normal') ? 'normal' : fs2[0]); }
  ['growing','mature','evolved'].forEach(st => {
    const sm = l.match(new RegExp(st + ":\\['([^']+)'\\]"));
    if(sm){ const stg = st==='growing'?'g':st==='mature'?'m':'e'; skillOwner[sm[1]] = { form, stage:stg }; }
  });
});

let patched = 0, skipped = [], plan = [];
for(let i=0;i<lines.length;i++){
  const idm = lines[i].match(/'(ind\.[a-z0-9_]+\.[gme])':\s*\{/);
  if(!idm) continue;
  const id = idm[1];
  const own = skillOwner[id];
  if(!own || own.form !== 'normal') continue;        // 변이형 흡혈은 보존
  let j=i; while(j<lines.length && !lines[j].includes("grade:'")) j++;
  const block = lines.slice(i, j+1).join('\n');
  if(!/lifesteal:/.test(block) && !/kind:'drain'/.test(block)) continue; // 흡혈 아님
  if(!/lifesteal:/.test(block) && /kind:'drain'/.test(block)){} // drain인데 lifesteal 없는 경우도 처리
  // 객체 eval
  let obj;
  try { obj = (new Function('return {' + block.replace(/,\s*$/, '') + '}'))(); }
  catch(e){ skipped.push(id + ' (eval실패:'+e.message+')'); continue; }
  const o = obj[id];
  if(o.lifesteal == null && o.kind !== 'drain'){ continue; } // 이미 패치됨(멱등)
  const before = JSON.stringify(o);
  // 변환
  delete o.lifesteal;
  o.kind = o.power > 0 ? 'attack' : (o.heal>0 ? 'heal' : 'buff');
  // 부가효과 유무
  const hasRider = !!(o.dot || o.enemyDebuff || o.selfBuff || o.critBonus || o.pierce || o.heal);
  if(!hasRider){
    const add = RIDER_ADD[id];
    if(!add){ skipped.push(id + ' (부가효과없음·RIDER_ADD 미정의)'); continue; }
    Object.assign(o, add);
    if(o.heal>0 && o.power>0) o.kind = 'attack';
  }
  // 이름 치환
  let nm = o.name; NAME_TOK.forEach(([a,b]) => { nm = nm.split(a).join(b); }); o.name = nm;
  // 아이콘 교정
  if(ICON_FIX[id]) o.icon = ICON_FIX[id];
  // grade 재계산(위력 유지 → 변동 거의 없음)
  o.grade = (own.stage==='g'||own.stage==='m') ? 'B' : (o.power>=170 ? 'S':'A');
  // desc 재생성은 serialize 내부
  const newLine = serialize(id, o);
  // 구문 검증
  try { new Function('return {' + newLine.replace(/,\s*$/, '') + '}'); }
  catch(e){ console.error('구문 에러', id, e.message); process.exit(1); }
  plan.push({ id, stage: own.stage, before, after: newLine.trim() });
  // 라인 교체(블록을 한 줄로)
  if(!DRY){ lines.splice(i, j - i + 1, newLine); }
  patched++;
}

console.log('패치 대상(일반형 흡혈):', patched, '· 건너뜀:', skipped.length ? JSON.stringify(skipped) : '0');
console.log('\n=== 변환 결과 ===');
plan.forEach(p => console.log(p.after));
if(DRY){ console.log('\n[--dry] index.html 미수정.'); process.exit(0); }
fs.writeFileSync(HTML, lines.join('\n'), 'utf8');
console.log('\nindex.html 패치 완료 (' + patched + '종).');
