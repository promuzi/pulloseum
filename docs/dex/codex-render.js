/* 풀로세움 식물 도감 — 공유 렌더 모듈
   window.PlantCodex.mount(api, root) 로 도감을 렌더한다.
   · root = document   → 독립 페이지(plant-codex.html, 웹/깃허브용)
   · root = ShadowRoot → 게임 내 모달(index.html). 같은 창의 __DEX_API를 직접 받아 렌더 →
     중첩 iframe·크로스프레임 접근이 전혀 없으므로 file:// 더블클릭에서도 작동한다.
   외형/스탯/스킬/종 목록은 모두 api(__DEX_API)에서 실시간으로 읽는다(자동 동기화). */
(function(){
'use strict';

const CSS = `
:root,:host{
  --void:#091015; --void2:#0c161c; --panel:#0f1c23; --panel2:#13242c;
  --ink:#e9f2f3; --sub:#8aa3aa; --faint:#5d7178; --line:rgba(146,186,196,.14);
  --line2:rgba(146,186,196,.28);
  --gold:#ffd34a; --new:#7CF6A0;
  --disp:'Do Hyeon', 'Pretendard', sans-serif;
  --body:'Pretendard', system-ui, sans-serif;
  --pix:'Galmuri11', ui-monospace, monospace;
}
*{box-sizing:border-box;}
.cdx-host{
  margin:0; background:var(--void); color:var(--ink); font-family:var(--body);
  line-height:1.55; -webkit-font-smoothing:antialiased;
  background-image:
    radial-gradient(900px 500px at 80% -5%, rgba(74,198,255,.06), transparent 60%),
    radial-gradient(700px 460px at 0% 12%, rgba(107,221,107,.05), transparent 55%);
}
.cdx-host a{color:inherit;}
.cdx-host .wrap{max-width:1180px; margin:0 auto; padding:0 16px;}

.cdx-host .filters{display:flex; gap:6px; flex-wrap:wrap; padding:10px 16px; position:sticky; top:0; z-index:50; background:#0a1217; border-bottom:1px solid var(--line2);}
.cdx-host .chip{font-family:var(--pix); font-size:10px; letter-spacing:.5px; color:var(--sub);
  border:1px solid var(--line2); background:transparent; border-radius:2px; padding:5px 9px;
  cursor:pointer; transition:.16s; user-select:none;}
.cdx-host .chip:hover{color:var(--ink); border-color:var(--sub);}
.cdx-host .chip.on{color:var(--void); background:var(--ink); border-color:var(--ink); font-weight:bold;}

.cdx-host .tsec{padding:30px 0 8px; scroll-margin-top:72px;}
.cdx-host .thead{display:flex; align-items:flex-end; gap:18px; margin-bottom:6px; border-bottom:1px solid var(--line2); padding-bottom:16px;}
.cdx-host .tglyph{font-size:46px; line-height:1; filter:drop-shadow(0 4px 14px rgba(0,0,0,.5));}
.cdx-host .thead .tnum{font-family:var(--pix); font-size:10px; color:var(--faint); letter-spacing:2px;}
.cdx-host .thead h2{font-family:var(--disp); font-size:30px; margin:2px 0 0;}
.cdx-host .thead .tdesc{color:var(--sub); font-size:13px; margin-top:3px;}
.cdx-host .thead .ttend{margin-left:auto; text-align:right; font-family:var(--pix); font-size:10px; color:var(--sub); letter-spacing:.5px; line-height:1.7;}
.cdx-host .thead .ttend b{color:var(--ink);}

.cdx-host .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:18px; padding:22px 0 8px;}

.cdx-host .card{position:relative; background:linear-gradient(180deg,var(--panel),var(--void2));
  border:1px solid var(--line); border-radius:6px; padding:18px 18px 16px; overflow:hidden;
  --ac:#6bdd6b;}
.cdx-host .card::before{content:''; position:absolute; inset:0 0 auto 0; height:3px;
  background:linear-gradient(90deg,var(--ac),transparent 75%); opacity:.9;}
.cdx-host .card.legacy{opacity:.92; border-style:dashed;}
.cdx-host .card .brk{position:absolute; width:11px; height:11px; border:2px solid var(--ac); opacity:.55;}
.cdx-host .card .brk.tl{top:8px; left:8px; border-right:0; border-bottom:0;}
.cdx-host .card .brk.tr{top:8px; right:8px; border-left:0; border-bottom:0;}
.cdx-host .card .brk.bl{bottom:8px; left:8px; border-right:0; border-top:0;}
.cdx-host .card .brk.br{bottom:8px; right:8px; border-left:0; border-top:0;}

.cdx-host .chead{display:flex; gap:14px; align-items:flex-start;}
.cdx-host .sprite{flex:0 0 84px; width:84px; height:84px; border:1px solid var(--line2); border-radius:4px;
  display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;
  background:radial-gradient(circle at 50% 38%, color-mix(in srgb,var(--ac) 26%, transparent), transparent 70%), var(--void);}
.cdx-host .sprite svg{display:block;}
.cdx-host .sprite .sil{font-size:40px; filter:drop-shadow(0 0 10px color-mix(in srgb,var(--ac) 60%, transparent));}
.cdx-host .cmeta{flex:1; min-width:0;}
.cdx-host .code{font-family:var(--pix); font-size:9px; letter-spacing:1.5px; color:var(--ac);}
.cdx-host .cname{font-family:var(--disp); font-size:23px; line-height:1.1; margin:1px 0 7px;}
.cdx-host .badges{display:flex; gap:5px; flex-wrap:wrap;}
.cdx-host .b{font-family:var(--pix); font-size:9px; letter-spacing:.5px; padding:3px 7px; border-radius:2px; border:1px solid var(--line2); color:var(--sub);}
.cdx-host .b.el{color:var(--ac); border-color:color-mix(in srgb,var(--ac) 45%, transparent);}
.cdx-host .b.rare{color:var(--gold); border-color:rgba(255,211,74,.45);}
.cdx-host .b.leg{color:var(--faint);}
.cdx-host .concept{font-size:12.5px; color:var(--sub); margin:13px 0 4px; min-height:34px;}

.cdx-host .ribbon{display:flex; gap:3px; margin:12px 0 14px;}
.cdx-host .stage{flex:1; text-align:center; cursor:pointer; border:1px solid var(--line); border-radius:3px;
  padding:6px 2px 5px; background:var(--void2); transition:.14s;}
.cdx-host .stage:hover{border-color:var(--line2);}
.cdx-host .stage .sl{font-family:var(--pix); font-size:8px; letter-spacing:.3px; color:var(--faint); display:block;}
.cdx-host .stage .sm{font-size:11px; color:var(--sub); margin-top:2px; font-weight:600;}
.cdx-host .stage.on{background:color-mix(in srgb,var(--ac) 18%, var(--void2)); border-color:var(--ac);}
.cdx-host .stage.on .sl{color:var(--ac);} .cdx-host .stage.on .sm{color:var(--ink);}
.cdx-host .stage.seed.on .sm{color:var(--faint);}

.cdx-host .stats{display:grid; grid-template-columns:auto 1fr auto; gap:7px 9px; align-items:center; margin:2px 0 14px;}
.cdx-host .stats .k{font-family:var(--pix); font-size:9px; color:var(--sub); letter-spacing:.5px;}
.cdx-host .bar{height:7px; background:var(--void); border-radius:4px; overflow:hidden; border:1px solid var(--line);}
.cdx-host .bar i{display:block; height:100%; border-radius:4px; background:var(--ac); transition:width .35s cubic-bezier(.2,.7,.2,1);}
.cdx-host .stats .v{font-family:var(--pix); font-size:11px; color:var(--ink); text-align:right; min-width:34px;}

.cdx-host .skhead{font-family:var(--pix); font-size:9px; letter-spacing:1.5px; color:var(--faint);
  border-top:1px solid var(--line); padding-top:11px; margin-bottom:9px; display:flex; justify-content:space-between;}
.cdx-host .seedlock{font-size:12px; color:var(--faint); padding:6px 0 2px; font-style:italic;}
.cdx-host .sk{display:flex; gap:9px; align-items:flex-start; padding:7px 0; border-bottom:1px solid rgba(146,186,196,.07);}
.cdx-host .sk:last-child{border-bottom:0;}
.cdx-host .sk .ic{flex:0 0 22px; font-size:16px; text-align:center; line-height:1.3;}
.cdx-host .sk .body{flex:1; min-width:0;}
.cdx-host .sk .nm{font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; flex-wrap:wrap;}
.cdx-host .sk .gr{font-family:var(--pix); font-size:8px; padding:1px 4px; border-radius:2px; border:1px solid currentColor;}
.cdx-host .sk .ef{font-size:11.5px; color:var(--sub); margin-top:1px;}
.cdx-host .sk.isnew{background:linear-gradient(90deg, color-mix(in srgb,var(--new) 9%, transparent), transparent 60%); margin:0 -8px; padding-left:8px; padding-right:8px; border-radius:3px;}
.cdx-host .sk.isnew .nm::after{content:'NEW'; font-family:var(--pix); font-size:7.5px; color:var(--void); background:var(--new); padding:1px 4px; border-radius:2px; letter-spacing:.5px;}
.cdx-host .gC{color:#5fe06b;} .cdx-host .gB{color:#4ac6ff;} .cdx-host .gA{color:#b06bff;} .cdx-host .gS{color:#ff9a3c;} .cdx-host .gD{color:#e8edf3;} .cdx-host .gbasic{color:var(--faint);}
.cdx-host .sk{cursor:pointer; border-radius:3px; margin:0 -6px; padding-left:6px; padding-right:6px;}
.cdx-host .sk:hover{background:rgba(146,186,196,.06);}
.cdx-host .scope{font-family:var(--pix); font-size:7.5px; letter-spacing:.3px; padding:1px 4px; border-radius:2px; border:1px solid currentColor;}
.cdx-host .scope.s-type{color:#9adbe8;} .cdx-host .scope.s-elem{color:#ffd34a;} .cdx-host .scope.s-all{color:#8aa3aa;} .cdx-host .scope.s-unique{color:#ff8af0;}
.cdx-host .sk .tap{font-family:var(--pix); font-size:8px; color:var(--faint); margin-top:3px;}
.cdx-host .sk .tap em{color:var(--sub); font-style:normal;}
.cdx-host .modal{position:fixed; inset:0; z-index:100; background:rgba(5,9,12,.8); backdrop-filter:blur(5px); display:none; align-items:center; justify-content:center; padding:20px;}
.cdx-host .modal.open{display:flex;}
.cdx-host .mbox{position:relative; background:linear-gradient(180deg,var(--panel),var(--void2)); border:1px solid var(--line2); border-radius:8px; max-width:520px; width:100%; max-height:84vh; overflow:auto; padding:22px 22px 18px; --ac:#6bdd6b;}
.cdx-host .mbox::before{content:''; position:absolute; inset:0 0 auto 0; height:3px; border-radius:8px 8px 0 0; background:linear-gradient(90deg,var(--ac),transparent 75%);}
.cdx-host .mclose{position:absolute; top:12px; right:14px; cursor:pointer; color:var(--faint); font-size:20px; line-height:1; background:none; border:0;}
.cdx-host .mclose:hover{color:var(--ink);}
.cdx-host .mhead{display:flex; gap:12px; align-items:center; padding-right:24px;}
.cdx-host .mhead .mic{font-size:30px;} .cdx-host .mhead .mname{font-family:var(--disp); font-size:22px;}
.cdx-host .mhead .mgr{font-family:var(--pix); font-size:9px; padding:1px 5px; border-radius:2px; border:1px solid currentColor; margin-left:6px;}
.cdx-host .meff{font-size:13px; color:var(--sub); margin:10px 0 0;}
.cdx-host .mscope{display:flex; align-items:center; gap:8px; margin:14px 0 6px; padding:10px 12px; background:var(--void2); border:1px solid var(--line); border-radius:5px; font-size:12.5px; color:var(--ink);}
.cdx-host .mscope .scope{font-size:9px;}
.cdx-host .mlist-h{font-family:var(--pix); font-size:9px; letter-spacing:1.5px; color:var(--faint); margin:16px 0 8px; display:flex; justify-content:space-between;}
.cdx-host .orow{display:flex; align-items:center; gap:9px; padding:7px 0; border-bottom:1px solid rgba(146,186,196,.08); font-size:13px;}
.cdx-host .orow:last-child{border-bottom:0;}
.cdx-host .odot{width:8px; height:8px; border-radius:50%; flex:0 0 8px;}
.cdx-host .oname{flex:1; font-weight:600;}
.cdx-host .oleg{font-family:var(--pix); font-size:8px; color:var(--faint); border:1px solid var(--line2); padding:1px 4px; border-radius:2px;}
.cdx-host .ometa{font-size:12px; color:var(--sub);}
.cdx-host .ostage{font-family:var(--pix); font-size:9px; color:var(--ac); border:1px solid color-mix(in srgb,var(--ac) 40%, transparent); padding:2px 6px; border-radius:2px; white-space:nowrap;}

.cdx-host .vars{margin-top:13px; border-top:1px solid var(--line); padding-top:11px;}
.cdx-host .vars .vh{font-family:var(--pix); font-size:9px; letter-spacing:1.5px; color:var(--faint); margin-bottom:7px;}
.cdx-host .vchips{display:flex; gap:5px; flex-wrap:wrap;}
.cdx-host .vchip{font-size:10.5px; color:var(--sub); border:1px solid var(--line2); border-radius:2px; padding:3px 7px; display:flex; gap:4px; align-items:center;}
.cdx-host .vchip.born{color:var(--ac); border-color:color-mix(in srgb,var(--ac) 50%, transparent); background:color-mix(in srgb,var(--ac) 10%, transparent);}

.cdx-host .statusbox{padding:60px 20px; text-align:center; color:var(--sub);}
.cdx-host .statusbox .big{font-family:var(--disp); font-size:22px; color:var(--ink); margin-bottom:10px;}
.cdx-host .statusbox code{font-family:var(--pix); font-size:12px; color:var(--gold); background:var(--void2); padding:3px 8px; border-radius:3px; border:1px solid var(--line2);}
.cdx-host .hide{display:none !important;}
@media(max-width:560px){
  .cdx-host .thead{flex-wrap:wrap;} .cdx-host .thead .ttend{margin-left:0; text-align:left; width:100%;}
  .cdx-host .grid{grid-template-columns:1fr;}
  .cdx-host .filters{gap:5px;}
}
`;

/* 게임 내 모달(ShadowRoot)용 스캐폴드 — 독립 페이지(document)는 자체 마크업을 그대로 쓴다. */
const SCAFFOLD = `<div class="cdx-host">
  <div class="filters" id="filters"></div>
  <main class="wrap" id="codex"><div class="statusbox"><div class="big">도감 불러오는 중…</div><div>게임 데이터를 읽고 있습니다.</div></div></main>
  <div class="modal" id="skModal"><div class="mbox" id="skBox"></div></div>
</div>`;

/* ===== 도감 전용 서술(컨셉/외형) — 게임 데이터 아님. 신규 종은 게임 desc로 폴백 ===== */
const CONCEPTS = {
  tree_fire:'옹이마다 불씨가 타오르는 잉걸나무. 잎 대신 불티가 흩날린다.',
  tree_water:'수액이 바닷물처럼 차오르는 맹그로브. 뿌리에서 물안개를 뿜는다.',
  tree_grass:'이끼와 새순으로 뒤덮인 태고의 거목. 가지마다 새 생명이 돋는다.',
  tree_earth:'껍질이 암석처럼 굳은 바위참나무. 좀처럼 쓰러지지 않는다.',
  tree_wind:'가지가 바람개비처럼 휘는 바람나무. 잎새가 칼날처럼 운다.',
  tree_bolt:'벼락을 맞고도 살아남아 전기를 머금은 뇌격수.',
  frost:'서리 열매가 주렁주렁 열린 한대수. 가지에 고드름이 맺힌다.',
  flower_fire:'꽃잎 끝이 불꽃처럼 일렁이는 화염화.',
  aqua:'물방울을 머금은 구근에서 피어나는 수련.',
  flower_grass:'겹겹의 잎꽃잎을 두른 들장미.',
  flower_earth:'진흙 속에서 단단히 피는 토양화.',
  flower_wind:'꽃잎이 깃털처럼 흩날리는 풍접초.',
  spark:'수술 끝에 정전기가 튀는 번개꽃.',
  flower_ice:'얼음 결정으로 꽃잎을 세운 설화(雪花).',
  cactus_fire:'가시 끝에서 열기가 피어오르는 화염선인장.',
  cactus_water:'몸통 가득 수분을 저장한 이슬선인장.',
  cactus_grass:'잎과 가시가 공존하는 초록선인장.',
  gaia:'바위처럼 단단한 대지선인장.',
  cactus_wind:'구멍으로 바람 소리를 내는 바람선인장.',
  cactus_bolt:'가시가 피뢰침처럼 전기를 모으는 전하선인장.',
  cactus_ice:'서리에 뒤덮인 한지선인장.',
  vine_fire:'불타며 뻗어가는 화염덩굴.',
  vine_water:'물길을 따라 자라는 해조덩굴.',
  thorn:'가시투성이 덩굴이 얽힌 가시잡초.',
  vine_earth:'땅속 깊이 뿌리내리는 뿌리덩굴.',
  vine_wind:'바람을 타고 빠르게 감기는 질풍덩굴.',
  vine_bolt:'전류가 흐르는 전선덩굴.',
  vine_ice:'서리를 퍼뜨리며 감아오르는 빙결덩굴.',
  spore_cap:'포자 안개를 끊임없이 뿜는 갓버섯. 태생부터 포자 변이를 지녔다.',
  flame:'한때 초본형이던 불이끼. 지금은 화초형으로 분류되는 레거시 종.',
  grass_water:'물안개를 머금은 이끼. 화초형으로 흡수된 레거시 종.',
  grass_grass:'가장 흔하던 초록 이끼. 레거시 보존 종.',
  grass_earth:'진흙에 붙어 자라던 흙이끼. 레거시 종.',
  windy:'바람에 잎을 떠는 풍엽. 레거시 종.',
  grass_bolt:'정전기를 띤 번개이끼. 레거시 종.',
  grass_ice:'서리 낀 한대 이끼. 레거시 종.',
};
const TYPE_GLYPH={tree:'🌳',flower:'🌸',cactus:'🌵',vine:'🍃',mushroom:'🍄'};
const TYPE_DESC={
  tree:'굵은 줄기와 우거진 수관, 단단한 목질. 느리지만 잘 쓰러지지 않는다.',
  flower:'화려한 꽃송이와 가는 줄기. 한 방의 화력이 높은 공격형. (구 초본형 흡수)',
  cactus:'수분을 머금은 통통한 다육질 몸통과 가시. 버티는 싸움에 강하다.',
  vine:'길게 뻗는 덩굴과 덩굴손. 빠르고 흡혈로 끈질기게 물고 늘어진다.',
  mushroom:'갓과 균사, 포자. 스탯은 낮지만 중독·교란 포자로 판을 흔든다.',
};
const TYPE_PREFIX={tree:'T',flower:'F',cactus:'C',vine:'V',mushroom:'M'};
const TYPE_ORDER=['tree','flower','cactus','vine','mushroom'];
const EL_ORDER=['fire','water','grass','earth','wind','bolt','ice'];
const STAT_KEYS=['hp','atk','def','spd'];
const STAT_LABEL={hp:'HP',atk:'공격',def:'방어',spd:'기동'};
const CAP={hp:200,atk:55,def:50,spd:46};

let API=null, GSO=null, SKILL_OWNERS={}, R=null;
let curType='all', curEl='all', curForm='all';

/* ===== 게임 데이터 → 도감 헬퍼 ===== */
function elMeta(el){ const e=API.ELEMENTS[el]||{}; return {n:e.name||el, i:e.icon||'·', c:e.color||'#6bdd6b'}; }
function rarityOf(sp){ return sp.rarity && sp.rarity!=='common' ? (API.RARITY_META[sp.rarity]||null) : null; }
function knownAt(sp, idx){
  return API.plantKnownSkillIds({species:sp.key, element:sp.element, growth_stage:GSO[idx], form:'normal'}) || [];
}
function skillMeta(sp, idx, id){
  const s=API.ALL_SKILLS[id]||{};
  let g; try{ g=API.skillGradeOf({species:sp.key, element:sp.element, growth_stage:GSO[idx], form:'normal'}, id); }catch(e){ g=s.grade||'C'; }
  const basic = s.tag==='기본' || s.tag==='성장';
  return { n:s.name||id, i:s.icon||'·', e:s.desc||'', basic, grade:g };
}

/* ===== 렌더 ===== */
function statRow(sp,key,g){
  const val=Math.round((sp.base[key]||0)*g);
  const pct=Math.min(100, Math.round(val/CAP[key]*100));
  return `<span class="k">${STAT_LABEL[key]}</span><div class="bar"><i style="width:${pct}%"></i></div><span class="v">${val}</span>`;
}
function scopeInfo(id){
  const sc = (API.dexSkillScope && API.dexSkillScope(id)) || {scope:'unique'};
  if(sc.scope==='type') return {txt:(API.SEED_TYPE_NAMES[sc.axis]||sc.axis)+' 공유', cls:'s-type', kind:'type'};
  if(sc.scope==='element'){ const els=sc.els||[]; return els.length===1
    ? {txt:elMeta(els[0]).n+'속성 공유', cls:'s-elem', kind:'element', els}
    : {txt:'여러 속성 공유', cls:'s-elem', kind:'element', els}; }
  if(sc.scope==='universal') return {txt:'전체 공유', cls:'s-all', kind:'universal'};
  return {txt:'개체 고유', cls:'s-unique', kind:'unique'};
}
function skillRow(sp,idx,id,isNew){
  const m=skillMeta(sp,idx,id);
  const cls = m.basic?'gbasic':('g'+m.grade);
  const label = m.basic?'기본':m.grade;
  const sc = scopeInfo(id);
  return `<div class="sk ${isNew?'isnew':''}" data-skill="${id}">
    <div class="ic">${m.i}</div>
    <div class="body">
      <div class="nm">${m.n} <span class="gr ${cls}">${label}</span> <span class="scope ${sc.cls}">${sc.txt}</span></div>
      <div class="ef">${m.e}</div>
      <div class="tap">▶ 모션 예정 · <em>탭하면 보유 가능한 식물 보기</em></div>
    </div></div>`;
}
function codeOf(sp){ const pfx = sp.legacy?'L':(TYPE_PREFIX[sp.seedType]||'X'); return pfx+'-'+String(EL_ORDER.indexOf(sp.element)+1).padStart(2,'0'); }

function card(sp){
  const ac=elMeta(sp.element).c, rm=rarityOf(sp);
  const born = (sp.baseVariants&&sp.baseVariants[0])||null;
  const forms=API.FORMS;
  const formChip=k=>`<div class="vchip ${k===born?'born':''}">${(forms[k]&&forms[k].icon)||'·'} ${(forms[k]&&forms[k].name)||k}${k===born?' (태생)':''}</div>`;
  const order = born ? [born].concat(Object.keys(forms).filter(k=>k!=='normal'&&k!==born)) : Object.keys(forms).filter(k=>k!=='normal');
  const concept = CONCEPTS[sp.key] || sp.desc || '';
  return `<article class="card ${sp.legacy?'legacy':''}" data-key="${sp.key}" data-type="${sp.seedType}" data-el="${sp.element}" data-form="${born||'base'}" style="--ac:${ac}">
    <span class="brk tl"></span><span class="brk tr"></span><span class="brk bl"></span><span class="brk br"></span>
    <div class="chead">
      <div class="sprite" data-sprite><span class="sil">${TYPE_GLYPH[sp.seedType]||'🌱'}</span></div>
      <div class="cmeta">
        <div class="code">${codeOf(sp)}</div>
        <div class="cname">${sp.name}</div>
        <div class="badges">
          <span class="b">${TYPE_GLYPH[sp.seedType]||''} ${API.SEED_TYPE_NAMES[sp.seedType]||sp.seedType}</span>
          <span class="b el">${elMeta(sp.element).i} ${elMeta(sp.element).n}</span>
          ${rm?`<span class="b rare">★ ${rm.name}</span>`:''}
          ${sp.legacy?'<span class="b leg">레거시</span>':''}
        </div>
      </div>
    </div>
    <div class="concept">${concept}</div>
    <div class="ribbon">${GSO.map((sk,i)=>`<div class="stage ${i===0?'seed':''} ${i===1?'on':''}" data-i="${i}"><span class="sl">${String(i).padStart(2,'0')}</span><span class="sm">${API.GROWTH_STAGE_NAMES[sk]||sk}</span></div>`).join('')}</div>
    <div class="stats" data-stats></div>
    <div class="skills" data-skills></div>
    <div class="vars"><div class="vh">가능한 변이형</div><div class="vchips">${order.map(formChip).join('')}</div></div>
  </article>`;
}

function paintSprite(el, sp, idx){
  const box=el.querySelector('[data-sprite]'); if(!box) return;
  if(API.composePlantSvg){
    try{ box.innerHTML = API.composePlantSvg(sp.seedType, GSO[idx], sp.element, {size:68, varKey:sp.key, form:(sp.baseVariants&&sp.baseVariants[0])}); return; }catch(e){}
  }
  box.innerHTML = `<span class="sil">${TYPE_GLYPH[sp.seedType]||'🌱'}</span>`;
}
function paintCard(el, sp, idx){
  const g=API.GROWTH_STAT_MULT[GSO[idx]]||1;
  paintSprite(el, sp, idx);
  el.querySelector('[data-stats]').innerHTML = STAT_KEYS.map(k=>statRow(sp,k,g)).join('');
  const sk=el.querySelector('[data-skills]');
  if(idx===0){
    const ids=knownAt(sp,0);
    sk.innerHTML=`<div class="skhead"><span>보유 스킬 · 씨앗</span><span>전투 불가</span></div>
      <div class="seedlock">🌱 씨앗 단계는 토너먼트에 출전할 수 없다. 새싹부터 전투 개시.</div>`
      + ids.map(id=>skillRow(sp,0,id,false)).join('');
    return;
  }
  const known=knownAt(sp,idx), prev=knownAt(sp,idx-1);
  sk.innerHTML=`<div class="skhead"><span>해금 스킬 · ${API.GROWTH_STAGE_NAMES[GSO[idx]]}</span><span>${known.length}종</span></div>`
    + known.map(id=>skillRow(sp,idx,id, prev.indexOf(id)<0)).join('');
}

function build(){
  GSO = API.GROWTH_STAGE_ORDER;
  const all = Object.keys(API.SPECIES).map(k=>Object.assign({key:k}, API.SPECIES[k]));
  // 스킬 → 보유 가능한 (종, 최초 해금 단계) 역색인
  SKILL_OWNERS = {};
  all.forEach(sp=>{
    const first={};
    GSO.forEach((st,idx)=>{ knownAt(sp,idx).forEach(id=>{ if(first[id]==null) first[id]=idx; }); });
    Object.keys(first).forEach(id=>{ (SKILL_OWNERS[id]=SKILL_OWNERS[id]||[]).push({sp:sp, idx:first[id]}); });
  });
  const codex=R.getElementById('codex'); codex.innerHTML='';
  function section(type, list, glyph, num, name, desc, tend){
    const sec=document.createElement('section');
    sec.className='tsec'; sec.dataset.type=type;
    sec.innerHTML=`<div class="thead">
        <div class="tglyph">${glyph}</div>
        <div><div class="tnum">${num}</div><h2>${name}</h2><div class="tdesc">${desc}</div></div>
        <div class="ttend">${tend?('성향<br><b>'+tend+'</b>'):''}</div>
      </div><div class="grid">${list.map(card).join('')}</div>`;
    codex.appendChild(sec);
  }
  TYPE_ORDER.forEach((t,ti)=>{
    const list=all.filter(s=>s.seedType===t && !s.legacy)
      .sort((a,b)=>EL_ORDER.indexOf(a.element)-EL_ORDER.indexOf(b.element));
    if(!list.length) return;
    section(t, list, TYPE_GLYPH[t], `TYPE ${String(ti+1).padStart(2,'0')} / ${String(TYPE_ORDER.length).padStart(2,'0')}`,
      API.SEED_TYPE_NAMES[t]||t, TYPE_DESC[t]||'', API.TYPE_CONCEPT[t]||'');
  });
  const leg=all.filter(s=>s.legacy).sort((a,b)=>EL_ORDER.indexOf(a.element)-EL_ORDER.indexOf(b.element));
  if(leg.length) section('legacy', leg, '🗄️', 'LEGACY / 보존', '레거시 (구 초본형)',
    '초본형 폐지로 화초형에 흡수된 종. 신규 획득 풀에서는 제외되고 보유분만 유지된다.', '→ 화초형');

  // 페인트 + 단계 클릭
  R.querySelectorAll('.card').forEach(el=>{
    const sp=all.find(s=>s.key===el.dataset.key);
    paintCard(el, sp, 1);
    el.querySelectorAll('.stage').forEach(st=>st.addEventListener('click',()=>{
      el.querySelectorAll('.stage').forEach(x=>x.classList.remove('on'));
      st.classList.add('on'); paintCard(el, sp, +st.dataset.i);
    }));
  });
  // 스킬 행 클릭 → 상세 모달(보유 가능한 식물 목록)
  codex.addEventListener('click', (e)=>{ const row=e.target.closest('.sk'); if(row && row.dataset.skill) openSkillModal(row.dataset.skill); });
  buildFilters();
}

/* ===== 스킬 상세 모달 ===== */
function openSkillModal(id){
  const m = API.ALL_SKILLS[id]||{};
  const sc = scopeInfo(id);
  const basic = m.tag==='기본' || m.tag==='성장';
  const gradeRaw = basic ? '기본' : (m.grade||'C');
  const gradeCls = basic ? 'gbasic' : ('g'+(m.grade||'C'));
  const scopeMsg = sc.kind==='unique' ? '이 스킬은 <b>이 개체만</b> 가집니다(고유).'
    : sc.kind==='type' ? '같은 <b>타입</b>의 식물이 공유합니다.'
    : sc.kind==='element' ? '같은 <b>속성</b>의 식물이 공유합니다.'
    : '<b>모든 식물</b>이 공유합니다.';
  const owners = (SKILL_OWNERS[id]||[]).slice().sort((a,b)=>
    a.idx-b.idx || TYPE_ORDER.indexOf(a.sp.seedType)-TYPE_ORDER.indexOf(b.sp.seedType) || EL_ORDER.indexOf(a.sp.element)-EL_ORDER.indexOf(b.sp.element));
  const list = owners.map(o=>{
    const ac=elMeta(o.sp.element).c;
    return `<div class="orow"><span class="odot" style="background:${ac}"></span>
      <span class="oname">${o.sp.name}${o.sp.legacy?' <span class="oleg">레거시</span>':''}</span>
      <span class="ometa">${TYPE_GLYPH[o.sp.seedType]||''} ${elMeta(o.sp.element).i}</span>
      <span class="ostage" style="--ac:${ac}">${API.GROWTH_STAGE_NAMES[GSO[o.idx]]}부터</span></div>`;
  }).join('') || '<div style="color:var(--faint);font-size:13px">표시할 식물이 없습니다.</div>';
  const box=R.getElementById('skBox');
  box.style.setProperty('--ac', sc.kind==='unique' ? '#ff8af0' : '#6bdd6b');
  box.innerHTML = `<button class="mclose" aria-label="닫기">×</button>
    <div class="mhead"><span class="mic">${m.icon||'·'}</span>
      <div><span class="mname">${m.name||id}</span><span class="mgr ${gradeCls}">${gradeRaw}</span></div></div>
    <div class="meff">${m.desc||''}</div>
    <div class="mscope"><span class="scope ${sc.cls}">${sc.txt}</span><span>${scopeMsg}</span></div>
    <div class="mlist-h"><span>보유 가능한 식물</span><span>${owners.length}종</span></div>
    ${list}`;
  R.getElementById('skModal').classList.add('open');
}
function closeSkillModal(){ const m=R&&R.getElementById('skModal'); if(m) m.classList.remove('open'); }

/* ===== 필터 ===== */
function applyFilter(){
  R.querySelectorAll('.card').forEach(el=>{
    const type=el.dataset.type, isLeg=el.closest('.tsec').dataset.type==='legacy';
    const tOk = curType==='all' || (curType==='legacy'? isLeg : (type===curType && !isLeg));
    const eOk = curEl==='all' || el.dataset.el===curEl;
    const fOk = curForm==='all' || el.dataset.form===curForm;
    el.classList.toggle('hide', !(tOk&&eOk&&fOk));
  });
  R.querySelectorAll('.tsec').forEach(sec=>{
    const vis=[...sec.querySelectorAll('.card')].some(c=>!c.classList.contains('hide'));
    sec.classList.toggle('hide', !vis);
  });
}
function mkChip(label,on,cb){ const b=document.createElement('button'); b.className='chip'+(on?' on':''); b.textContent=label; b.onclick=cb; return b; }
function buildFilters(){
  const fbar=R.getElementById('filters'); fbar.innerHTML='';
  const sepEl=()=>{ const s=document.createElement('span'); s.style.cssText='width:1px;background:var(--line2);margin:0 3px;'; return s; };
  [['all','전체'],['tree','목본'],['flower','화초'],['cactus','다육'],['vine','덩굴'],['mushroom','버섯'],['legacy','레거시']]
    .forEach(([k,l])=>fbar.appendChild(mkChip(l, curType===k, ()=>{curType=k; buildFilters(); applyFilter();})));
  fbar.appendChild(sepEl());
  // 변이형(form) 필터 — 같은 타입+속성이라도 변이형마다 고유 스킬을 가진 별개 개체. 태생 변이형 기준으로 분류.
  const F=API.FORMS||{};
  [['all','전체','🧬'],['base','기본','🌿'],['normal','일반',(F.normal&&F.normal.icon)||'🌱'],
   ['pred','포식',(F.pred&&F.pred.icon)||'🦷'],['weapon','무기',(F.weapon&&F.weapon.icon)||'🗡️'],
   ['toxic','독성',(F.toxic&&F.toxic.icon)||'☠️'],['dragon','용족',(F.dragon&&F.dragon.icon)||'🐉'],
   ['spore','포자',(F.spore&&F.spore.icon)||'🍄']]
    .forEach(([k,l,ic])=>fbar.appendChild(mkChip(ic+' '+l, curForm===k, ()=>{curForm=k; buildFilters(); applyFilter();})));
  fbar.appendChild(sepEl());
  fbar.appendChild(mkChip('속성·전체', curEl==='all', ()=>{curEl='all'; buildFilters(); applyFilter();}));
  EL_ORDER.forEach(e=>fbar.appendChild(mkChip(elMeta(e).i, curEl===e, ()=>{curEl=e; buildFilters(); applyFilter();})));
}

function fail(msg){
  const codex = R && R.getElementById('codex'); if(!codex) return;
  codex.innerHTML =
    `<div class="statusbox"><div class="big">도감을 불러올 수 없습니다</div><div>${msg}</div></div>`;
}

/* ===== 진입점 ===== */
function mount(api, root){
  if(!api || !api.SPECIES){ R=root; fail('게임 데이터를 읽지 못했습니다.'); return; }
  API = api; R = root;
  // ShadowRoot 등 #codex가 없는 루트면 스타일+스캐폴드를 주입(게임 내 모달).
  // 독립 페이지(document)는 자체 마크업 + 자체 <style>을 그대로 쓰므로 주입하지 않는다.
  if(!R.getElementById('codex')){
    root.innerHTML = '<style>'+CSS+'</style>'+SCAFFOLD;
  }
  GSO = API.GROWTH_STAGE_ORDER;
  const skm = R.getElementById('skModal');
  if(skm && !skm.__cdxBound){ skm.__cdxBound=true;
    skm.addEventListener('click',(e)=>{ if(e.target.id==='skModal' || e.target.classList.contains('mclose')) closeSkillModal(); });
  }
  build();
}
document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeSkillModal(); });

window.PlantCodex = { mount: mount, fail: function(root,msg){ R=root; fail(msg); } };
})();
