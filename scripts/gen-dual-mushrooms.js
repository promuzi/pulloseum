/* 이중 변이 버섯 생성기 — 멱등. index.html 의 마커 블록
   __DUAL_MUSHROOM_SKILLS_*  /  __DUAL_MUSHROOM_SPECIES_*  를 교체한다.
   4 두번째변이(독/균사/갓/룡) × 7속성 = 28종. baseVariants:['spore', X], 버섯 저스탯 유지.
   사용:  node scripts/gen-dual-mushrooms.js --dry   (카운트·샘플만)
          node scripts/gen-dual-mushrooms.js          (index.html 주입)
   주의: 주입 직후 반드시 브라우저 __catalogSelfTest() 반환값으로 검증(직렬화 깨지면 JS 전체 정지). */
const fs = require('fs');
const path = require('path');
const HTML = path.join(__dirname, '..', 'index.html');
const DRY = process.argv.includes('--dry');

const ELS = ['fire','water','grass','earth','wind','bolt','ice'];
const EL_KO = { fire:'불', water:'물', grass:'풀', earth:'대지', wind:'바람', bolt:'번개', ice:'서리' };
const EL_ICON = { fire:'🔥', water:'💧', grass:'🌿', earth:'🪨', wind:'🌪️', bolt:'⚡', ice:'❄️' };
const NAME_BASE = { fire:'이그니', water:'미스트', grass:'스포어', earth:'트러플', wind:'윈드', bolt:'볼트', ice:'프로스트' };
const BREATH_DOT = { fire:'burn', ice:'bleed', water:'poison', grass:'poison', earth:'poison', wind:'poison', bolt:'poison' };

/* 두 번째 변이별: form, 희귀도, 이름 토큰, 단계 스킬 빌더(el→skill obj). 버섯 컨셉=포자 베이스 + 변이 메커니즘. */
const VAR = {
  tox: { form:'toxic', rarity:'common', tok:'독',
    s: el => ({ name:EL_KO[el]+' 독 홀씨', icon:'☠️', cost:1, kind:'attack', power:45, single:true, dot:{kind:'poison',pct:0.04,turns:2}, desc:'위력45 · 단일 + 약중독(2턴) · 저비용', tag:'개체', grade:'B' }),
    j: el => ({ name:EL_KO[el]+' 독포자 살포', icon:'☠️', cost:2, kind:'attack', power:60, single:true, dot:{kind:'poison',pct:0.05,turns:3}, desc:'위력60 · 단일 + 중독(3턴)', tag:'개체', grade:'B' }),
    g: el => ({ name:EL_KO[el]+' 독포자', icon:'☠️', cost:2, kind:'attack', power:75, single:true, dot:{kind:'poison',pct:0.05,turns:3}, desc:'위력75 · 단일 + 중독(3턴)', tag:'개체', grade:'B' }),
    m: el => ({ name:EL_KO[el]+' 부식 포자', icon:'☠️', cost:2, kind:'attack', power:85, single:true, dot:{kind:'poison',pct:0.05,turns:3}, enemyDebuff:{stat:'def',pct:0.15,turns:2}, desc:'위력85 · 단일 + 중독(3턴) + 적 방어 15%↓(2턴)', tag:'개체', grade:'B' }),
    e: el => ({ name:EL_KO[el]+' 부식 만개', icon:'☠️', cost:3, kind:'attack', power:120, aoe:true, dot:{kind:'poison',pct:0.06,turns:3}, enemyDebuff:{stat:'def',pct:0.2,turns:2}, desc:'위력120 · 광역 + 강중독(3턴) + 적 방어 20%↓(2턴)', tag:'개체', grade:'A' }) },
  pred: { form:'pred', rarity:'common', tok:'균사',
    s: el => ({ name:EL_KO[el]+' 홀씨 흡수', icon:'🦷', cost:1, kind:'drain', power:45, single:true, lifesteal:0.3, desc:'위력45 · 단일 · 피해 30% 흡혈 · 저비용', tag:'개체', grade:'B' }),
    j: el => ({ name:EL_KO[el]+' 미세 균사', icon:'🦷', cost:2, kind:'drain', power:65, single:true, lifesteal:0.35, desc:'위력65 · 단일 · 피해 35% 흡혈', tag:'개체', grade:'B' }),
    g: el => ({ name:EL_KO[el]+' 흡수 균사', icon:'🦷', cost:2, kind:'drain', power:80, single:true, lifesteal:0.35, desc:'위력80 · 단일 · 피해 35% 흡혈', tag:'개체', grade:'B' }),
    m: el => ({ name:EL_KO[el]+' 균사 포식', icon:'🦷', cost:2, kind:'drain', power:90, single:true, lifesteal:0.5, desc:'위력90 · 단일 · 피해 50% 흡혈', tag:'개체', grade:'B' }),
    e: el => ({ name:EL_KO[el]+' 대균사 포식', icon:'🦷', cost:3, kind:'drain', power:120, single:true, lifesteal:0.6, dot:{kind:'poison',pct:0.05,turns:2}, desc:'위력120 · 단일 · 60% 흡혈 + 중독(2턴)', tag:'개체', grade:'A' }) },
  wpn: { form:'weapon', rarity:'common', tok:'갓',
    s: el => ({ name:EL_KO[el]+' 홀씨 가시', icon:'🗡️', cost:1, kind:'attack', power:50, single:true, pierce:0.5, desc:'위력50 · 단일 + 방어 50% 관통 · 저비용', tag:'개체', grade:'B' }),
    j: el => ({ name:EL_KO[el]+' 갓 찌르기', icon:'🗡️', cost:2, kind:'attack', power:70, single:true, pierce:0.5, desc:'위력70 · 단일 + 방어 50% 관통', tag:'개체', grade:'B' }),
    g: el => ({ name:EL_KO[el]+' 갓 가시', icon:'🗡️', cost:2, kind:'attack', power:90, single:true, pierce:0.5, desc:'위력90 · 단일 + 방어 50% 관통', tag:'개체', grade:'B' }),
    m: el => ({ name:EL_KO[el]+' 균각 베기', icon:'🗡️', cost:2, kind:'attack', power:100, single:true, pierce:0.5, desc:'위력100 · 단일 + 방어 50% 관통', tag:'개체', grade:'B' }),
    e: el => ({ name:EL_KO[el]+' 균각 강타', icon:'🗡️', cost:3, kind:'attack', power:135, aoe:true, pierce:0.5, critBonus:0.15, desc:'위력135 · 광역 + 관통 + 치명타율 +15%', tag:'개체', grade:'A' }) },
  drg: { form:'dragon', rarity:'rare', tok:'룡',
    s: el => ({ name:EL_KO[el]+' 포자 홀씨', icon:'🐉', cost:1, kind:'attack', power:45, single:true, dot:{kind:BREATH_DOT[el],pct:0.04,turns:2}, desc:'위력45 · 단일 + 지속피해(2턴) · 저비용', tag:'개체', grade:'B' }),
    j: el => ({ name:EL_KO[el]+' 포자 숨 고르기', icon:'🐉', cost:1, kind:'buff', breathCharge:{atkPct:0.12,cap:4}, energyGain:1, desc:'브레스 충전(공격 누적↑) + ⚡1 · 저비용', tag:'개체' }),
    g: el => ({ name:EL_KO[el]+' 포자 모으기', icon:'🐉', cost:2, kind:'buff', breathCharge:{atkPct:0.18,cap:4}, selfBuff:{stat:'def',pct:0.15,turns:3}, desc:'브레스 충전 + 자신 방어 15%↑(3턴)', tag:'개체' }),
    m: el => ({ name:EL_KO[el]+' 포자 브레스', icon:'🐲', cost:3, kind:'attack', power:115, single:true, breathScale:true, dot:{kind:BREATH_DOT[el],pct:0.05,turns:3}, desc:'위력115(브레스 충전 비례↑·소비) · 단일 + 지속피해(3턴)', tag:'개체', grade:'A' }),
    e: el => ({ name:EL_KO[el]+' 대포자 브레스', icon:'🐲', cost:3, kind:'attack', power:135, aoe:true, breathScale:true, dot:{kind:'poison',pct:0.05,turns:3}, desc:'위력135(충전 비례↑·소비) · 광역 + 중독(3턴)', tag:'개체', grade:'A' }) },
};

/* 재귀 직렬화 — 배열-of-객체 안전, 키는 무인용(JS 식별자), 문자열은 JSON 인용 */
function ser(o){
  if(Array.isArray(o)) return '[' + o.map(ser).join(',') + ']';
  if(o && typeof o === 'object') return '{' + Object.keys(o).map(k => k + ':' + ser(o[k])).join(', ') + '}';
  if(typeof o === 'string') return JSON.stringify(o);
  return String(o);
}

const skillLines = [], speciesLines = [];
let nSkills = 0;
Object.keys(VAR).forEach(v => {
  const V = VAR[v];
  ELS.forEach(el => {
    const key = `spore_${v}_${el}`;
    const ind = `ind.${key}`;
    const isDr = (v === 'drg');
    // 스킬 정의 (새싹 s · 유체 j · 성장체 g · 성체 m · 완숙체 e — 개체별 고유)
    skillLines.push(`  '${ind}.s': ${ser(V.s(el))},`); nSkills++;
    skillLines.push(`  '${ind}.j': ${ser(V.j(el))},`); nSkills++;
    skillLines.push(`  '${ind}.g': ${ser(V.g(el))},`); nSkills++;
    skillLines.push(`  '${ind}.m': ${ser(V.m(el))},`); nSkills++;
    skillLines.push(`  '${ind}.e': ${ser(V.e(el))},`); nSkills++;
    // 단계 스킬 매핑 — 전 단계 개체 고유(다른 개체처럼)
    const stage = {
      sprout: [`${ind}.s`],
      juvenile: [`${ind}.j`],
      growing: [`${ind}.g`],
      mature: [`${ind}.m`],
      evolved: [`${ind}.e`],
    };
    const slots = {}; slots.spore = 1; slots[V.form] = 1; slots.normal = 3;
    const sp = {
      name: NAME_BASE[el] + V.tok, type: 'mushroom', element: el, rarity: V.rarity, released: false,
      baseVariants: ['spore', V.form], variantSlots: slots, signatures: [], stageSkills: stage,
    };
    speciesLines.push(`  ${key}: ${ser(sp)},`);
  });
});

function replaceBlock(html, start, end, body){
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(' + esc(start) + ')[\\s\\S]*?(' + esc(end) + ')');
  if(!re.test(html)) throw new Error('marker not found: ' + start);
  return html.replace(re, '$1\n' + body + '\n  $2');
}

let html = fs.readFileSync(HTML, 'utf8');
html = replaceBlock(html, '/* __DUAL_MUSHROOM_SKILLS_START__ */', '/* __DUAL_MUSHROOM_SKILLS_END__ */', skillLines.join('\n'));
html = replaceBlock(html, '/* __DUAL_MUSHROOM_SPECIES_START__ */', '/* __DUAL_MUSHROOM_SPECIES_END__ */', speciesLines.join('\n'));

console.log('species:', speciesLines.length, ' skills:', nSkills);
if(DRY){
  console.log('--- sample species ---\n' + speciesLines[0]);
  console.log('--- sample skill ---\n' + skillLines[0]);
  console.log('(dry run — not written)');
} else {
  fs.writeFileSync(HTML, html);
  console.log('written to index.html');
}
