/* 개체 고유 스킬 생성기 — 설계서(2026-06-24-species-individual-concepts-design.md)를 파싱해
   버섯 base 7 성체/완숙(14스킬) + 변이 140종(카탈로그 140 + 스킬 420)을
   index.html 의 SKILL_LIB / SPECIES_CATALOG 에 삽입한다.
   매핑 규칙 = impl plan(2026-06-25) + 기존 base 28 코드 관례(흡혈→drain, 이중 selfBuff→첫개, grade g/m/e=B/B/A·S).
   사용:  node scripts/gen-individuals.js --dry   (파싱·카운트만)
          node scripts/gen-individuals.js         (index.html 실제 삽입)
*/
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SPEC = path.join(ROOT, 'docs/superpowers/specs/2026-06-24-species-individual-concepts-design.md');
const HTML = path.join(ROOT, 'index.html');
const DRY = process.argv.includes('--dry');

const TYPE = { '목본':'tree', '화초':'flower', '다육':'cactus', '덩굴':'vine', '버섯':'mushroom' };
const EL   = { '불':'fire', '물':'water', '풀':'grass', '대지':'earth', '바람':'wind', '번개':'bolt', '빙결':'ice' };
const FORM = { '포식':'pred', '무기':'weapon', '독성':'toxic', '용족':'dragon', '일반':'normal' };
const EL_EMOJI = { fire:'🔥', water:'💧', grass:'🌿', earth:'🪨', wind:'🌪️', bolt:'⚡', ice:'❄️' };
const STAT_KO = { atk:'공격', def:'방어', spd:'기동' };

const md = fs.readFileSync(SPEC, 'utf8');

/* ── 효과 텍스트 → 스킬 필드 ── */
function parseEffects(text){
  const t = text.replace(/[−－]/g, '-');
  const o = {};
  let m;
  if((m = t.match(/위력\s*(\d+)/))) { o.power = +m[1]; o.aoe = /광역/.test(t); }
  if((m = t.match(/화상\((\d+)/)))  o.dot = { kind:'burn',   pct:0.06, turns:+m[1] };
  if((m = t.match(/중독\((\d+)/)))  o.dot = { kind:'poison', pct:0.05, turns:+m[1] };
  if((m = t.match(/출혈\((\d+)/)))  o.dot = { kind:'bleed',  pct:0.06, turns:+m[1] };
  if((m = t.match(/흡혈\s*(\d+)\s*%/))) o.lifesteal = +m[1] / 100;
  if((m = t.match(/자신\s*(공격|방어|기동)\s*\+\s*(\d+)\s*%\s*\((\d+)/)))
    o.selfBuff = { stat:({ '공격':'atk','방어':'def','기동':'spd' })[m[1]], pct:+m[2]/100, turns:+m[3] };
  if((m = t.match(/적\s*(공격|방어|기동)\s*-\s*(\d+)\s*%\s*\((\d+)/)))
    o.enemyDebuff = { stat:({ '공격':'atk','방어':'def','기동':'spd' })[m[1]], pct:+m[2]/100, turns:+m[3] };
  if((m = t.match(/체력\s*(\d+)\s*%\s*회복/))) o.heal = +m[1] / 100;
  if(/상태이상 해제/.test(t)) o.cleanse = true;
  if(/에너지\s*\+\s*1/.test(t)) o.energyGain = 1;
  if(/방어\s*관통/.test(t)) o.pierce = 0.5;
  if((m = t.match(/치명\s*\+\s*(\d+)\s*%/))) o.critBonus = +m[1] / 100;
  if((m = t.match(/피해\s*(\d+)\s*%\s*↓/))) o.guardMult = +( (1 - +m[1]/100).toFixed(2) );
  if(/강한\s*(전격\s*)?반격/.test(t)) o.counterPct = 0.35;
  else if(/가시\s*반격/.test(t)) o.counterPct = 0.25;
  return o;
}

function kindOf(o, t){
  if(o.power > 0) return o.lifesteal > 0 ? 'drain' : 'attack';
  if(o.guardMult != null) return 'guard';
  const hasHeal = o.heal > 0, hasBuff = !!o.selfBuff;
  if(hasHeal && hasBuff){           // 둘 다면 텍스트에서 먼저 나온 쪽이 주효과 (base 관례)
    const hi = t.indexOf('회복'), bi = t.indexOf('자신');
    return (bi >= 0 && (bi < hi || hi < 0)) ? 'buff' : 'heal';
  }
  if(hasHeal) return 'heal';
  if(hasBuff) return 'buff';
  if(o.enemyDebuff || o.dot) return 'debuff';
  return 'buff';
}
function iconOf(kind, el){
  if(kind === 'guard') return '🛡️';
  if(kind === 'heal')  return '💚';
  return EL_EMOJI[el] || '🌱';
}
function costOf(stage, o){
  if(stage === 'e') return o.power > 0 ? 3 : 2;
  return 2;
}
function gradeOf(stage, o){
  if(stage === 'g' || stage === 'm') return 'B';
  return (o.power >= 170) ? 'S' : 'A';   // e
}
function descOf(o, kind){
  const segs = [];
  if(o.power > 0){
    let head = `위력${o.power} · ${o.aoe ? '광역' : '단일'}`;
    if(o.lifesteal > 0) head += ` · 피해 ${Math.round(o.lifesteal*100)}% 흡혈`;
    segs.push(head);
  } else if(o.guardMult != null){
    segs.push(`받는 피해 ${Math.round((1-o.guardMult)*100)}%↓`);
  } else if(o.heal > 0){
    segs.push(`체력 ${Math.round(o.heal*100)}% 회복`);
  }
  const riders = [];
  if(o.dot) riders.push(`${({burn:'화상',poison:'중독',bleed:'출혈'})[o.dot.kind]}(${o.dot.turns}턴)`);
  if(o.enemyDebuff) riders.push(`적 ${STAT_KO[o.enemyDebuff.stat]} ${Math.round(o.enemyDebuff.pct*100)}%↓(${o.enemyDebuff.turns}턴)`);
  if(o.selfBuff) riders.push(`자신 ${STAT_KO[o.selfBuff.stat]} ${Math.round(o.selfBuff.pct*100)}%↑(${o.selfBuff.turns}턴)`);
  if(o.pierce) riders.push('방어 관통');
  if(o.critBonus) riders.push(`치명타율 +${Math.round(o.critBonus*100)}%`);
  if(o.counterPct) riders.push(o.counterPct >= 0.35 ? '강한 전격 반격' : '가시 반격');
  if(o.heal > 0 && o.power > 0) riders.push(`체력 ${Math.round(o.heal*100)}% 회복`);
  if(o.cleanse) riders.push('디버프 해제');
  if(o.energyGain) riders.push('⚡+1');
  return segs.concat(riders).join(' + ');
}

/* 스킬 JS 객체 리터럴 문자열 생성 */
function skillJs(id, name, stage, el, effectText){
  const o = parseEffects(effectText);
  const kind = kindOf(o, effectText);
  const fields = [`name:'${name}'`, `icon:'${iconOf(kind,el)}'`, `cost:${costOf(stage,o)}`, `kind:'${kind}'`];
  if(o.power > 0){ fields.push(`power:${o.power}`); fields.push(o.aoe ? 'aoe:true' : 'single:true'); }
  if(o.lifesteal > 0) fields.push(`lifesteal:${o.lifesteal}`);
  if(o.pierce) fields.push(`pierce:${o.pierce}`);
  if(o.critBonus) fields.push(`critBonus:${o.critBonus}`);
  if(o.guardMult != null) fields.push(`guardMult:${o.guardMult}`);
  if(o.counterPct) fields.push(`counterPct:${o.counterPct}`);
  if(o.dot) fields.push(`dot:{kind:'${o.dot.kind}',pct:${o.dot.pct},turns:${o.dot.turns}}`);
  if(o.enemyDebuff) fields.push(`enemyDebuff:{stat:'${o.enemyDebuff.stat}',pct:${o.enemyDebuff.pct},turns:${o.enemyDebuff.turns}}`);
  if(o.selfBuff) fields.push(`selfBuff:{stat:'${o.selfBuff.stat}',pct:${o.selfBuff.pct},turns:${o.selfBuff.turns}}`);
  if(o.heal > 0) fields.push(`heal:${o.heal}`);
  if(o.cleanse) fields.push('cleanse:true');
  if(o.energyGain) fields.push(`energyGain:${o.energyGain}`);
  fields.push(`desc:'${descOf(o,kind)}'`, `tag:'개체'`, `grade:'${gradeOf(stage,o)}'`);
  return `  '${id}': { ${fields.join(', ')} },`;
}

/* 「name」effects 세그먼트 → {name, eff} */
function splitSeg(seg){
  const a = seg.indexOf('」');
  return { name: seg.slice(0, a).trim(), eff: seg.slice(a+1).replace(/\s*\/\s*$/, '').trim() };
}
function threeStages(line){
  const gi = line.indexOf('성장체「'), mi = line.indexOf('성체「'), ei = line.indexOf('완숙체「');
  return {
    g: splitSeg(line.slice(gi + '성장체「'.length, mi)),
    m: splitSeg(line.slice(mi + '성체「'.length, ei)),
    e: splitSeg(line.slice(ei + '완숙체「'.length)),
  };
}

const skillLines = [];   // SKILL_LIB 추가 라인
const catLines = [];     // SPECIES_CATALOG 변이 엔트리
const mushroomEdits = []; // {key, ind} 버섯 stageSkills 패치
const allKeys = new Set();
const lines = md.split(/\r?\n/);

/* ── 1) 버섯 base 7 — 성체/완숙(#29~#35) ── */
let mushSection = false;
for(let i = 0; i < lines.length; i++){
  const ln = lines[i];
  if(/^###\s+#29\b/.test(ln)) mushSection = true;
  if(/^##\s+변이 개체/.test(ln)) mushSection = false;
  if(!mushSection) continue;
  const head = ln.match(/^###\s+#\d+.*?🍄.*?`([a-z_]+)`/);
  if(head){
    const key = head[1];
    // 같은/다음 줄들에서 스킬 라인 찾기
    for(let j = i; j < i + 4 && j < lines.length; j++){
      if(lines[j].includes('성체「') && lines[j].includes('완숙체「')){
        const mi = lines[j].indexOf('성체「'), ei = lines[j].indexOf('완숙체「');
        const m = splitSeg(lines[j].slice(mi + '성체「'.length, ei));
        const e = splitSeg(lines[j].slice(ei + '완숙체「'.length));
        let el = 'grass'; for(const ko in EL){ if(ln.includes(ko)){ el = EL[ko]; break; } }
        skillLines.push(skillJs(`ind.${key}.m`, m.name, 'm', el, m.eff));
        skillLines.push(skillJs(`ind.${key}.e`, e.name, 'e', el, e.eff));
        mushroomEdits.push({ key, el });
        break;
      }
    }
  }
}

/* ── 2) 변이 140 ── */
let inVariant = false, curType = null, curForm = null;
for(let i = 0; i < lines.length; i++){
  const ln = lines[i];
  if(/^##\s+변이 개체 \(확장 로스터/.test(ln)) { inVariant = true; continue; }
  if(/^##\s+변이 어울림 태그/.test(ln)) { inVariant = false; }
  if(!inVariant) continue;

  // 풀매트릭스 섹션 헤더: "### 🌳 목본 × 🦷 포식 (N종 ...)"  (백틱 키 없음, 타입+변이 둘 다 포함)
  const keyOnLine = ln.match(/`([a-z_][a-z0-9_]*)`/);
  if(/^###\s/.test(ln) && ln.includes('×') && !keyOnLine){
    let ft = null, ff = null;
    for(const ko in TYPE) if(ln.includes(ko)) ft = TYPE[ko];
    for(const ko in FORM) if(ln.includes(ko)) ff = FORM[ko];
    if(ft && ff){ curType = ft; curForm = ff; continue; }
  }
  if(!keyOnLine) continue;
  const key = keyOnLine[1];
  // 종 이름
  const nameM = ln.match(/([가-힣A-Za-z0-9]+)\s*\(`[a-z_]/);
  const name = nameM ? nameM[1] : key;

  // 인라인 "타입×속성×변이" (V1~V28)
  let type = curType, form = curForm, el = null;
  const inl = ln.match(/([가-힣]+)×([가-힣]+)×([가-힣]+)/);
  if(inl){ type = TYPE[inl[1]]; el = EL[inl[2]]; form = FORM[inl[3]]; }
  else {
    // 풀매트릭스: 속성은 "· 물 ·" 토큰
    for(const ko in EL){ if(new RegExp('·\\s*'+ko+'\\s*·').test(ln)){ el = EL[ko]; break; } }
  }
  // rarity
  let rarity = /·\s*rare\b/.test(ln) ? 'rare' : (/·\s*common\b/.test(ln) ? 'common' : (form === 'dragon' ? 'rare' : 'common'));

  // 스킬 라인 (다음 몇 줄에서 성장체「…완숙체「 포함)
  let sl = null;
  for(let j = i; j < i + 4 && j < lines.length; j++){
    if(lines[j].includes('성장체「') && lines[j].includes('완숙체「')){ sl = lines[j]; break; }
  }
  if(!type || !el || !form || !sl){ console.error('SKIP(불완전):', key, {type,el,form,hasSkill:!!sl}); continue; }
  if(allKeys.has(key)){ console.error('DUP KEY:', key); continue; }
  allKeys.add(key);

  const st = threeStages(sl);
  skillLines.push(skillJs(`ind.${key}.g`, st.g.name, 'g', el, st.g.eff));
  skillLines.push(skillJs(`ind.${key}.m`, st.m.name, 'm', el, st.m.eff));
  skillLines.push(skillJs(`ind.${key}.e`, st.e.name, 'e', el, st.e.eff));

  const slots = form === 'normal' ? `{ normal:6 }` : `{ ${form}:2, normal:4 }`;
  catLines.push(`  ${key}: { name:'${name}', type:'${type}', element:'${el}', rarity:'${rarity}', released:false, baseVariants:['${form}'], variantSlots:${slots}, stageSkills:{ growing:['ind.${key}.g'], mature:['ind.${key}.m'], evolved:['ind.${key}.e'] } },`);
}

/* ── 리포트 ── */
console.log('버섯 성체/완숙 스킬:', mushroomEdits.length * 2, '(종', mushroomEdits.length + ')');
console.log('변이 종:', catLines.length, '· 변이 스킬:', catLines.length * 3);
console.log('SKILL_LIB 총 추가:', skillLines.length);
console.log('\n--- 샘플 스킬 ---');
console.log(skillLines.slice(0, 3).join('\n'));
console.log(skillLines.slice(-3).join('\n'));
console.log('\n--- 샘플 카탈로그 ---');
console.log(catLines.slice(0, 2).join('\n'));
if(process.env.GREP){ const re = new RegExp(process.env.GREP); console.log('\n--- GREP ---');
  skillLines.concat(catLines).filter(l => re.test(l)).forEach(l => console.log(l)); }

/* 구문 검증: 생성한 블록이 JS로 파싱되는지 */
try {
  new Function('return {' + skillLines.join('\n') + '}')();
  new Function('return {' + catLines.join('\n') + '}')();
  console.log('\n구문 검증: OK');
} catch(e){ console.error('\n구문 에러:', e.message); process.exit(1); }

if(DRY){ console.log('\n[--dry] index.html 미수정.'); process.exit(0); }

/* ── 삽입 ── */
let html = fs.readFileSync(HTML, 'utf8');

// 기존 종 키와 충돌 검사 (grid 배열 ['key',...] / 카탈로그 key: 둘 다)
for(const key of allKeys){
  if(new RegExp("\\['" + key + "'", '').test(html) || new RegExp("\\n\\s+" + key + ":\\s*\\{").test(html)){
    console.error('기존 키와 충돌:', key); process.exit(1);
  }
}

// (a) 버섯 stageSkills 패치
for(const { key } of mushroomEdits){
  const re = new RegExp(`(${key}:[\\s\\S]*?growing:\\['sig\\.[a-z_]+'\\])( \\})`);
  if(!re.test(html)){ console.error('버섯 패치 앵커 실패:', key); process.exit(1); }
  html = html.replace(re, `$1, mature:['ind.${key}.m'], evolved:['ind.${key}.e']$2`);
}

// (b) SKILL_LIB 삽입 (vine_ice.e 블록 뒤, SKILL_LIB 닫기 전)
const skillAnchor = "    desc:'위력140 · 광역 · 피해 35% 흡혈 + 적 기동 25%↓(2턴)', tag:'개체', grade:'A' },";
if(!html.includes(skillAnchor)){ console.error('SKILL 앵커 실패'); process.exit(1); }
const skillBlock = skillAnchor + '\n\n  /* ── 개체 고유: 버섯 성체/완숙 + 변이 140종 (생성: scripts/gen-individuals.js) ── */\n' + skillLines.join('\n');
html = html.replace(skillAnchor, skillBlock);

// (c) SPECIES_CATALOG 삽입 (vine_ice 엔트리 뒤, 카탈로그 닫기 전)
const catAnchor = "  vine_ice:     { rarity:'common', stageSkills:{ growing:['ind.vine_ice.g'],     mature:['ind.vine_ice.m'],     evolved:['ind.vine_ice.e']     } },";
if(!html.includes(catAnchor)){ console.error('CATALOG 앵커 실패'); process.exit(1); }
const catBlock = catAnchor + '\n  // ── 변이 개체 140종 (태생 변이 고정·released:false, 생성: scripts/gen-individuals.js) ──\n' + catLines.join('\n');
html = html.replace(catAnchor, catBlock);

fs.writeFileSync(HTML, html, 'utf8');
console.log('\nindex.html 삽입 완료.');
