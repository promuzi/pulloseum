// 플레이 기록(사용자 2026-10-16 "유저들의 플레이 방식, 대결과 양육 등 패턴 데이터를 모아서 유의미한 자료로 활용하자"):
//  계정 번호 + 시각 + 종류 + 내용(JSON)만 남김 — 비밀번호 · IP · 토큰은 남기지 않음. 분석 = node server/report.mjs
//  종류: register · login · act(양육·탐사·상점 등 일 하나: op · 인자 · 결과 · 돈/물건 변화 d · 식물 p · 재배사 레벨 L) ·
//        battle.start · battle(봇 판 끝: 모드 · 승패 · 턴 · 내 식물 · 상대 · 고른 수 세기) · pvp(친구 대결 끝) · room(방 만들기·들어가기)
const MAX_JSON = 4000;

export function makeLog(q) {
  return function log(uid, kind, data, now) {
    let s = JSON.stringify(data ?? {});
    if (s.length > MAX_JSON) s = JSON.stringify({ cut: true, head: s.slice(0, MAX_JSON) });
    try { q.addEvent.run(uid ?? null, now, kind, s); } catch (e) { console.error('기록 실패', e.message); }
  };
}

// 돈·물건 상태(전후를 비교해 이 일로 무엇이 들고 났는지 = 경제 흐름)
export const econ = s => ({
  credits: s.wallet.credits, gems: s.wallet.gems, water: s.items.water || 0, fert: s.items.fert || 0, regress: s.items.regress || 0, fuel: s.items.fuel || 0,
  seeds: s.seeds.length, scions: s.scions.length, plants: s.plants.length, storage: s.storage.length, xp: s.user.xp, level: s.user.level,
});
export function diff(a, b) {
  const d = {};
  for (const k of Object.keys(b)) if (b[k] !== a[k]) d[k] = b[k] - a[k];
  return d;
}
// 식물 요약(분석용): 종 · 단계 · 레벨 · 개체값 · 강화 · 전투 기술 · 별
export const plantLite = p => p && ({
  key: p.key, stage: p.stage, lv: p.lv, ivs: p.ivs, up: p.up, sk: p.skills ? p.skills.battle : undefined, shiny: p.shiny || undefined, legend: p.legend || undefined, inv: p.invest || undefined,
});
export function plantRef(s, args) {
  const id = args && (args.id || args.food);
  if (!id) return undefined;
  const p = s.plants.find(x => x.uid === id) || s.storage.find(x => x.uid === id);
  return p ? { key: p.key, stage: p.stage, lv: p.lv, pts: p.pts, spent: p.spent } : undefined;
}
// 인자 줄이기(이름 바꾸기 같은 자유 글은 길이만)
export function slimArgs(op, a) {
  if (!a || typeof a !== 'object') return undefined;
  const o = { ...a };
  if (op === 'rename' || op === 'setProfile') { if (o.name != null) o.name = String(o.name).length; }
  return o;
}
