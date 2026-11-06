// 만약 실험용 사본만 고침(2026-11-07 — 치명 2배 고정(431) 뒤 게일캑터 종 리그전 76 · 85 · 82%):
//  게일캑터 공명 = 방해 디버프 기술 한 번 · 강풍이 부는 턴 끝마다 +1 → at 이면 무속성 확정 치명 추가 공격(위력 power · 결과표 없이 늘 맞음)
//  방식 = p<위력>a<모으는 수>[u][n][g<강풍 빗나감>][t<기본 방어 기울기 × 100>] — 예: p55a3 = 지금 · p55a3n = 치명 빼기 · p55a3g6 = 강풍 빗나감 12 → 6 · p55a3t100 = 방어 1.12 → 1.00
//   u = 기술로 채우는 +1은 고유 기술(종 기술)만(산들바람 · 회오리 · 모래 폭풍처럼 강풍을 거는 공용 공격 카드는 안 셈 — 강풍 턴 끝 +1은 그대로)
//   n = 공명 공격의 확정 치명을 뺌(정타 — 같은 날 사용자 '자동으로 나가는게 그냥 피해주는거면 위력을 낮추거나 치명을 빼도 되지 않나')
//   g = 강풍이 상대 공격에 더하는 빗나감(지금 12 — 모든 바람 종에 걸리는 규칙) · t = 게일캑터 기본 방어 기울기(지금 1.12 — 클로드 임시)
//  쓰는 법: git archive HEAD v2 tools/test | tar -x -C <사본> → node tools/test/whatif_reso.mjs <사본> <방식>
//   (옛 꼴 <사본> <위력> [<모으는 수>] [u]도 받음)
import { readFileSync, writeFileSync } from 'node:fs';
const [root, A1 = 'p40a3', A2, A3] = process.argv.slice(2);
const MODE = /^\d+$/.test(A1) ? `p${A1}a${A2 || 3}${A3 === 'u' ? 'u' : ''}` : A1;
//   e = 강풍 · 폭풍이 부는 턴 끝 +1을 뺌(기술로만 쌓임 — 공명이 터지는 빈도를 보려고)
const m = /^p(\d+)a(\d+)(u)?(n)?(e)?(?:g(\d+))?(?:t(\d+))?$/.exec(MODE);
if (!m) throw new Error('방식 = p<위력>a<모으는 수>[u][n][e][g<강풍 빗나감>][t<방어 기울기 × 100>]');
const P = +m[1], AT = +m[2], U = !!m[3], N = !!m[4], E = !!m[5], G = m[6] != null ? +m[6] : null, TD = m[7] != null ? +m[7] / 100 : null;
function patch(rel, a, b) {
  const p = root + '/' + rel;
  const s = readFileSync(p, 'utf8');
  if (s.split(a).length !== 2) throw new Error(`${rel}: '${a.slice(0, 40)}…'를 한 곳에서 못 찾음`);
  writeFileSync(p, s.replace(a, () => b));
}
patch('v2/src/game/catalog.js', "reso: { k: 'reso', at: 3, power: 55,", `reso: { k: 'reso', at: ${AT}, power: ${P},`);
if (U) patch('v2/src/battle/rules.js', "if (r === 'acted' || r === 'end') resoAfter(u, foe, ev, n0, T, guards.has(foe));", "if ((r === 'acted' || r === 'end') && actOf(u).tier === 'u') resoAfter(u, foe, ev, n0, T, guards.has(foe));");
if (N) patch('v2/src/battle/devices.js', "sideHit(u, foe, R.power, guarded ? 'hit' : 'crit', ev, { from: 'reso', label: '공명' });", "sideHit(u, foe, R.power, 'hit', ev, { from: 'reso', label: '공명' });");
if (E) patch('v2/src/battle/devices.js', '  if (SP(u).reso) resoAdd(u, opp, turn, ev, !!(opp.st && opp.st.guardT === turn));', '  /* 사본: 강풍 턴 끝 +1 뺌 */');
if (G != null) patch('v2/src/battle/status.js', 'gale:    { env: true, turns: 3, missAdd: 12 }', `gale:    { env: true, turns: 3, missAdd: ${G} }`);
if (TD != null) {
  const p = root + '/v2/src/game/catalog.js', L = readFileSync(p, 'utf8').split('\n');
  const i = L.findIndex(l => /^\s*cactus_wind: \{ name:/.test(l));
  if (i < 0 || !L[i].includes('def: 1.12')) throw new Error('catalog.js 게일캑터 기울기 줄을 못 찾음');
  L[i] = L[i].replace('def: 1.12', `def: ${TD}`);
  writeFileSync(p, L.join('\n'));
}
console.log(`사본 고침 끝 — 게일캑터 공명 = ${AT}을 모으면 위력 ${P} ${N ? '정타' : '확정 치명'}${U ? ' · 기술로 채우는 +1은 고유 기술만' : ''}${E ? ' · 강풍 턴 끝 +1 없음' : ''}${G != null ? ` · 강풍 빗나감 +${G}` : ''}${TD != null ? ` · 기본 방어 ${TD}배` : ''}`);
