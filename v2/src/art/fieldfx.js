// 환경(필드) 연출 — 환경이 깔린 쪽 땅이 실제로 바뀌고, 깔릴 때 한 번 크게 번짐
//  (2026-10-29 사용자 "환경의 경우도 어느새 체력바 아래에 올라와 있고, 이게 뭔지도 잘 모르겠어" · "소스 찾아가며 적절히 잘 연출해줘")
// 조사:
//  · 포켓몬 필드(터레인) = 깔리면 경기장을 덮고 배경을 바꿈('envelops the field and replaces the background environment' — pokemondb · serebii 필드 기술 설명)
//    → 띠 글자보다 먼저 땅이 바뀌어야 '무엇이 · 어디에' 깔렸는지 보임. 경기장 전체(아침 · 밤)는 하늘 · 빛까지 바꿈
//  · 전투 가독성 = 같은 자리 · 같은 색 · 일관된 순서(효과 알림이 늦거나 들쭉날쭉하거나 너무 많으면 결과를 운으로 오해 — 전투 피드백 정리 글들)
//    → 깔리는 순간(번지는 고리) → 땅 모습(계속) → 띠(이름 · 남은 턴)로 한 줄로 이어 줌
//  · 다키스트 던전 = 상태는 그림 가까이에 늘 보이게 · 화면 흔들기는 큰 순간에만(자주 흔들면 멀미 — 플레이어 의견) → 흔들기는 쓰지 않음
//  · 도트 = 1칸 = 1화소 · 색 몇 개 · 해시로 불규칙(statusfx.js 와 같은 원칙) — 매 장 점 수백 개 이하(발열 — 개발 참고 §8)
// 좌표 = 경기장 판(battle.js 무대 — 받침 가운데 P[편] = [x, y]) · 상대 쪽(먼 받침)은 원근으로 작게

export const ARRIVE_MS = 900;   // 깔리는 연출 길이(번지는 고리 · 땅이 자라남)
const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const oQ = x => 1 - (1 - x) * (1 - x);
const hash = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 0x9e37, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function dot(g, x, y, col, a = 1, s = 1) { if (a <= 0.02) return; const c = g.c, p = c.globalAlpha; c.globalAlpha = p * cl(a); g.rect(Math.round(x), Math.round(y), s, s, col); c.globalAlpha = p; }
function blob(g, cx, cy, rx, ry, col, a) { if (a <= 0.02 || rx < 1 || ry < 1) return; const c = g.c, p = c.globalAlpha; c.globalAlpha = p * cl(a); g.ellipse(Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry), col); c.globalAlpha = p; }
function ring(g, cx, cy, rx, ry, col, a) { if (a <= 0.02 || rx < 2) return; const c = g.c, p = c.globalAlpha; c.globalAlpha = p * cl(a); g.ellipseRing(Math.round(cx), Math.round(cy), Math.round(rx), Math.max(1, Math.round(ry)), col); c.globalAlpha = p; }
function seg(g, x0, y0, x1, y1, col, a) { if (a <= 0.02) return; const c = g.c, p = c.globalAlpha; c.globalAlpha = p * cl(a); g.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), col); c.globalAlpha = p; }

// 편마다 땅 넓이(받침보다 한 둘레 크게) — 상대 쪽 = 먼 받침(납작)
const AREA = { me: { rx: 66, ry: 24 }, foe: { rx: 54, ry: 15 } };
// 환경 색(띠 윗줄 · 깔리는 고리)
export const FIELD_COL = { inferno: '#ff6a3a', miasma: '#b866ff', gale: '#c0a8ff', storm: '#9a7bff', cave: '#d9b27a', thornTrap: '#9fd36a', orbTrap: '#c9a8ff', morning: '#ffd27a', night: '#8a8fd8' };
const WIDE = new Set(['morning', 'night']);   // 경기장 전체(양쪽 앞 식물에 같이 걸림)

// ── 편마다 땅 ──
// 지옥: 그을린 땅 + 받침 둘레에서 바깥으로 갈라진 틈(속 노랑 · 바깥 주황, 숨 쉬듯 밝아짐) + 테두리 불꽃
function inferno(g, x, y, A, t, q, sd) {
  const RX = A.rx * (0.3 + 0.7 * oQ(q)), RY = A.ry * (0.3 + 0.7 * oQ(q));
  blob(g, x, y + 1, RX, RY, '#2a0604', 0.6);
  blob(g, x, y + 1, RX * 0.84, RY * 0.84, '#5a1208', 0.42);
  const pulse = 0.72 + 0.28 * Math.sin(t / 240);
  for (let k = 0; k < 10; k++) {
    const a0 = (k / 10) * Math.PI * 2 + hash(k, sd) * 0.45, reach = 0.34 + 0.12 * hash(k, sd + 1);
    let ox = x + Math.cos(a0) * RX * 0.58, oy = y + Math.sin(a0) * RY * 0.58;
    const n = 5;
    for (let s = 1; s <= n; s++) {
      if (s / n > q * 1.2) break;   // 깔릴 때 안쪽부터 갈라져 나감
      const rr = 0.58 + reach * (s / n), a = a0 + (hash(k * 13 + s, sd) - 0.5) * 0.5, nx = x + Math.cos(a) * RX * rr, ny = y + Math.sin(a) * RY * rr;
      seg(g, ox, oy + 1, nx, ny + 1, '#7a1608', 0.9);
      seg(g, ox, oy, nx, ny, '#ff6a1a', pulse);
      if (s < n - 1) seg(g, ox, oy, nx, ny, '#ffd27a', pulse * 0.75 * (1 - s / n));
      ox = nx; oy = ny;
    }
  }
  if (q < 0.4) return;
  for (let k = 0; k < 14; k++) {   // 테두리 불꽃 혀(밑 3칸 폭 → 2칸 → 끝 1칸 · 앞쪽 9칸 · 뒤쪽 7칸 · 일렁임 — 2026-10-29 녹화: 4~5칸 불꽃은 폰에서 점으로만 보임)
    const a = (k / 14) * Math.PI * 2 + 0.2, sc = A.rx / 66, fx = x + Math.cos(a) * RX * 0.97, fy = y + Math.sin(a) * RY * 0.97;
    const h = Math.round((Math.sin(a) > 0 ? 9 : 7) * sc * (0.55 + 0.45 * Math.sin(t / 85 + k * 1.7)) * cl((q - 0.4) / 0.6));
    for (let d = 0; d < h; d++) {
      const w = d < h * 0.45 ? 3 : d < h - 1 ? 2 : 1, sx = Math.round(fx + (d > 1 ? Math.sin(t / 60 + k + d * 0.7) * (d / h) * 1.5 : 0)) - (w >> 1);
      const col = d === h - 1 ? '#fff3c4' : d >= h - 3 ? '#ffc23a' : d === 0 ? '#c8281e' : '#ff6a1a';
      for (let i = 0; i < w; i++) dot(g, sx + i, fy - d, w === 3 && i === 2 ? '#c8281e' : col, 0.95);
    }
  }
}
// 독안개: 낮게 깔린 보라 안개 덩이 넷이 천천히 맴돌고 거품이 톡톡
function miasma(g, x, y, A, t, q, sd) {
  const k0 = oQ(q);
  for (let k = 0; k < 5; k++) {
    const a = t / 2600 * (k % 2 ? 1 : -1) + k * 1.3, rx = A.rx * (0.42 + 0.12 * hash(k, sd)) * k0, ry = A.ry * 0.55 * k0;
    blob(g, x + Math.cos(a) * A.rx * 0.45 * k0, y - 1 + Math.sin(a) * A.ry * 0.4, rx, ry, k % 2 ? '#6a2aa8' : '#8a40c8', 0.26);
  }
  blob(g, x, y, A.rx * 0.9 * k0, A.ry * 0.75 * k0, '#b866ff', 0.12);
  for (let k = 0; k < 7; k++) {   // 거품: 땅에서 솟아 4~8칸 오르다 톡
    const per = 1300 + hash(k, sd + 4) * 900, b = (t + hash(k, sd + 5) * per) % per, u = b / per;
    const bx = x + (hash(k, sd + 6) - 0.5) * A.rx * 1.5 * k0, by = y + (hash(k, sd + 7) - 0.5) * A.ry * 1.2 - u * 8;
    if (u < 0.85) { dot(g, bx, by, '#e0b8ff', 0.9 * k0); dot(g, bx + 1, by, '#c890f0', 0.7 * k0); } else { dot(g, bx - 1, by, '#f0d8ff', 0.8 * k0); dot(g, bx + 1, by, '#f0d8ff', 0.8 * k0); }
  }
}
// 강풍: 땅 위를 모래 줄이 바람 방향으로 쓸고 감(화면을 가로지르는 바람 줄 · 몸 흔들림은 statusfx drawSfxMap · swayOf)
function gale(g, x, y, A, t, q, sd, dir = 1) {
  for (let k = 0; k < 7; k++) {
    const per = 900 + hash(k, sd) * 500, u = ((t + hash(k, sd + 1) * per) % per) / per, len = 6 + Math.round(hash(k, sd + 2) * 8);
    const sx = x - dir * A.rx + dir * u * A.rx * 2, sy = y + (hash(k, sd + 3) - 0.5) * A.ry * 1.4;
    for (let d = 0; d < len; d++) dot(g, sx - dir * d, sy, d === 0 ? '#f0e0b8' : '#cdb48a', 0.75 * q * Math.sin(Math.PI * u) * (1 - d / len));
  }
}
// 폭풍(강풍 + 폭풍 공명): 강풍 + 그 쪽 위에 먹구름 · 가끔 번개가 땅에 꽂힘
const CLOUD = ['....xxxxx.......', '..xxxxxxxxxx....', '.xxxxxxxxxxxxxx.', 'xxxxxxxxxxxxxxxx', '.xxxxxxxxxxxxxx.'];
function stormSky(g, x, y, A, t, q, sd, top) {
  const cy = Math.max(top + 4, y - 128), cx = x - 24, f = oQ(q);
  CLOUD.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch === 'x') for (let s = 0; s < 3; s++) for (let u = 0; u < 3; u++) dot(g, cx + dx * 3 + s, cy + dy * 3 + u, dy === 0 || (dy === 1 && dx < 5) ? '#6a6a8a' : '#3a3a58', 0.92 * f); }));
  const per = 2600, b = (t + sd * 37) % per;
  if (b < 140 && q >= 1) {   // 번개(140ms): 구름 밑에서 땅까지 지그재그
    let bx = x - 4 + (hash(Math.floor(t / per), sd) - 0.5) * 20, by = cy + 15;
    while (by < y - 4) { const nx = bx + (hash(by | 0, sd) - 0.5) * 10, ny = by + 7; seg(g, bx, by, nx, ny, '#fff6c0', 1); seg(g, bx + 1, by, nx + 1, ny, '#ffd84a', 0.8); bx = nx; by = ny; }
    blob(g, x, y, A.rx * 0.5, A.ry * 0.5, '#fff6c0', 0.35 * (1 - b / 140));
  }
}
// 동굴(스톤캡): 그 쪽이 어둑해지고 뒤쪽 둘레에 돌기둥이 솟음 + 설치물(자갈밭 = 자갈 · 용암지대 = 붉은 틈 · 지반붕괴 = 깨진 땅)
function cave(g, x, y, A, t, q, sd, add = []) {
  const f = oQ(q);
  blob(g, x, y + 1, A.rx * f, A.ry * f, '#1a140e', 0.32);
  for (let k = 0; k < 7; k++) {   // 뒤쪽 반 둘레(위쪽 호)에 돌기둥 — 아래에서 위로 솟아오름
    const a = Math.PI + (k + 0.5) / 7 * Math.PI, sx = x + Math.cos(a) * A.rx * 0.95, sy = y + Math.sin(a) * A.ry * 0.95, h = Math.round((6 + hash(k, sd) * 8) * f), w = 3 + (k % 2);
    for (let d = 0; d < h; d++) { const ww = Math.max(1, Math.round(w * (1 - d / h))); g.rect(Math.round(sx - ww / 2), Math.round(sy - d), ww, 1, d < 2 ? '#4a3a24' : d > h - 3 ? '#d8bc88' : '#a08458'); }
  }
  if (add.includes('gravel')) for (let k = 0; k < 14; k++) { const a = hash(k, sd + 3) * Math.PI * 2, r = 0.5 + 0.45 * hash(k, sd + 4); dot(g, x + Math.cos(a) * A.rx * r, y + Math.sin(a) * A.ry * r, k % 3 ? '#8a7a64' : '#c8b898', f, 2); }
  if (add.includes('lava')) for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.6, r0 = 0.55, r1 = 0.9, pulse = 0.7 + 0.3 * Math.sin(t / 200 + k); seg(g, x + Math.cos(a) * A.rx * r0, y + Math.sin(a) * A.ry * r0, x + Math.cos(a + 0.2) * A.rx * r1, y + Math.sin(a + 0.2) * A.ry * r1, '#ff6a1a', pulse * f); }
  if (add.includes('collapse')) for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.3, cx = x + Math.cos(a) * A.rx * 0.78, cy = y + Math.sin(a) * A.ry * 0.78; g.rect(Math.round(cx - 3), Math.round(cy - 1), 6, 3, '#5a4630'); g.rect(Math.round(cx - 3), Math.round(cy - 1), 6, 1, '#8a7050'); }
}
// 쏜위드 덫(내 쪽 · 개수만큼): 받침 앞 땅에 가시 덫(입 벌린 고리 + 흰 가시)
function thornTrap(g, x, y, A, t, q, sd, n = 1) {
  for (let i = 0; i < Math.min(3, n); i++) {
    const a = Math.PI * (0.18 + 0.32 * i), tx = x + Math.cos(a) * A.rx * 0.82 * (i % 2 ? -1 : 1), ty = y + Math.sin(a) * A.ry * 0.82, pop = oQ(cl(q * 1.4 - i * 0.2));
    if (pop <= 0) continue;
    const rx = 6 * pop, ry = 2.4 * pop;
    ring(g, tx, ty, rx, ry, '#24381a', 1); ring(g, tx, ty - 1, rx, ry, '#5a7a30', 1);
    for (let k = 0; k < 6; k++) { const b = (k / 6) * Math.PI * 2, sx = tx + Math.cos(b) * rx, sy = ty - 1 + Math.sin(b) * ry; dot(g, sx, sy - 1 - (Math.sin(b) < 0 ? 1 : 0), '#f0e8c0', pop); }
  }
}
// 봉인 구슬 덫(내 쪽 · 개수만큼): 땅에 박힌 보랏빛 구슬이 숨 쉬듯 빛남
function orbTrap(g, x, y, A, t, q, sd, n = 1) {
  for (let i = 0; i < Math.min(5, n); i++) {
    const a = Math.PI * (0.12 + 0.19 * i), ox = x + Math.cos(a) * A.rx * 0.8 * (i % 2 ? -1 : 1), oy = y + Math.sin(a) * A.ry * 0.8, p = 0.6 + 0.4 * Math.sin(t / 220 + i), f = oQ(cl(q * 1.3 - i * 0.12));
    blob(g, ox, oy, 4, 2, '#c9a8ff', 0.25 * p * f);
    g.alpha(f, () => { g.disc(Math.round(ox), Math.round(oy - 2), 2, '#3a1a6a'); g.disc(Math.round(ox), Math.round(oy - 2), 1, '#c9a8ff'); });
    dot(g, ox - 1, oy - 3, '#ffffff', p * f);
  }
}

// ── 경기장 전체(아침 · 밤) ──
// 아침: 위에서 금빛이 내려오고 비스듬한 빛줄기 셋이 천천히 흐름(하늘이 밝아짐)
function morningAir(g, area, t, q) {
  const [ax, ay, aw, ah] = area, c = g.c, f = oQ(q);
  const gr = c.createLinearGradient(0, ay, 0, ay + ah * 0.75);
  gr.addColorStop(0, `rgba(255,224,150,${0.3 * f})`); gr.addColorStop(1, 'rgba(255,224,150,0)');
  c.fillStyle = gr; c.fillRect(ax, ay, aw, ah);
  for (let k = 0; k < 3; k++) {   // 빛줄기(왼쪽 위 → 오른쪽 아래, 폭 14~22)
    const x0 = ax + 30 + k * 80 + Math.sin(t / 1800 + k) * 10, w = 14 + k * 4, p = c.globalAlpha;
    c.globalAlpha = p * 0.09 * f; c.fillStyle = '#fff4d0';
    c.beginPath(); c.moveTo(x0, ay); c.lineTo(x0 + w, ay); c.lineTo(x0 + w + ah * 0.55, ay + ah); c.lineTo(x0 + ah * 0.55, ay + ah); c.closePath(); c.fill();
    c.globalAlpha = p;
  }
}
// 밤: 경기장 전체가 남빛으로 어두워지고 하늘에 별이 깜빡
function nightAir(g, area, t, q, sky) {
  const [ax, ay, aw, ah] = area, f = oQ(q), c = g.c, p = c.globalAlpha;
  c.globalAlpha = p * 0.42 * f; c.fillStyle = '#0a0f2a'; c.fillRect(ax, ay, aw, ah); c.globalAlpha = p;
  for (let k = 0; k < 22; k++) {
    const sx = ax + hash(k, 91) * aw, sy = ay + 4 + hash(k, 92) * sky, tw = 0.5 + 0.5 * Math.sin(t / (300 + hash(k, 93) * 500) + k);
    dot(g, sx, sy, '#ffffff', f * tw); if (k % 4 === 0) { dot(g, sx - 1, sy, '#c8d8ff', f * tw * 0.6); dot(g, sx + 1, sy, '#c8d8ff', f * tw * 0.6); }
  }
}

// 그 편에 깔린 환경 목록(battle.js envs 와 같은 모양 { id, n, add, exp }) + 지금 깔리는 중인 것(arrive) → 땅 · 하늘
//  env = { me: [...], foe: [...] } · arrive = [{ who, id, t0 }] · P = { me: [x, y], foe: [x, y] } · area = [x, y, w, h] · sky = 하늘 높이(별 자리)
const growOf = (arrive, who, id, t) => { const a = arrive.find(e => e.id === id && (WIDE.has(id) || e.who === who) && t - e.t0 >= 0); return a ? cl((t - a.t0) / (ARRIVE_MS * 0.7)) : 1; };
export function fieldGround(g, env, arrive, t, P) {
  for (const who of ['foe', 'me']) {
    const [x, y] = P[who] || [0, 0], A = AREA[who], sd = who === 'me' ? 3 : 7;
    for (const e of env[who] || []) {
      const q = growOf(arrive, who, e.id, t);
      if (e.id === 'inferno') inferno(g, x, y, A, t, q, sd);
      else if (e.id === 'miasma') miasma(g, x, y, A, t, q, sd);
      else if (e.id === 'gale' || e.id === 'storm') gale(g, x, y, A, t, q, sd);
      else if (e.id === 'cave') cave(g, x, y, A, t, q, sd, e.add || []);
      else if (e.id === 'thornTrap') thornTrap(g, x, y, A, t, q, sd, e.n || 1);
      else if (e.id === 'orbTrap') orbTrap(g, x, y, A, t, q, sd, e.n || 1);
    }
    for (const a of arrive) {   // 깔리는 순간: 그 쪽 땅에서 고리 둘이 납작하게 번짐
      const age = t - a.t0; if (a.who !== who || age < 0 || age >= ARRIVE_MS || WIDE.has(a.id)) continue;
      const col = FIELD_COL[a.id] || '#ffffff';
      for (const lag of [0, 160]) { const u = cl((age - lag) / (ARRIVE_MS * 0.75)); if (u <= 0 || u >= 1) continue; const rx = 8 + oQ(u) * A.rx * 1.25; ring(g, x, y, rx, rx * (A.ry / A.rx), col, 1 - u); ring(g, x, y + 1, rx, rx * (A.ry / A.rx), '#ffffff', (1 - u) * 0.5); }
    }
  }
}
// 식물 위에 겹치는 것(불티 · 안개 결 · 먹구름 · 아침 빛 · 밤 어둠) + 깔리는 순간의 반짝 — 식물을 다 그린 뒤
export function fieldAir(g, env, arrive, t, P, area, sky = 70) {
  const wide = new Set();
  for (const who of ['foe', 'me']) {
    const [x, y] = P[who] || [0, 0], A = AREA[who], sd = who === 'me' ? 3 : 7;
    for (const e of env[who] || []) {
      const q = growOf(arrive, who, e.id, t);
      if (WIDE.has(e.id)) { wide.add(e.id); continue; }
      if (e.id === 'inferno' && q > 0.3) for (let k = 0; k < 10; k++) {   // 불티: 땅에서 솟아 46칸 오르며 노랑 → 주황 → 사라짐
        const per = 1500 + hash(k, sd + 9) * 900, u = ((t + hash(k, sd + 8) * per) % per) / per, ex = x + (hash(k, sd + 7) - 0.5) * A.rx * 1.6 + Math.sin(u * 9 + k) * 2, ey = y - 2 - u * 46;
        dot(g, ex, ey, u < 0.4 ? '#fff3c4' : u < 0.7 ? '#ffc23a' : '#ff6a1a', (1 - u) * 0.95);
      }
      if (e.id === 'miasma') for (let k = 0; k < 4; k++) {   // 안개 결: 식물 밑동 높이로 옅게 흘러감
        const u = ((t / 4200 + k * 0.27) % 1), wx = x - A.rx + u * A.rx * 2, wy = y - 8 - k * 7;
        blob(g, wx, wy, 14, 3, '#b866ff', 0.1 * Math.sin(Math.PI * u) * q);
      }
      if (e.id === 'storm') stormSky(g, x, y, A, t, q, sd, area[1]);   // 폭풍 = 강풍(땅) + 먹구름 · 번개(하늘)
    }
  }
  for (const id of wide) { const q = Math.min(growOf(arrive, 'me', id, t), growOf(arrive, 'foe', id, t)); if (id === 'morning') morningAir(g, area, t, q); else nightAir(g, area, t, q, sky); }
  // 깔리는 순간 경기장 전체(아침 = 금빛 번쩍 · 밤 = 위에서 어둠이 내려옴은 nightAir 의 자라남) · 한쪽 환경 = 그 땅에서 빛 알갱이가 튐
  const seen = new Set();
  for (const a of arrive) {
    const age = t - a.t0; if (age < 0 || age >= ARRIVE_MS) continue;
    if (WIDE.has(a.id)) { if (seen.has(a.id)) continue; seen.add(a.id); if (a.id === 'morning') { const c = g.c, p = c.globalAlpha; c.globalAlpha = p * 0.5 * (1 - age / ARRIVE_MS); c.fillStyle = '#fff2c0'; c.fillRect(area[0], area[1], area[2], area[3]); c.globalAlpha = p; } continue; }
    const [x, y] = P[a.who] || [0, 0], col = FIELD_COL[a.id] || '#ffffff', u = cl(age / (ARRIVE_MS * 0.8));
    for (let k = 0; k < 14; k++) { const an = (k / 14) * Math.PI * 2, r = oQ(u) * (a.who === 'me' ? 58 : 46), h = Math.sin(Math.PI * u) * (10 + hash(k, 3) * 10); dot(g, x + Math.cos(an) * r, y + Math.sin(an) * r * 0.36 - h, k % 3 ? col : '#ffffff', 1 - u, 2); }
  }
}
