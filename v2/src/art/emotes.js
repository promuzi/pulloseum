// 감정 표현(2026-10-16 사용자 "클로얄처럼 간단한 이모지와 정해진 대사 할 수 있는 기능") — 친구 대결 · 봇 판 모두, 방 로비도 같은 말풍선.
//  번호 = 서버가 그대로 전하는 값: 0~5 = 대사(옛 친구 대결 대사 그대로), 6~13 = 도트 이모지(15×15 얼굴). 서버 rooms.mjs 는 0~13만 받음.
//  보낸 쪽 식물 위 말풍선 2.6초: 튀어나옴(0.14초) → 이모지는 한 번 통 튐 → 마지막 0.3초 사라짐
import { rrect } from './ui.js';
import { glyphH } from '../core/text.js';

export const PHRASES = ['잘 부탁해!', '좋은 수!', '아차…', '한 판 더?', '고마워!', '잘 싸웠어!'];
export const EMOJI = ['smile', 'laugh', 'wow', 'cry', 'angry', 'sweat', 'love', 'cool'];
export const EMOJI_NAME = { smile: '웃음', laugh: '폭소', wow: '놀람', cry: '울음', angry: '화남', sweat: '진땀', love: '하트', cool: '여유' };
export const EMOTE_N = PHRASES.length + EMOJI.length, EMOTE_LIFE = 2600;
export const isEmoji = i => i >= PHRASES.length;
// 봇 대답(봇 판에서 내가 보내면 가끔): 대사·이모지 → 어울리는 번호
const E = k => PHRASES.length + EMOJI.indexOf(k);
export const BOT_REPLY = { 0: 0, 1: 4, 2: E('laugh'), 3: E('cool'), 4: E('smile'), 5: 5, [E('smile')]: E('smile'), [E('laugh')]: E('laugh'), [E('wow')]: E('cool'), [E('cry')]: E('sweat'), [E('angry')]: E('laugh'), [E('sweat')]: E('smile'), [E('love')]: E('love'), [E('cool')]: E('wow') };

// ── 도트 이모지(15×15, 한 번 굽고 재사용) ──
const INK = '#3b2610', FACE = '#ffd23a', SHADE = '#eda21e', HI = '#fff4b0', RED = '#e8463a', BLUE = '#5ab4ff', PINK = '#ff8aa8', DARK = '#7a2418', WHITE = '#ffffff';
const built = new Map();
function emojiCanvas(kind) {
  let cv = built.get(kind); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = 15; cv.height = 15;
  const c = cv.getContext('2d'), px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); }, pts = (list, col) => { for (const [x, y] of list) px(x, y, col); };
  const face = kind === 'angry' ? '#ff9a3a' : FACE, shade = kind === 'angry' ? '#e0602a' : SHADE;
  for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {   // 둥근 얼굴: 먹선 · 오른쪽 아래 그늘 · 왼쪽 위 빛
    const d = Math.hypot(x - 7, y - 7);
    if (d > 7.5) continue;
    px(x, y, d > 6.6 ? INK : x + y > 17 && d > 4.6 ? shade : face);
  }
  pts([[4, 3], [5, 3], [3, 4]], HI);
  const smile = () => pts([[4, 9], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 9]], INK);
  const dotEyes = () => pts([[5, 5], [5, 6], [9, 5], [9, 6]], INK);
  if (kind === 'smile') { dotEyes(); smile(); pts([[3, 8], [11, 8]], PINK); }
  if (kind === 'laugh') {
    pts([[4, 6], [5, 5], [6, 6], [8, 6], [9, 5], [10, 6]], INK);
    pts([[4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [5, 10], [9, 10], [6, 11], [7, 11], [8, 11]], INK);
    pts([[6, 10], [7, 10], [8, 10]], DARK); px(7, 10, '#ff6a5a');
  }
  if (kind === 'wow') {
    pts([[5, 4], [5, 5], [5, 6], [9, 4], [9, 5], [9, 6]], INK);
    pts([[6, 9], [7, 9], [8, 9], [5, 10], [9, 10], [5, 11], [9, 11], [6, 12], [7, 12], [8, 12]], INK);
    pts([[6, 10], [7, 10], [8, 10], [6, 11], [7, 11], [8, 11]], DARK);
  }
  if (kind === 'cry') {
    pts([[4, 6], [5, 6], [6, 6], [8, 6], [9, 6], [10, 6]], INK);
    pts([[5, 7], [5, 8], [4, 9], [5, 9], [4, 10], [9, 7], [9, 8], [9, 9], [10, 9], [10, 10]], BLUE);
    pts([[5, 12], [6, 11], [7, 11], [8, 11], [9, 12]], INK);
  }
  if (kind === 'angry') {
    pts([[3, 3], [4, 4], [5, 4], [6, 5], [11, 3], [10, 4], [9, 4], [8, 5]], INK);
    pts([[5, 6], [5, 7], [9, 6], [9, 7]], INK);
    pts([[5, 11], [6, 10], [7, 10], [8, 10], [9, 11]], INK);
    pts([[11, 0], [13, 0], [12, 1], [11, 2], [13, 2]], RED);
  }
  if (kind === 'sweat') {
    dotEyes();
    pts([[4, 10], [5, 10], [6, 9], [7, 10], [8, 9], [9, 10], [10, 10]], INK);
    pts([[12, 2], [11, 3], [12, 3], [13, 3], [11, 4], [12, 4], [13, 4], [12, 5]], BLUE); px(11, 3, WHITE);
  }
  if (kind === 'love') {
    for (const ox of [2, 8]) pts([[ox, 4], [ox + 1, 4], [ox + 3, 4], [ox + 4, 4], [ox, 5], [ox + 1, 5], [ox + 2, 5], [ox + 3, 5], [ox + 4, 5], [ox + 1, 6], [ox + 2, 6], [ox + 3, 6], [ox + 2, 7]], RED);
    smile();
  }
  if (kind === 'cool') {
    for (let x = 2; x <= 12; x++) px(x, 5, INK);
    pts([[3, 6], [4, 6], [5, 6], [6, 6], [8, 6], [9, 6], [10, 6], [11, 6], [4, 7], [5, 7], [9, 7], [10, 7]], INK);
    pts([[4, 6], [9, 6]], '#8a9ab8');
    pts([[6, 10], [7, 10], [8, 10], [9, 9]], INK);
  }
  built.set(kind, cv); return cv;
}
// 이모지 그리기: (x, y) = 왼쪽 위, s = 정수 배율(칸 그대로)
export function drawEmoji(g, kind, x, y, s = 2) { g.c.imageSmoothingEnabled = false; g.c.drawImage(emojiCanvas(kind), Math.round(x), Math.round(y), 15 * s, 15 * s); }

// 말풍선: (cx, tipY) = 꼬리 끝(식물 머리 위), age = 보낸 뒤 ms
export function emoteBubble(g, i, cx, tipY, age) {
  if (age < 0 || age > EMOTE_LIFE) return;
  const emo = isEmoji(i), pop = Math.min(1, age / 140), fade = age > EMOTE_LIFE - 300 ? (EMOTE_LIFE - age) / 300 : 1;
  const text = emo ? '' : PHRASES[i] || '!', w = emo ? 54 : g.textW(text, 'bold') + 20, h = emo ? 52 : 24;
  const hop = emo && age > 220 && age < 420 ? -Math.round(Math.sin((age - 220) / 200 * Math.PI) * 4) : 0;
  const x = Math.round(cx - w / 2), y = Math.round(tipY - 5 - h + (1 - pop) * 8);
  g.alpha(fade * (0.3 + 0.7 * pop), () => {
    rrect(g, x, y, w, h, 7, '#0e1626');
    rrect(g, x + 1, y + 1, w - 2, h - 2, 6, '#f6f9ff');
    g.rect(x + 5, y + h - 3, w - 10, 1, '#d6e0ee');   // 아래 그늘 한 줄
    for (let k = 0; k < 5; k++) { const hw = 4 - k; g.rect(cx - hw - 1, y + h - 1 + k, hw * 2 + 3, 1, '#0e1626'); if (hw > 0) g.rect(cx - hw, y + h - 1 + k, hw * 2 + 1, 1, '#f6f9ff'); }   // 꼬리
    if (emo) drawEmoji(g, EMOJI[i - PHRASES.length], cx - 22, y + 4 + hop, 3);
    else g.text(text, cx, y + Math.round((h - glyphH('bold')) / 2), { font: 'bold', color: '#1a2436', align: 'center' });
  });
}
