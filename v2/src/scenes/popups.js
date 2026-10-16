// 장면 위에 뜨는 판들(라우터가 장면을 그린 뒤 main.js 가 그림 — 누르기도 장면보다 위):
//  ① 재배사 레벨업 상자(사용자 2026-10-16 "레벨업하면 클래시로얄처럼 보상을") — 상자가 통통 → 누르면 뚜껑이 열리며 빛 → 보상이 하나씩 튀어나옴 → 확인
//  ② 받은 것 판(수확 · 탐사 · 해체) ③ 예/아니오 ④ 설정(계정 · 로그아웃 · 주소 복사)
import { C, RAMP } from '../art/palette.js';
import { icon } from '../art/icons.js';
import { button, fmt } from '../art/ui.js';
import { T, holo } from '../art/theme.js';
import { bigTitle, seedArt } from './common.js';
import { SPECIES, SKILLS, RARITY_COL, ORBIT_LV, PLANETS, farmSlots, TIER_NAME, TIERS, LEAGUES, LEAGUE_KEYS } from '../game/catalog.js';
import { net } from '../net/api.js';
import { openForm } from '../core/form.js';
import { sfx, SOUND, setSfxOn, setMusicOn } from '../core/sound.js';

const ease = k => 1 - (1 - k) ** 3;
const back = k => { const c = 1.7; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
// 보상 한 칸의 아이콘 · 이름 · 수
export const KIND = {
  credits: { icon: 'coin', name: '돈' }, gems: { icon: 'gem', name: '보석' }, water: { icon: 'water', name: '물' }, fert: { icon: 'fert', name: '비료' },
  regress: { icon: 'potion', name: '회귀 주사' }, fuel: { icon: 'energy', name: '연료 캡슐' }, parts: { icon: 'gear', name: '부품' }, seed: { icon: 'seed', name: '종자' }, scion: { icon: 'vine', name: '접목 가지' }, skill: { icon: 'sparkle', name: '새 기술' },
};
export function rewardList(box) {   // 레벨업 상자 → 보상 칸 목록
  const out = [];
  for (const k of ['credits', 'water', 'fert', 'gems', 'regress', 'fuel']) if (box[k]) out.push({ kind: k, n: box[k], rar: k === 'gems' || k === 'regress' ? 4 : k === 'credits' ? 0 : 1 });
  if (box.seed && typeof box.seed === 'object') out.push({ kind: 'seed', seed: box.seed, rar: 3 });
  return out;
}
export function gotLabel(r) {
  if (r.kind === 'seed') { const sp = SPECIES[r.seed.key]; return { name: (r.seed.legend ? '전설 ' : '') + (r.seed.shiny ? '색 변종 ' : '') + (sp ? sp.name : '종자'), n: '종자' }; }
  if (r.kind === 'scion') { const s = SKILLS[r.skill]; return { name: s ? s.name : '접목 가지', n: '접목 · ' + (s ? TIER_NAME[s.tier] : '') }; }
  if (r.kind === 'skill') { const s = SKILLS[r.skill]; return { name: s ? s.name : '새 기술', n: r.to || '새 기술' }; }
  return { name: KIND[r.kind] ? KIND[r.kind].name : r.kind, n: '+' + fmt(r.n || 1) };
}
// 보상 칸(가로 w × 세로 44): 희귀도 테 · 아이콘(2배) · 수 · 이름
export function gotCell(g, x, y, w, r, k = 1) {
  const col = RARITY_COL[Math.max(0, Math.min(4, r.rar || 0))], L = gotLabel(r), h = 46;
  holo(g, x, y, w, h, { fill: '#0d1f30', fill2: '#12283c', frame: col, frameHi: '#ffffff', frameLo: '#2a4258' }, 16);
  if (k < 1) return;
  if (r.kind === 'seed') { const sp = SPECIES[r.seed.key]; seedArt(g, x + 15, y + 23, sp ? sp.el : 'grass'); }
  else { const ic = icon((KIND[r.kind] || KIND.credits).icon); g.img(ic, x + 15 - ic.width, y + 23 - ic.height, 2); }
  g.text(L.n, x + 32, y + 7, { font: 'bold', color: col });
  let nm = L.name; while (g.textW(nm) > w - 38 && nm.length > 2) nm = nm.slice(0, -1);
  g.text(nm, x + 32, y + 25, { color: '#cfe8f8' });
}

// ── ① 레벨업 상자 ──
function chestArt(g, cx, by, open, t) {   // 상자(가로 64): by = 바닥. open 0~1 = 뚜껑이 열린 정도
  const W = 64, H = 34, x = Math.round(cx - W / 2), y = by - H;
  const wood = ['#4a2a14', '#6b3e1f', '#8a5530', '#a86a3c'], gold = ['#7a5418', '#c89a30', '#f0c858', '#fff0a8'];
  g.rect(x - 2, by - 2, W + 4, 4, '#05070f');
  g.rect(x, y, W, H, wood[1]); g.rect(x + 2, y + 2, W - 4, H - 6, wood[2]); for (let i = 0; i < 4; i++) g.rect(x + 2, y + 6 + i * 7, W - 4, 1, wood[0]);
  g.rect(x, y, W, 3, gold[1]); g.rect(x, y, W, 1, gold[3]); g.rect(x, by - 4, W, 4, gold[1]); g.rect(x, by - 1, W, 1, gold[0]);
  for (const sx of [x, x + W - 6]) { g.rect(sx, y, 6, H, gold[1]); g.rect(sx + 1, y, 1, H, gold[3]); g.rect(sx + 5, y, 1, H, gold[0]); }
  g.rect(x - 1, y - 1, W + 2, 1, '#05070f'); g.rect(x - 1, y, 1, H, '#05070f'); g.rect(x + W, y, 1, H, '#05070f');
  // 뚜껑: 닫힘 = 둥근 지붕, 열림 = 뒤로 젖혀져 위로 올라감
  const lh = 16, ly = y - lh + 2 - Math.round(open * 22), squash = Math.round(open * 9);
  for (let j = 0; j < lh - squash; j++) { const ins = Math.max(0, 6 - Math.round(Math.sqrt(Math.max(0, j * 6)))), yy = ly + j + squash; g.rect(x + ins, yy, W - ins * 2, 1, j < 2 ? gold[2] : j % 5 === 0 ? wood[0] : wood[3 - (j > 8 ? 1 : 0)]); }
  g.rect(x, ly + lh - 2, W, 2, gold[1]);
  // 자물쇠
  const lx = Math.round(cx - 6), lockY = y - 2 - Math.round(open * 22);
  g.rect(lx, lockY, 12, 12, '#05070f'); g.rect(lx + 1, lockY + 1, 10, 10, gold[2]); g.rect(lx + 1, lockY + 1, 10, 2, gold[3]); g.rect(lx + 5, lockY + 5, 2, 4, '#4a2a14');
  if (!open) { const sh = (Math.floor(t / 120) % 12); if (sh < 3) g.rect(x + 8 + sh * 18, y + 6, 2, 10, 'rgba(255,255,255,0.35)'); }
}
function rays(g, cx, cy, t, k, col) {
  const n = 12, rot = t / 2600;
  g.alpha(0.28 * k, () => { for (let i = 0; i < n; i += 2) { const a0 = rot + i * (Math.PI * 2 / n), a1 = a0 + Math.PI / n; g.poly([[cx, cy], [cx + Math.cos(a0) * 230, cy + Math.sin(a0) * 230], [cx + Math.cos(a1) * 230, cy + Math.sin(a1) * 230]], col); } });
}
const LC = { cy: 300, gridY: 352 };
function levelChest(app, item) {
  const season = item.kind === 'season', key = season ? 'season' + item.n : item.level;   // 시즌 마감 상자도 같은 연출(2026-10-16 리그 · 시즌)
  const { g, W, H, t, input } = app;
  const o = app.chest && app.chest.item === item ? app.chest : (app.chest = { item, t0: t, open: null }, sfx('levelup'), app.chest);
  const list = rewardList(item.box), slotsUp = season ? 0 : farmSlots(item.level) - farmSlots(item.level - 1);
  const orbit = season ? null : Object.entries(ORBIT_LV).find(([, lv]) => lv === item.level);
  g.c.fillStyle = 'rgba(4,7,14,0.86)'; g.c.fillRect(0, 0, W, H);
  input.hit('chest_block', 0, 0, W, H, () => {});
  const k0 = ease(Math.min(1, (t - o.t0) / 380));
  bigTitle(g, season ? `시즌 ${item.n} 마감!` : '재배사 레벨 업!', W / 2, 70 - Math.round((1 - k0) * 20), { top: '#fff6c8', mid: '#ffd84a', low: '#f79617', shadow: '#5a2e0a' });
  bigTitle(g, season ? TIERS[Math.max(0, ...Object.values(item.best || {}))] : 'Lv ' + item.level, W / 2, 112, { font: 'huge', top: '#ffffff', mid: '#c8f8ec', low: '#8efbdb', shadow: '#1e3a5a' });
  const op = o.open == null ? 0 : ease(Math.min(1, (t - o.open) / 260));
  if (o.open != null) rays(g, W / 2, LC.cy - 30, t, op, '#ffd84a');
  const bob = o.open == null ? Math.round(Math.abs(Math.sin(t / 260)) * -6) : 0, sq = o.open == null && Math.abs(Math.sin(t / 260)) < 0.12 ? 1 : 0;
  chestArt(g, W / 2, LC.cy + bob + sq, op, t);
  if (o.open == null) {
    g.text('상자를 눌러 열어요', W / 2, LC.cy + 16, { font: 'bold', color: '#ffe8a8', align: 'center', outline: C.ink });
    input.hit('chest_open', W / 2 - 50, LC.cy - 70, 100, 90, () => { o.open = app.t; }, 6);
    return;
  }
  // 보상: 하나씩(230ms) 튀어나와 두 줄 칸에 자리 잡음
  const cw = 116, gap = 8, x0 = Math.round((W - cw * 2 - gap) / 2);
  const extra = [];
  if (slotsUp > 0) extra.push(`스마트팜 칸 +${slotsUp} (이제 ${farmSlots(item.level)}칸)`);
  if (orbit) extra.push(`${orbit[0]}궤도가 열렸어요 — ${PLANETS.filter(p => p.orbit === +orbit[0]).map(p => p.name).join(' · ')}`);
  if (season) { extra.push(LEAGUE_KEYS.map(k => `${LEAGUES[k].short} ${TIERS[(item.best || {})[k] || 0]}`).join(' · ')); if (item.title) extra.push(`칭호: ${item.title}`); extra.push('새 시즌 — 리그마다 두 단계 내려가 예선부터'); }
  list.forEach((r, i) => {
    const age = t - o.open - 280 - i * 230; if (age < 0) return;
    const k = Math.min(1, age / 260), e = back(k), tx = x0 + (i % 2) * (cw + gap), ty = LC.gridY + Math.floor(i / 2) * 52;
    const sx = W / 2 - cw / 2 + (tx - (W / 2 - cw / 2)) * e, sy = LC.cy - 40 + (ty - (LC.cy - 40)) * e;
    gotCell(g, Math.round(sx), Math.round(sy), cw, r, k);
    if (age < 120) { g.alpha(1 - age / 120, () => g.rect(Math.round(sx), Math.round(sy), cw, 46, '#ffffff')); }
  });
  const done = t - o.open - 280 - list.length * 230 > 200;
  let y = LC.gridY + Math.ceil(list.length / 2) * 52 + 4;
  if (done) for (const s of extra) { g.text(s, W / 2, y, { font: 'bold', color: '#9ff0b0', align: 'center', outline: C.ink }); y += 17; }
  if (done) button(app, 'chest_ok', W / 2 - 60, Math.min(H - 52, y + 8), 120, 34, '확인', { style: 'gold', font: 'head', onTap: () => { (app.ackedLv || (app.ackedLv = new Set())).add(key); app.chest = null; app.act('ack', { n: 1 }); } });   // 서버가 맨 앞 하나를 지움(요청은 차례대로) — 응답 전까지 같은 상자가 다시 안 뜨게 레벨로 기억
  else input.hit('chest_skip', 0, 0, W, H, () => { o.open -= 5000; });   // 누르면 남은 보상 바로
}

// ── ② 받은 것 판 ──
export function showGot(app, title, got, sub) { app.popup = { title, got: got || [], sub, t0: app.t }; sfx('coin'); }
function gotPopup(app, P) {
  const { g, W, H, t, input } = app, n = P.got.length, rows = Math.ceil(n / 2), h = 86 + rows * 52 + (P.sub ? 16 : 0), y = Math.round((H - h) / 2) - 10, x = 14, w = W - 28;
  g.c.fillStyle = 'rgba(4,7,14,0.72)'; g.c.fillRect(0, 0, W, H);
  input.hit('got_block', 0, 0, W, H, () => {});
  const k = ease(Math.min(1, (t - P.t0) / 240));
  holo(g, x, y + Math.round((1 - k) * 16), w, h, T.card || T.panel, 16);
  const yy = y + Math.round((1 - k) * 16), PT = T.ptext;
  g.text(P.title, W / 2, yy + 10, { font: 'head', color: PT.main, align: 'center' });
  if (P.sub) g.text(P.sub, W / 2, yy + 30, { color: PT.sub, align: 'center' });
  const cw = Math.floor((w - 24 - 8) / 2), gy = yy + (P.sub ? 48 : 34);
  P.got.forEach((r, i) => { const age = t - P.t0 - 120 - i * 90; if (age < 0) return; gotCell(g, x + 12 + (i % 2) * (cw + 8), gy + Math.floor(i / 2) * 52, cw, r, Math.min(1, age / 160)); });
  if (!n) g.text('받은 것이 없어요', W / 2, gy + 10, { color: PT.sub, align: 'center' });
  button(app, 'got_ok', W / 2 - 50, yy + h - 42, 100, 30, '확인', { style: 'gold', font: 'head', onTap: () => { app.popup = null; } });
}

// ── ③ 예/아니오 ──
export function ask(app, msg, sub, onYes, yes = '네') { app.confirm = { msg, sub, onYes, yes, t0: app.t }; }
function confirmBox(app, Q) {
  const { g, W, H, input } = app, w = W - 40, h = Q.sub ? 112 : 94, x = 20, y = Math.round(H / 2 - h / 2) - 20, PT = T.ptext;
  g.c.fillStyle = 'rgba(4,7,14,0.72)'; g.c.fillRect(0, 0, W, H);
  input.hit('cf_block', 0, 0, W, H, () => {});
  holo(g, x, y, w, h, T.card || T.panel, 16);
  g.text(Q.msg, W / 2, y + 14, { font: 'bold', color: PT.main, align: 'center' });
  if (Q.sub) g.para ? g.para(Q.sub, x + 14, y + 34, w - 28, { color: PT.sub }) : g.text(Q.sub, W / 2, y + 34, { color: PT.sub, align: 'center' });
  const bw = Math.floor((w - 36) / 2);
  button(app, 'cf_no', x + 12, y + h - 42, bw, 30, '아니요', { style: 'night', font: 'bold', onTap: () => { app.confirm = null; } });
  button(app, 'cf_yes', x + 24 + bw, y + h - 42, bw, 30, Q.yes, { style: 'gold', font: 'bold', onTap: () => { const f = Q.onYes; app.confirm = null; f && f(); } });
}

// ── ④ 설정 ──
function settingsSheet(app) {
  const { g, W, H, input } = app, x = 14, w = W - 28, h = 290, y = 70, PT = T.ptext, u = app.user;
  g.c.fillStyle = 'rgba(4,7,14,0.72)'; g.c.fillRect(0, 0, W, H);
  input.hit('st_block', 0, 0, W, H, () => { app.sheet = null; });
  input.hit('st_in', x, y, w, h, () => {});
  holo(g, x, y, w, h, T.card || T.panel, 16);
  g.text('설정', x + 14, y + 12, { font: 'head', color: PT.main });
  let yy = y + 42;
  g.text(net.offline ? '오프라인 체험(저장 안 됨)' : u ? `계정: ${u.login}` : '로그인 안 함', x + 14, yy, { font: 'bold', color: PT.main }); yy += 18;
  g.text(net.offline ? '서버에 연결하면 진행이 저장돼요' : '하는 일마다 서버에 자동 저장돼요', x + 14, yy, { color: PT.sub }); yy += 26;
  button(app, 'st_copy', x + 14, yy, w - 28, 30, '친구에게 보낼 게임 주소 복사', { style: 'night', icon: 'navShip', onTap: () => {
    const url = location.origin + '/v2/';
    try { navigator.clipboard.writeText(url).then(() => app.toast('주소를 복사했어요'), () => app.toast(url)); } catch { app.toast(url); }
  } }); yy += 40;
  const half = Math.floor((w - 28 - 8) / 2);
  button(app, 'st_sfx', x + 14, yy, half, 30, SOUND.sfx ? '효과음 켬' : '효과음 끔', { style: SOUND.sfx ? 'night' : 'off', icon: 'sparkle', iconTint: true, onTap: () => setSfxOn(!SOUND.sfx) });
  button(app, 'st_music', x + 14 + half + 8, yy, half, 30, SOUND.music ? '음악 켬' : '음악 끔', { style: SOUND.music ? 'night' : 'off', icon: 'heart', iconTint: true, onTap: () => setMusicOn(!SOUND.music) }); yy += 40;
  if (!net.offline && u) button(app, 'st_out', x + 14, yy, w - 28, 30, '로그아웃', { style: 'red', onTap: () => { app.sheet = null; ask(app, '로그아웃할까요?', u.provider === 'google' ? "다시 들어올 땐 '구글로 계속하기'를 누르면 돼요" : '다시 들어올 땐 아이디·비밀번호가 필요해요', () => app.logout()); } });
  yy += 40;
  if (!net.offline && u) button(app, 'st_del', x + 14, yy, half, 26, '계정 지우기', { style: 'off', onTap: () => { app.sheet = null; deleteForm(app); } });
  // 개인정보처리방침(플레이 정책 — 앱 안에서도 볼 수 있어야 함). 앱 웹뷰에선 같은 창, 브라우저에선 새 탭
  button(app, 'st_priv', x + 14 + half + 8, yy, half, 26, '개인정보처리방침', { style: 'off', onTap: () => {
    const url = location.origin + '/v2/privacy.html';
    if (/PulloseumApp/.test(navigator.userAgent)) location.href = url; else window.open(url, '_blank', 'noopener');
  } });
  button(app, 'st_close', W / 2 - 50, y + h - 42, 100, 30, '닫기', { style: 'gold', font: 'bold', onTap: () => { app.sheet = null; } });
}

// 계정 지우기(구글 플레이 정책 — 앱 안에서 지울 수 있어야 함): 아이디 계정 = 비밀번호 · 구글 계정 = 확인 글자 '지우기' → 서버가 계정 · 저장 · 기록 전부 지움
function deleteForm(app) {
  const google = app.user && app.user.provider === 'google';
  openForm(app, {
    title: '계정 지우기', note: '계정과 식물 · 진행 · 기록이 모두 지워지고 되돌릴 수 없어요',
    fields: [google ? { id: 'cf', label: "확인 — '지우기'라고 써 주세요", max: 6 } : { id: 'pw', label: '비밀번호', type: 'password', auto: 'current-password', max: 72 }],
    ok: '영원히 지우기',
    onSubmit: async v => {
      try { await net.req('/api/account/delete', google ? { confirm: v.cf } : { password: v.pw }); } catch (e) { return e.message; }
      app.logout(true); app.toast('계정을 지웠어요');
      return null;
    },
  });
}

const NO_CHEST = new Set(['title', 'starter', 'battle', 'matching', 'room']);
export function drawOverlays(app) {
  const s = app.state;
  if (app.confirm) return confirmBox(app, app.confirm);
  if (app.popup) return gotPopup(app, app.popup);
  if (app.sheet === 'settings') return settingsSheet(app);
  if (s && s.pending && s.pending.length && !NO_CHEST.has(app.router.name) && !app.router.phase) {
    const item = s.pending.find(x => !(app.ackedLv && app.ackedLv.has(x.kind === 'season' ? 'season' + x.n : x.level)));
    if (item && (item.kind === 'level' || item.kind === 'season')) return levelChest(app, item);
  }
}
