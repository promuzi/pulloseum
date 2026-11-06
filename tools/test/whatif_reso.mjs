// 만약 실험용 사본만 고침(2026-11-07 — 치명 2배 고정(431) 뒤 게일캑터 종 리그전 76 · 85 · 82%):
//  게일캑터 공명 = 방해 디버프 기술 한 번 · 강풍이 부는 턴 끝마다 +1 → at 이면 무속성 확정 치명 추가 공격(위력 power)
//  이 사본 = 위력 · 모으는 수를 바꿈(사용자 원안 '3타시 치명타는 치명타지만 기본 딜이 약하게' — 위력은 클로드 임시 값)
//   세 번째 값 u = 기술로 채우는 +1은 고유 기술(종 기술)만(산들바람 · 회오리 · 모래 폭풍처럼 강풍을 거는 공용 공격 카드는 안 셈 — 강풍 턴 끝 +1은 그대로)
//  쓰는 법: git archive HEAD v2 tools/test | tar -x -C <사본> → node tools/test/whatif_reso.mjs <사본> <위력> [<모으는 수>] [u]
import { readFileSync, writeFileSync } from 'node:fs';
const [root, P0 = '40', AT0 = '3', ONLY] = process.argv.slice(2);
const P = +P0, AT = +AT0, U = ONLY === 'u';
if (!(P > 0 && AT > 0)) throw new Error('위력 · 모으는 수 = 0보다 큰 수');
function patch(rel, a, b) {
  const p = root + '/' + rel;
  let s = readFileSync(p, 'utf8');
  if (s.split(a).length !== 2) throw new Error(`${rel}: '${a.slice(0, 40)}…'를 한 곳에서 못 찾음`);
  writeFileSync(p, s.replace(a, () => b));
}
patch('v2/src/game/catalog.js', "reso: { k: 'reso', at: 3, power: 55,", `reso: { k: 'reso', at: ${AT}, power: ${P},`);
if (U) patch('v2/src/battle/rules.js', "if (r === 'acted' || r === 'end') resoAfter(u, foe, ev, n0, T, guards.has(foe));", "if ((r === 'acted' || r === 'end') && actOf(u).tier === 'u') resoAfter(u, foe, ev, n0, T, guards.has(foe));");
console.log(`사본 고침 끝 — 게일캑터 공명 = ${AT}을 모으면 위력 ${P} 확정 치명${U ? ' · 기술로 채우는 +1은 고유 기술만' : ''}`);
