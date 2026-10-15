// 대기실 의자 위 화분(2026-10-15 사용자 "대기 화면에서는 화분의 각도를 바꿔줘. 의자랑 안 맞아"):
//  코덱스 원형 방의 의자 앉는 판은 세로가 가로의 약 0.2배(≈ 12° 내려다봄)인데 화분은 전투 바닥에 맞춘 26° → 윗면이 너무 보여 떠 보임.
//  같은 3D 화분을 12°로 다시 그려 assets/v2/pots/<화분>_flat_back.png · _flat_front.png. 흙 가운데 높이는 거의 같고(75.7 → 75.9)
//  굽은 2칸 아래(96.55 → 98.6)라 게임은 2칸 올려 놓는다(sprites.js drawBig {flat}).
//   node tools/pixel/big/pot_flat.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPot, POT3 } from './pot3d.mjs';
const here = dirname(fileURLToPath(import.meta.url)), dir = resolve(here, '..', '..', '..', 'assets', 'v2', 'pots');
const EL = 12;
mkdirSync(dir, { recursive: true });
for (const [name, style] of Object.entries(POT3)) {
  const p = renderPot(style, EL);
  writeFileSync(resolve(dir, name + '_flat_back.png'), p.back.png());
  writeFileSync(resolve(dir, name + '_flat_front.png'), p.front.png());
  console.log(name, '→', name + '_flat_back/front.png');
}
const foot = el => 73 + 26.2 * Math.cos(el * Math.PI / 180);
console.log(`굽 높이 26° ${foot(26).toFixed(2)} → ${EL}° ${foot(EL).toFixed(2)} (차이 ${(foot(EL) - foot(26)).toFixed(2)}칸)`);
