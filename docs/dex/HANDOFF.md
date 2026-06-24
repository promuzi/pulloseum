# 🔖 인계: 도감 스킬 공유표시 + 앱(호스팅/PWA) — 다른 기기에서 이어가기

작성 2026-06-24. **다른 기기에서 이 파일부터 읽고 이어서 진행.**

## ⚠️ 먼저: OneDrive 충돌 주의 (이 세션에서 겪음)
- 이 저장소는 `OneDrive\Documents\pulloseum`에 있어 **다른 기기/세션 + OneDrive 동기화가 미커밋 편집을 되돌려버린다**(파일이 옛 버전으로 깜빡임).
- **대책:** 작업 시작 시 OneDrive **동기화 일시중지** + 다른 기기/세션에서 이 폴더 닫기. 편집은 **자주 커밋**. 근본해결은 저장소를 OneDrive 밖으로 이동.
- 커밋·푸시된 것은 GitHub에 안전. **현재 HEAD = 도감 라이브연동·PWA(`sw.js`)까지 완료.** 아래 ①만 미반영(코드 되돌려짐).

## ① 스킬 "공유/고유" 표시 + 클릭 시 보유 식물 목록 — ✅ 재적용 완료(2026-06-24)
> 재적용됨: 게임 `dexSkillScope`(version `2026-06-24d`) + 도감 칩/모달. 검증: 칩 105·`skill_basic_tree`→목본형 공유·7종, 고유 경로 핑크. 아래 코드는 참고 기록으로 보존.
설계·구현 끝났으나 OneDrive가 되돌려 **재적용 필요**. 게임에 `dexSkillScope` 추가 + 도감에 칩/모달 추가.

### A. index.html — `window.__DEX_API = {` 바로 **위**에 함수 추가
```js
/* 스킬 공유 범위 판별(도감용) */
function dexSkillScope(id){
  for(const t in TYPE_BASIC_ATK){ if(TYPE_BASIC_ATK[t]===id || TYPE_BASIC_DEF[t]===id || TYPE_TRAIT_SKILL[t]===id) return { scope:'type', axis:t }; }
  for(const e in ELEMENT_SPROUT_SKILL){ if(ELEMENT_SPROUT_SKILL[e]===id) return { scope:'element', els:[e] }; }
  for(const e in ELEMENTS){ if(elementSkillId(e)===id) return { scope:'element', els:[e] }; }
  { const els=[]; for(const e in ELEMENT_GROWTH_SKILLS){ if(ELEMENT_GROWTH_SKILLS[e].indexOf(id)>=0) els.push(e); } if(els.length) return { scope:'element', els:els }; }
  if(id==='skill_rally' || id==='skill_photosynthesis' || id==='skill_focus' || id==='skill_basic_strike' || id==='skill_guard') return { scope:'universal' };
  return { scope:'unique' };
}
```
그리고 `__DEX_API` 객체의 마지막 함수 줄에 `dexSkillScope` 추가, `version:'2026-06-24b'`로:
```js
  plantKnownSkillIds, skillGradeOf, skillById, displaySkillName, battleType, dexSkillScope,
  version: '2026-06-24b',
```

### B. plant-codex.html — CSS: `.gbasic{color:var(--faint);}` 줄 **아래**에 추가
```css
.sk{cursor:pointer; border-radius:3px; margin:0 -6px; padding-left:6px; padding-right:6px;}
.sk:hover{background:rgba(146,186,196,.06);}
.scope{font-family:var(--pix); font-size:7.5px; letter-spacing:.3px; padding:1px 4px; border-radius:2px; border:1px solid currentColor;}
.scope.s-type{color:#9adbe8;} .scope.s-elem{color:#ffd34a;} .scope.s-all{color:#8aa3aa;} .scope.s-unique{color:#ff8af0;}
.sk .tap{font-family:var(--pix); font-size:8px; color:var(--faint); margin-top:3px;}
.sk .tap em{color:var(--sub); font-style:normal;}
.modal{position:fixed; inset:0; z-index:100; background:rgba(5,9,12,.8); backdrop-filter:blur(5px); display:none; align-items:center; justify-content:center; padding:20px;}
.modal.open{display:flex;}
.mbox{position:relative; background:linear-gradient(180deg,var(--panel),var(--void2)); border:1px solid var(--line2); border-radius:8px; max-width:520px; width:100%; max-height:84vh; overflow:auto; padding:22px 22px 18px; --ac:#6bdd6b;}
.mbox::before{content:''; position:absolute; inset:0 0 auto 0; height:3px; border-radius:8px 8px 0 0; background:linear-gradient(90deg,var(--ac),transparent 75%);}
.mclose{position:absolute; top:12px; right:14px; cursor:pointer; color:var(--faint); font-size:20px; line-height:1; background:none; border:0;}
.mclose:hover{color:var(--ink);}
.mhead{display:flex; gap:12px; align-items:center; padding-right:24px;}
.mhead .mic{font-size:30px;} .mhead .mname{font-family:var(--disp); font-size:22px;}
.mhead .mgr{font-family:var(--pix); font-size:9px; padding:1px 5px; border-radius:2px; border:1px solid currentColor; margin-left:6px;}
.meff{font-size:13px; color:var(--sub); margin:10px 0 0;}
.mscope{display:flex; align-items:center; gap:8px; margin:14px 0 6px; padding:10px 12px; background:var(--void2); border:1px solid var(--line); border-radius:5px; font-size:12.5px; color:var(--ink);}
.mscope .scope{font-size:9px;}
.mlist-h{font-family:var(--pix); font-size:9px; letter-spacing:1.5px; color:var(--faint); margin:16px 0 8px; display:flex; justify-content:space-between;}
.orow{display:flex; align-items:center; gap:9px; padding:7px 0; border-bottom:1px solid rgba(146,186,196,.08); font-size:13px;}
.orow:last-child{border-bottom:0;}
.odot{width:8px; height:8px; border-radius:50%; flex:0 0 8px;}
.oname{flex:1; font-weight:600;}
.oleg{font-family:var(--pix); font-size:8px; color:var(--faint); border:1px solid var(--line2); padding:1px 4px; border-radius:2px;}
.ometa{font-size:12px; color:var(--sub);}
.ostage{font-family:var(--pix); font-size:9px; color:var(--ac); border:1px solid color-mix(in srgb,var(--ac) 40%, transparent); padding:2px 6px; border-radius:2px; white-space:nowrap;}
```

### C. plant-codex.html — 모달 마크업: `<iframe id="game"` 줄 **위**에 추가
```html
<div class="modal" id="skModal"><div class="mbox" id="skBox"></div></div>
```

### D. plant-codex.html — JS
1) `let API=null, GSO=null;` → `let API=null, GSO=null, SKILL_OWNERS={};`

2) 기존 `skillRow` 함수를 아래로 **교체**(앞에 `scopeInfo` 추가):
```js
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
```

3) `build()` 안 `const all = ...` 줄 **아래**에 역색인 추가:
```js
  SKILL_OWNERS = {};
  all.forEach(sp=>{
    const first={};
    GSO.forEach((st,idx)=>{ knownAt(sp,idx).forEach(id=>{ if(first[id]==null) first[id]=idx; }); });
    Object.keys(first).forEach(id=>{ (SKILL_OWNERS[id]=SKILL_OWNERS[id]||[]).push({sp:sp, idx:first[id]}); });
  });
```

4) `build()` 안 카드 페인트 루프 끝(`buildFilters();` 바로 위)에 클릭 위임 추가 + 함수 추가:
```js
  codex.addEventListener('click', (e)=>{ const row=e.target.closest('.sk'); if(row && row.dataset.skill) openSkillModal(row.dataset.skill); });
```
그리고 `build()` 함수 **밖**(아래)에:
```js
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
  const box=document.getElementById('skBox');
  box.style.setProperty('--ac', sc.kind==='unique' ? '#ff8af0' : '#6bdd6b');
  box.innerHTML = `<button class="mclose" aria-label="닫기">×</button>
    <div class="mhead"><span class="mic">${m.icon||'·'}</span>
      <div><span class="mname">${m.name||id}</span><span class="mgr ${gradeCls}">${gradeRaw}</span></div></div>
    <div class="meff">${m.desc||''}</div>
    <div class="mscope"><span class="scope ${sc.cls}">${sc.txt}</span><span>${scopeMsg}</span></div>
    <div class="mlist-h"><span>보유 가능한 식물</span><span>${owners.length}종</span></div>
    ${list}`;
  document.getElementById('skModal').classList.add('open');
}
function closeSkillModal(){ document.getElementById('skModal').classList.remove('open'); }
document.getElementById('skModal').addEventListener('click', (e)=>{ if(e.target.id==='skModal' || e.target.classList.contains('mclose')) closeSkillModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeSkillModal(); });
```

### 검증
1. preview에서 **서비스워커/캐시 먼저 비우기**(아래 SW 주의), `index.html?dex=1` iframe의 `__DEX_API.version`이 `2026-06-24b`·`dexSkillScope` 존재 확인.
2. 도감 카드 스킬에 칩(타입/속성/전체 공유·개체 고유) 표시, 스킬 탭 시 모달에 보유 식물+해금 단계.
3. 게임 본체 정상 부팅 + `window.__catalogSelfTest()` 0 FAIL.

## ② 다음: 앱(호스팅/PWA) 바로 이어서
- **GitHub Pages 켜기(사용자 1회):** 저장소 Settings → Pages → Source=Deploy from a branch, Branch=`main`, 폴더=`/ (root)` → Save. 1~2분 후:
  - 게임 `https://promuzi.github.io/pulloseum/`
  - 도감 `https://promuzi.github.io/pulloseum/docs/dex/plant-codex.html`
- **PWA:** 폰에서 게임 링크 → 브라우저 메뉴 "홈 화면에 추가"(설치형 아님, 무료). `site.webmanifest`(아이콘 192/512 보유)+`sw.js` 이미 있음.

## ⚙️ 구조 메모 (이미 HEAD에 반영됨)
- **도감 자동 동기화:** `docs/dex/plant-codex.html`이 데이터 복제 안 함. 숨은 `<iframe src="../../index.html?dex=1">` → `window.__DEX_API`에서 실제 데이터·함수를 읽어 렌더. **종/스킬/스탯은 index.html만 고치면 도감 자동 반영.**
- **`?dex=1` 데이터 전용 모드:** index.html이 이 플래그면 부팅·세이브·렌더·SW 등록 생략(세이브 무손상).
- **🐞 SW 개발캐시 주의:** `sw.js`가 게임을 캐시 → preview에서 도감이 옛 게임을 읽어 깨질 수 있음. 테스트 시 SW 등록해제+캐시삭제:
  `navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())); caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)));`
