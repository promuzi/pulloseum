// 각도를 바꾼 화분 판(같은 3D 화분을 덜 내려다보게 다시 그림) — 전투 바닥에 맞춘 기본 26° 말고:
//  flat = 12°: 대기실 의자 위(2026-10-15 사용자 "대기 화면에서는 화분의 각도를 바꿔줘. 의자랑 안 맞아") — 코덱스 원형 방의 의자 앉는 판은 세로가 가로의 약 0.2배(≈ 12°)
//  far  = 18°: 전투 먼 쪽(상대) 화분(같은 날 "전투시 상대의 화분 각도도 조정해줘") — 멀리 있는 것은 더 옆에서 보이므로 윗면이 납작하게
//  → assets/v2/pots/<화분>_<flat|far>_back.png · _front.png. 흙 가운데 높이는 거의 같고 굽이 아래로 내려가므로(26° 96.55 → 18° 97.9 → 12° 98.6)
//  게임은 그만큼 판을 올려 놓는다(sprites.js drawBig {view}: flat 2칸 · far 1칸).
//   node tools/pixel/big/pot_flat.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPot, POT3 } from './pot3d.mjs';
const here = dirname(fileURLToPath(import.meta.url)), dir = resolve(here, '..', '..', '..', 'assets', 'v2', 'pots');
const VIEWS = { flat: 12, far: 18 };
mkdirSync(dir, { recursive: true });
const foot = el => 73 + 26.2 * Math.cos(el * Math.PI / 180);
for (const [view, el] of Object.entries(VIEWS)) {
  for (const [name, style] of Object.entries(POT3)) {
    const p = renderPot(style, el);
    writeFileSync(resolve(dir, `${name}_${view}_back.png`), p.back.png());
    writeFileSync(resolve(dir, `${name}_${view}_front.png`), p.front.png());
  }
  console.log(`${view} ${el}° → <화분>_${view}_back/front.png · 굽 높이 26° ${foot(26).toFixed(2)} → ${foot(el).toFixed(2)} (차이 ${(foot(el) - foot(26)).toFixed(2)}칸)`);
}
