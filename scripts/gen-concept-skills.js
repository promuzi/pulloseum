/* 컨셉 스킬 벌크 생성기 (#1-A 콘텐츠) — 설계: docs/.../2026-06-26-individual-concept-skill-expansion-design.md
   130 비버섯 변이 개체(배치1·2 손작업 10개 제외)에 단계별 컨셉 스킬(s/j/g2/m2)을 찍어
   index.html 의 마커 블록(__CONCEPT_GEN__)에 멱등 주입한다.
   패턴 = 폼별 메커니즘(포식 흡혈·무기 속성부여·독성 독증폭·용족 브레스충전) × 14성격 효과경향 × 단계별 역할(견제/셋업/대박).
   주의: 손작업 배치1·2(CONCEPT_BATCH1/2_SKILLS)와 버섯은 건드리지 않는다. 큐레이션은 이후 손으로.
   사용:  node scripts/gen-concept-skills.js --dry   (카운트만)
          node scripts/gen-concept-skills.js          (index.html 주입) */
const fs = require('fs');
const path = require('path');
const HTML = path.join(__dirname, '..', 'index.html');
const DRY = process.argv.includes('--dry');

// [key, type, el, form, archetype] — 게임에서 덤프(2026-06-26). 손작업 10개·버섯 제외.
const LIST = [
["carno_oak","tree","fire","pred","phantom"],["venom_weed","vine","grass","toxic","strategist"],["draco_oak","tree","bolt","dragon","executioner"],["grand_mangro","tree","water","normal","tyrant"],["world_tree","tree","grass","normal","tyrant"],["armor_oak","tree","earth","weapon","trickster"],["blade_wood","tree","wind","weapon","glutton"],["tox_berry","tree","ice","toxic","glutton"],["poison_rose","flower","grass","toxic","stalwart"],["clay_guard","flower","earth","weapon","guardian"],["petal_blade","flower","wind","weapon","executioner"],["draca_spark","flower","bolt","dragon","executioner"],["tox_frost","flower","ice","toxic","glutton"],["spike_cactus","cactus","fire","weapon","hermit"],["hydra_cactus","cactus","water","normal","glutton"],["tox_cactus","cactus","grass","toxic","guardian"],["rock_fortress","cactus","earth","weapon","glutton"],["needle_cactus","cactus","wind","weapon","executioner"],["draca_volt","cactus","bolt","dragon","trickster"],["venom_frost","cactus","ice","toxic","glutton"],["carni_vine","vine","fire","pred","stalwart"],["leech_vine","vine","water","pred","stalwart"],["root_eater","vine","earth","pred","feral"],["wind_ripper","vine","wind","pred","phantom"],["draca_vine","vine","bolt","dragon","glutton"],["tox_vine","vine","ice","toxic","hermit"],["maneater_wood","tree","water","pred","strategist"],["devour_tree","tree","grass","pred","warlord"],["grave_rock","tree","earth","pred","tyrant"],["leaf_eater","tree","wind","pred","glutton"],["volt_eater","tree","bolt","pred","tyrant"],["frost_maw","tree","ice","pred","zealot"],["ember_halberd","tree","fire","weapon","glutton"],["tide_shield","tree","water","weapon","feral"],["elder_glaive","tree","grass","weapon","executioner"],["thunder_lance","tree","bolt","weapon","warlord"],["frost_mace","tree","ice","weapon","phantom"],["blight_oak","tree","fire","toxic","stalwart"],["tox_mangro","tree","water","toxic","warlord"],["poison_elder","tree","grass","toxic","trickster"],["tox_rock","tree","earth","toxic","tyrant"],["spore_gale","tree","wind","toxic","trickster"],["tox_volt","tree","bolt","toxic","strategist"],["igni_drake","tree","fire","dragon","executioner"],["hy_drake","tree","water","dragon","guardian"],["elder_drake","tree","grass","dragon","hermit"],["drake_rock","tree","earth","dragon","tyrant"],["wind_drake","tree","wind","dragon","sage"],["frost_drake","tree","ice","dragon","stalwart"],["ember_heart","tree","fire","normal","stalwart"],["granite_oak","tree","earth","normal","feral"],["breeze_wood","tree","wind","normal","guardian"],["dynamo_oak","tree","bolt","normal","glutton"],["ever_frost","tree","ice","normal","trickster"],["blood_rose","flower","grass","pred","hermit"],["mimic_bloom","flower","earth","pred","tyrant"],["glide_trap","flower","wind","pred","guardian"],["shock_trap","flower","bolt","pred","stalwart"],["frost_trap","flower","ice","pred","sage"],["rose_blade","flower","grass","weapon","warlord"],["spark_edge","flower","bolt","weapon","executioner"],["frost_edge","flower","ice","weapon","stalwart"],["swamp_bloom","flower","earth","toxic","stalwart"],["spore_wing","flower","wind","toxic","strategist"],["tox_spark","flower","bolt","toxic","tyrant"],["draca_rose","flower","grass","dragon","trickster"],["draca_clay","flower","earth","dragon","strategist"],["draca_petal","flower","wind","dragon","sage"],["draca_frost","flower","ice","dragon","hermit"],["garden_rose","flower","grass","normal","trickster"],["terra_bloom","flower","earth","normal","zealot"],["aero_petal","flower","wind","normal","hermit"],["dynamo_bloom","flower","bolt","normal","feral"],["ever_bloom","flower","ice","normal","hermit"],["sand_reaper","cactus","fire","pred","glutton"],["leech_cactus","cactus","water","pred","strategist"],["parasite_cactus","cactus","grass","pred","berserk"],["gluttony_rock","cactus","earth","pred","stalwart"],["dust_reaper","cactus","wind","pred","zealot"],["volt_reaper","cactus","bolt","pred","trickster"],["frost_reaper","cactus","ice","pred","stalwart"],["coral_cactus","cactus","water","weapon","executioner"],["spear_cactus","cactus","grass","weapon","phantom"],["lance_cactus","cactus","bolt","weapon","berserk"],["spike_frost","cactus","ice","weapon","tyrant"],["acid_cactus","cactus","fire","toxic","tyrant"],["poison_dew","cactus","water","toxic","berserk"],["tox_gaia","cactus","earth","toxic","stalwart"],["poison_gale","cactus","wind","toxic","feral"],["acid_volt","cactus","bolt","toxic","trickster"],["draca_ember","cactus","fire","dragon","berserk"],["draca_dew","cactus","water","dragon","feral"],["draca_viri","cactus","grass","dragon","stalwart"],["draca_gaia","cactus","earth","dragon","sage"],["draca_gale","cactus","wind","dragon","trickster"],["frost_wyvern","cactus","ice","dragon","glutton"],["sunfire_cactus","cactus","fire","normal","sage"],["green_cactus","cactus","grass","normal","trickster"],["terra_cactus","cactus","earth","normal","glutton"],["breeze_cactus","cactus","wind","normal","tyrant"],["dynamo_cactus","cactus","bolt","normal","stalwart"],["ever_cactus","cactus","ice","normal","zealot"],["blood_weed","vine","grass","pred","stalwart"],["volt_leech","vine","bolt","pred","trickster"],["frost_leech","vine","ice","pred","warlord"],["whip_vine","vine","fire","weapon","tyrant"],["kelp_whip","vine","water","weapon","tyrant"],["thorn_whip","vine","grass","weapon","sage"],["root_club","vine","earth","weapon","guardian"],["wind_whip","vine","wind","weapon","berserk"],["volt_whip","vine","bolt","weapon","zealot"],["frost_whip","vine","ice","weapon","strategist"],["blight_vine","vine","fire","toxic","trickster"],["tox_kelp","vine","water","toxic","warlord"],["swamp_vine","vine","earth","toxic","trickster"],["spore_vine","vine","wind","toxic","feral"],["acid_vine","vine","bolt","toxic","hermit"],["draca_flame","vine","fire","dragon","guardian"],["draca_tide","vine","water","dragon","stalwart"],["draca_thorn","vine","grass","dragon","guardian"],["draca_root","vine","earth","dragon","feral"],["draca_wind","vine","wind","dragon","warlord"],["draca_glace","vine","ice","dragon","feral"],["glow_vine","vine","fire","normal","sage"],["kelp_vine","vine","water","normal","berserk"],["green_vine","vine","grass","normal","sage"],["terra_vine","vine","earth","normal","guardian"],["aero_vine","vine","wind","normal","hermit"],["dynamo_vine","vine","bolt","normal","executioner"],["ever_vine","vine","ice","normal","tyrant"]
];

const EL = {
  fire:{w:'불꽃',i:'🔥'}, water:{w:'물살',i:'💧'}, grass:{w:'덩굴',i:'🌿'},
  earth:{w:'바위',i:'🪨'}, wind:{w:'질풍',i:'🌪️'}, bolt:{w:'번개',i:'⚡'}, ice:{w:'서리',i:'❄️'}
};
const STAT = { atk:'공격', def:'방어', spd:'기동', acc:'적중' };
const DOTW = { bleed:'출혈', burn:'화상', poison:'중독' };
// 14성격 효과 경향(설계 표). atk/set=이름 noun, 나머지=효과 라이더.
const ARCHE = {
  berserk:    { atk:'난타',   set:'광기',     dot:'bleed' },
  executioner:{ atk:'처형',   set:'조준',     dot:'bleed', crit:0.18 },
  feral:      { atk:'할퀴기', set:'사냥본능', dot:'bleed', finSelf:{stat:'spd',pct:0.15} },
  sage:       { atk:'일점',   set:'기 모으기',crit:0.25 },
  trickster:  { atk:'교란',   set:'연막',     eDeb:{stat:'spd',pct:0.2}, crit:0.15 },
  phantom:    { atk:'환영격', set:'잔상',     eDeb:{stat:'acc',pct:0.2}, finSelf:{stat:'spd',pct:0.15} },
  guardian:   { atk:'방패치기',set:'결계',    guard:true, counter:0.3 },
  stalwart:   { atk:'내려치기',set:'버팀',    guard:true, counter:0.35, finSelf:{stat:'def',pct:0.15} },
  strategist: { atk:'함정',   set:'포진',     eDeb:{stat:'def',pct:0.2}, finSelf:{stat:'atk',pct:0.12} },
  tyrant:     { atk:'군림',   set:'위압',     eDeb:{stat:'atk',pct:0.2} },
  warlord:    { atk:'돌파',   set:'진군',     finSelf:{stat:'atk',pct:0.15} },
  hermit:     { atk:'점혈',   set:'인내',     heal:0.18, finSelf:{stat:'spd',pct:0.15} },
  zealot:     { atk:'돌격',   set:'광신',     dot:'burn', finSelf:{stat:'atk',pct:0.15} },
  glutton:    { atk:'탐식',   set:'아귀',     energyDrain:2 },
};

function dotObj(kind, turns){ return { kind, pct: kind==='poison'?0.05:0.06, turns }; }
function descOf(parts){ return parts.join(' + '); }

// 공격 스킬 + 성격 라이더(견제 mid / 대박 fin)
function atkSkill(name, icon, cost, power, A, role){
  const o = { name, icon, cost, kind:'attack', power, single:true, tag:'개체' };
  const p = ['위력'+power+' · 단일'];
  if(A.dot){ o.dot = dotObj(A.dot, 3); p.push(DOTW[A.dot]+'(3턴)'); }
  if(A.crit){ o.critBonus = A.crit; p.push('치명타율 +'+Math.round(A.crit*100)+'%'); }
  if(A.eDeb){ o.enemyDebuff = { stat:A.eDeb.stat, pct:A.eDeb.pct, turns:2 }; p.push('적 '+STAT[A.eDeb.stat]+' '+Math.round(A.eDeb.pct*100)+'%↓(2턴)'); }
  if(A.energyDrain){ o.energyDrain = A.energyDrain; p.push('적 에너지 '+A.energyDrain+' 흡수'); }
  if(role==='fin' && A.finSelf){ o.selfBuff = { stat:A.finSelf.stat, pct:A.finSelf.pct, turns:3 }; p.push('자신 '+STAT[A.finSelf.stat]+' '+Math.round(A.finSelf.pct*100)+'%↑(3턴)'); }
  o.desc = descOf(p);
  return o;
}

// 성격별 g2 셋업 스킬
function setupSkill(w, E, A){
  if(A.guard) return { name:w+' '+A.set, icon:'🛡️', cost:2, kind:'guard', guardMult:0.5, counterPct:A.counter||0.3, desc:'받는 피해 50%↓ + 가시 반격', tag:'개체' };
  if(A.heal)  return { name:w+' '+A.set, icon:'💚', cost:2, kind:'heal', heal:A.heal, selfBuff:{stat:'spd',pct:0.15,turns:3}, desc:'체력 '+Math.round(A.heal*100)+'% 회복 + 자신 기동 15%↑(3턴) · 지구전', tag:'개체' };
  if(A.energyDrain) return { name:w+' '+A.set, icon:'🌀', cost:2, kind:'attack', power:95, single:true, energyDrain:A.energyDrain, desc:'위력95 · 단일 + 적 에너지 '+A.energyDrain+' 흡수', tag:'개체' };
  if(A.eDeb)  return { name:w+' '+A.set, icon:'🥀', cost:2, kind:'debuff', power:80, single:true, enemyDebuff:{stat:A.eDeb.stat,pct:A.eDeb.pct,turns:2}, desc:'위력80 · 단일 + 적 '+STAT[A.eDeb.stat]+' '+Math.round(A.eDeb.pct*100)+'%↓(2턴)', tag:'개체' };
  if(A.finSelf) return { name:w+' '+A.set, icon:'😤', cost:1, kind:'buff', selfBuff:{stat:A.finSelf.stat,pct:A.finSelf.pct,turns:3}, energyGain:1, desc:'자신 '+STAT[A.finSelf.stat]+' '+Math.round(A.finSelf.pct*100)+'%↑(3턴) + ⚡1 · 셋업', tag:'개체' };
  // 셋업 없는 성격(sage/executioner/berserk) → 강한 단일 공격
  return atkSkill(w+' '+A.set, E.i, 2, 100, A, 'mid');
}

function genIndividual(key, type, el, form, arche){
  const E = EL[el], A = ARCHE[arche], w = E.w;
  const S = {};
  // s 새싹: 저비용. 방어형은 가드, 그 외 싼 견제.
  S.s = A.guard ? { name:w+' 비늘 세우기', icon:'🛡️', cost:1, kind:'guard', guardMult:0.6, desc:'받는 피해 40%↓ · 저비용 방어', tag:'개체' }
                : { name:w+' '+A.atk+' 잔타', icon:E.i, cost:1, kind:'attack', power:55, single:true, desc:'위력55 · 단일 · 저비용 견제', tag:'개체' };
  // j 유체: 성격 라이더 단일 공격
  S.j = atkSkill(w+' '+A.atk, E.i, 2, 85, A, 'mid');
  // g2 성장체: 성격 셋업
  S.g2 = setupSkill(w, E, A);
  // m2 성체: 대박 피니셔
  S.m2 = atkSkill(w+' '+A.atk+' 비기', E.i, 3, 140, A, 'fin');
  // ── 폼 메커니즘 오버라이드(1~2칸) ──
  if(form==='pred'){
    const o = { name:w+' 포식', icon:'🦷', cost:3, kind:'drain', power:130, single:true, lifesteal:0.4, tag:'개체' };
    const p = ['위력130 · 단일 · 피해 40% 흡혈'];
    if(A.dot){ o.dot = dotObj(A.dot,3); p.push(DOTW[A.dot]+'(3턴)'); }
    o.desc = descOf(p); S.m2 = o;
  } else if(form==='weapon'){
    S.s = { name:w+' 벼리기', icon:'✨', cost:1, kind:'buff', infuse:{kind:'element',pct:0.4,turns:3}, desc:'3턴간 공격에 '+w+' 속성 추가피해(무기 부여) · 셋업', tag:'개체' };
    S.m2.infuse = { kind:'element', pct:0.5, turns:2 }; S.m2.desc += ' + 속성 부여(2턴)';
  } else if(form==='toxic'){
    S.s  = { name:w+' 독안개', icon:'☠️', cost:1, kind:'debuff', dot:dotObj('poison',3), desc:'중독(3턴) · 저비용 견제', tag:'개체' };
    S.g2 = { name:w+' 맹독 코팅', icon:'🧪', cost:2, kind:'buff', poisonAmp:{mult:1.5,turns:3}, energyGain:1, desc:'3턴간 자기 독 위력 50%↑ + ⚡1 · 독 증폭', tag:'개체' };
  } else if(form==='dragon'){
    S.j  = { name:w+' 숨 고르기', icon:'🐉', cost:1, kind:'buff', breathCharge:{atkPct:0.12,cap:4}, energyGain:1, desc:'브레스 충전(공격 누적↑) + ⚡1 · 저비용', tag:'개체' };
    const bd = A.dot || 'burn';
    S.m2 = { name:w+' 브레스', icon:'🐲', cost:3, kind:'attack', power:120, single:true, breathScale:true, dot:dotObj(bd,3), desc:'위력120(브레스 충전 비례↑·소비) · 단일 + '+DOTW[bd]+'(3턴)', tag:'개체' };
  }
  return S;
}

/* ===== base 28(폼·성격 없음) + 버섯 7(포자) — 속성+타입 중심 템플릿 ===== */
const ELSIG = { fire:'burn', water:'wet', grass:'regen', earth:'pierce', wind:'flurry', bolt:'shock', ice:'freeze' };
const SIGW  = { burn:'화상', wet:'젖음', regen:'재생', pierce:'관통', flurry:'연속타', shock:'감전', freeze:'빙결' };
// 타입 성향(목본=탱킹/화초=지원/다육=반격/덩굴=견제)
const TYPE_TEND = { tree:'결계', flower:'개화', cactus:'가시', vine:'옭아매기' };
const BASE_LIST = [
["tree_fire","tree","fire"],["tree_water","tree","water"],["tree_grass","tree","grass"],["tree_earth","tree","earth"],["tree_wind","tree","wind"],["tree_bolt","tree","bolt"],["frost","tree","ice"],
["flower_fire","flower","fire"],["aqua","flower","water"],["flower_grass","flower","grass"],["flower_earth","flower","earth"],["flower_wind","flower","wind"],["spark","flower","bolt"],["flower_ice","flower","ice"],
["cactus_fire","cactus","fire"],["cactus_water","cactus","water"],["cactus_grass","cactus","grass"],["gaia","cactus","earth"],["cactus_wind","cactus","wind"],["cactus_bolt","cactus","bolt"],["cactus_ice","cactus","ice"],
["vine_fire","vine","fire"],["vine_water","vine","water"],["thorn","vine","grass"],["vine_earth","vine","earth"],["vine_wind","vine","wind"],["vine_bolt","vine","bolt"],["vine_ice","vine","ice"]
];
const MUSH_LIST = [["spore_cap","grass"],["spore_fire","fire"],["spore_water","water"],["spore_earth","earth"],["spore_wind","wind"],["spore_bolt","bolt"],["spore_ice","ice"]];

function genBase(key, type, el){
  const E = EL[el], w = E.w, sig = ELSIG[el], set = TYPE_TEND[type];
  const S = {};
  S.s = { name:w+' 새순', icon:E.i, cost:1, kind:'attack', power:55, single:true, desc:'위력55 · 단일 · 저비용 견제', tag:'개체' };
  S.j = { name:w+' 일격', icon:E.i, cost:2, kind:'attack', power:90, single:true, signature:sig, desc:'위력90 · 단일 + '+SIGW[sig]+'(속성 성질)', tag:'개체' };
  if(type==='flower')      S.g2 = { name:w+' '+set, icon:'💚', cost:2, kind:'heal', heal:0.2, selfBuff:{stat:'atk',pct:0.12,turns:3}, desc:'체력 20% 회복 + 자신 공격 12%↑(3턴)', tag:'개체' };
  else if(type==='vine')   S.g2 = { name:w+' '+set, icon:'🥀', cost:2, kind:'debuff', power:80, single:true, enemyDebuff:{stat:'spd',pct:0.2,turns:2}, desc:'위력80 · 단일 + 적 기동 20%↓(2턴)', tag:'개체' };
  else                     S.g2 = { name:w+' '+set, icon:'🛡️', cost:2, kind:'guard', guardMult:0.5, counterPct:0.25, desc:'받는 피해 50%↓ + 가시 반격', tag:'개체' }; // tree/cactus
  const m = { name:w+' 비기', icon:E.i, cost:3, kind:'attack', power:140, single:true, tag:'개체' };
  const p = ['위력140 · 단일'];
  if(type==='tree'||type==='cactus'){ m.selfBuff={stat:'def',pct:0.15,turns:3}; p.push('자신 방어 15%↑(3턴)'); }
  else if(type==='flower'){ m.heal=0.1; p.push('체력 10% 회복'); }
  else { m.enemyDebuff={stat:'spd',pct:0.2,turns:2}; p.push('적 기동 20%↓(2턴)'); }
  m.desc = descOf(p); S.m2 = m;
  return S;
}

function genMush(key, el){
  const E = EL[el], w = E.w, sig = ELSIG[el];
  return {
    s:  { name:'포자 살포',   icon:'☠️', cost:1, kind:'debuff', dot:dotObj('poison',3), desc:'중독(3턴) · 저비용 견제', tag:'개체' },
    j:  { name:w+' 홀씨 일격', icon:E.i, cost:2, kind:'attack', power:75, single:true, signature:sig, desc:'위력75 · 단일 + '+SIGW[sig]+'(속성 성질)', tag:'개체' },
    g2: { name:'포자 증폭',   icon:'🧪', cost:2, kind:'buff', poisonAmp:{mult:1.4,turns:3}, energyGain:1, desc:'3턴간 자기 독 위력 40%↑ + ⚡1 · 포자 증폭', tag:'개체' },
    m2: { name:'포자 폭발',   icon:'💥', cost:3, kind:'attack', power:110, aoe:true, dot:dotObj('poison',3), desc:'위력110 · 광역 + 중독(3턴)', tag:'개체' }
  };
}

// ── 직렬화 ──
function ser(o){
  const parts = [];
  for(const k in o){ const v = o[k];
    if(v === undefined) continue;
    if(typeof v === 'string') parts.push(k+":'"+v.replace(/'/g,"\\'")+"'");
    else if(typeof v === 'number' || typeof v === 'boolean') parts.push(k+':'+v);
    else if(typeof v === 'object'){ const sub=[]; for(const kk in v){ sub.push(kk+':'+(typeof v[kk]==='string'?"'"+v[kk]+"'":v[kk])); } parts.push(k+':{'+sub.join(',')+'}'); }
  }
  return '{ '+parts.join(', ')+' }';
}

const skillLines = [], stageLines = [];
let nSkills = 0;
LIST.forEach(([key,type,el,form,arche]) => {
  const S = genIndividual(key, type, el, form, arche);
  ['s','j','g2','m2'].forEach(st => { skillLines.push("  'ind."+key+"."+st+"': "+ser(S[st])+","); nSkills++; });
  stageLines.push("  "+key+":{sprout:['ind."+key+".s'],juvenile:['ind."+key+".j'],growing:['ind."+key+".g2'],mature:['ind."+key+".m2']},");
});
BASE_LIST.forEach(([key,type,el]) => {
  const S = genBase(key, type, el);
  ['s','j','g2','m2'].forEach(st => { skillLines.push("  'ind."+key+"."+st+"': "+ser(S[st])+","); nSkills++; });
  stageLines.push("  "+key+":{sprout:['ind."+key+".s'],juvenile:['ind."+key+".j'],growing:['ind."+key+".g2'],mature:['ind."+key+".m2']},");
});
MUSH_LIST.forEach(([key,el]) => {
  const S = genMush(key, el);
  ['s','j','g2','m2'].forEach(st => { skillLines.push("  'ind."+key+"."+st+"': "+ser(S[st])+","); nSkills++; });
  stageLines.push("  "+key+":{sprout:['ind."+key+".s'],juvenile:['ind."+key+".j'],growing:['ind."+key+".g2'],mature:['ind."+key+".m2']},");
});

const block =
"/*__CONCEPT_GEN_START__ (auto: scripts/gen-concept-skills.js — 손수정 금지·재생성으로 갱신) */\n" +
"const CONCEPT_GEN_SKILLS = {\n" + skillLines.join("\n") + "\n};\n" +
"Object.assign(ALL_SKILLS, CONCEPT_GEN_SKILLS);\n" +
"const CONCEPT_GEN_STAGES = {\n" + stageLines.join("\n") + "\n};\n" +
"Object.keys(CONCEPT_GEN_STAGES).forEach(function(k){ var c=SPECIES_CATALOG[k]; if(!c||!c.stageSkills) return; var add=CONCEPT_GEN_STAGES[k]; Object.keys(add).forEach(function(st){ var cur=c.stageSkills[st]||[]; add[st].forEach(function(id){ if(cur.indexOf(id)<0) cur.push(id); }); c.stageSkills[st]=cur; }); });\n" +
"/*__CONCEPT_GEN_END__*/";

console.log('개체 '+(LIST.length+BASE_LIST.length+MUSH_LIST.length)+'(변이 '+LIST.length+'+base '+BASE_LIST.length+'+버섯 '+MUSH_LIST.length+') · 스킬 '+nSkills);
if(DRY){ console.log('--dry: 주입 생략'); process.exit(0); }

let html = fs.readFileSync(HTML, 'utf8');
const startMark = '/*__CONCEPT_GEN_START__';
const endMark = '/*__CONCEPT_GEN_END__*/';
if(html.indexOf(startMark) >= 0){
  const a = html.indexOf(startMark), b = html.indexOf(endMark) + endMark.length;
  html = html.slice(0, a) + block + html.slice(b);
} else {
  // ALL_SKILLS 정의 줄 다음에 삽입
  const anchor = 'const ALL_SKILLS = Object.assign({}, UNIVERSAL_SKILLS, ELEMENT_SKILLS, TRAIT_SKILLS, FORM_SKILLS, CARD_SKILLS, SKILL_LIB, CONCEPT_BATCH1_SKILLS, CONCEPT_BATCH2_SKILLS, STAGE_SKILLS);';
  const i = html.indexOf(anchor);
  if(i < 0){ console.error('앵커(ALL_SKILLS 라인)를 찾지 못함 — 주입 실패'); process.exit(1); }
  const after = i + anchor.length;
  html = html.slice(0, after) + '\n' + block + html.slice(after);
}
fs.writeFileSync(HTML, html, 'utf8');
console.log('주입 완료 → index.html');
