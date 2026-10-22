import { button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawPortrait } from '../art/sprites.js';
import { bannerInk, bannerPanel, avatarFrame, drawAvatar } from '../art/profile.js';
import { T, holo } from '../art/theme.js';
import { drawShutterClosed, GUN } from '../core/router.js';
import { ledBoard, ledText, LED } from '../art/led.js';
import { net, openStream, room as R, act } from '../net/api.js';
import { openForm } from '../core/form.js';
import { SPECIES, STAGES } from '../game/catalog.js';
import { stageName, lvOf } from '../game/view.js';
import { openTeamPick } from './teampick.js';

// 친구 대결 방(2026-10-16 사용자 "몇몇 친구랑 할 수 있게 · 임의로 방만들기와 초대코드 등"):
//  방 만들기 → 6자 코드(전광판) · 코드/링크 복사 → 친구가 코드로 들어옴 → 저마다 식물 고르고 준비 → 둘 다 준비면 셔터가 닫히며 대결.
//  끝나면 같은 방으로 돌아와 다시 할 수 있음. 실시간 알림 = net/api.js openStream(방 · 전투 · 결과 화면이 같이 씀).
import { PHRASES as EMOTES, emoteBubble } from '../art/emotes.js';   // 대사 0~5(감정 표현 이모지 6~13은 전투 화면 판에서)
export { EMOTES };
const PANEL = { x: 12, w: 246 };

export function ensureStream(app) {
  if (app.room && app.room.stream) return app.room;
  app.room = { stream: null, view: null, online: false, emotes: [] };
  app.room.stream = openStream((type, data) => roomEvent(app, type, data));
  return app.room;
}
export function closeStream(app) { if (app.room && app.room.stream) app.room.stream.close(); app.room = null; }
function roomEvent(app, type, data) {
  const RM = app.room; if (!RM) return;
  if (type === 'open') RM.online = true;
  else if (type === 'lost') RM.online = false;
  else if (type === 'auth') return app.logout(true);
  else if (type === 'room') RM.view = data;
  else if (type === 'emote') RM.emotes.push({ ...data, t: performance.now() });
  else if (type === 'start' || type === 'battle') {
    app.battleBoot = { kind: 'pvp', view: data.view, deadline: data.deadline, now: data.now, moved: data.moved, step: data.step, code: data.code || (RM.view && RM.view.code) };
    if (app.router.name !== 'battle') { app.go('battle', { net: 'pvp' }, 'shutter'); return; }
  }
  const cur = app.router.cur;
  if (cur && cur.onNet) cur.onNet(app, type, data);
}
const copy = (app, text, msg) => { try { navigator.clipboard.writeText(text).then(() => app.toast(msg), () => app.toast(text)); } catch { app.toast(text); } };

export const room = {
  theme: 'colosseum',
  enter(p = {}) { this.p = p; this.joinTried = false; this.picker = false; this.busy = false; },
  async call(app, fn) {
    if (this.busy) return; this.busy = true;
    try { const v = await fn(); if (v && v.code !== undefined && app.room) app.room.view = v; return v; }
    catch (e) { app.toast(e.message); return null; }
    finally { this.busy = false; }
  },
  leave(app) {
    if (net.offline) return app.go('home', {}, 'shutterOpen');
    const go = () => { closeStream(app); app.go('home', {}, 'shutterOpen'); };
    if (app.room && app.room.view) R.leave().then(go, go); else go();
  },
  draw(app) {
    const { g, W, H, t } = app;
    drawShutterClosed(g, W, H);
    if (this.p.demo) {   // 촬영·검토용 방 모습(서버 없이) — in = 1:1, in3 = 3:3
      const inRoom = this.p.demo === 'in' || this.p.demo === 'in3', d3 = this.p.demo === 'in3';
      app.room = { online: true, emotes: inRoom ? [{ i: 1, me: false, t: performance.now() }] : [], view: inRoom ? { code: 'K7P2QX', host: true, phase: 'lobby', mode: d3 ? 'swap3' : '1v1', battle: null, last: { winner: '밥', why: 'ko', turns: 7, mode: d3 ? 'swap3' : '1v1' },
        members: [{ me: true, host: true, name: '재배사', title: '꿈꾸는 원예가', avatar: 'flower_grass', color: 0, level: 5, card: { key: 'flower_grass', name: '페탈로즈', stage: 2, lv: 4 }, team: [{ key: 'flower_grass', name: '페탈로즈', stage: 2, lv: 4 }, { key: 'cactus_fire', name: '엠버캑터', stage: 1, lv: 3 }, { key: 'aqua', name: '아쿠아벌브', stage: 1, lv: 2 }], team3: true, ready: true, online: true }, { me: false, host: false, name: '밥', title: '초보 재배사', avatar: 'aqua', color: 1, level: 3, card: null, team: null, team3: true, ready: false, online: true }] } : null };
    } else if (net.offline) {
      ledBoard(g, [{ text: '서버에 연결해야 해요', color: LED.red }], W / 2, 200, { font: 'bold' });
      button(app, 'rm_home', W / 2 - 60, 250, 120, 32, '돌아가기', { style: 'night', onTap: () => app.go('home', {}, 'shutterOpen') });
      return;
    }
    const RM = this.p.demo ? app.room : ensureStream(app), v = RM.view;
    if (this.p.join && !this.joinTried && RM.online) { this.joinTried = true; this.call(app, () => R.join(this.p.join)); }
    // 위 줄: 나가기 · 제목 · 연결 등
    button(app, 'rm_back', 8, 8, 60, 22, '‹ 나가기', { style: 'night', onTap: () => this.leave(app) });
    g.text('친구 대결', W / 2, 11, { font: 'head', color: '#ffffff', align: 'center', outline: '#05070b', outlineW: 3 });
    const on = RM.online, lc = on ? '#7cf0a0' : Math.floor(t / 300) % 2 ? '#f0a050' : '#3a2a18';
    g.rect(W - 62, 14, 8, 8, GUN.edge); g.rect(W - 61, 15, 6, 6, lc);
    g.text(on ? '연결됨' : '연결 중', W - 50, 12, { color: on ? '#9ff0b0' : '#ffd8a8' });
    if (!v) return this.lobby(app);
    this.inRoom(app, v);
    if (this.picker) this.pickSheet(app);
  },
  // 방이 없을 때: 설명 · 방 만들기 · 코드로 들어가기
  lobby(app) {
    const { g, W, state: s } = app, x = PANEL.x, w = PANEL.w, y = 44, P = { main: '#e0f0ff', sub: '#8cc4ee', dim: '#4f8aa8' };
    holo(g, x, y, w, 166, { fill: '#06111f', fill2: '#0a182c', frame: '#2f5c8a', frameHi: '#8ccfff', frameLo: '#18385e' }, 16);
    ledText(g, '친구 대결 · 1:1 · 3:3', W / 2, y + 14, { font: 'head', color: LED.teal });
    const p = s.plants[s.active] || s.plants[0];
    if (p) {
      g.rect(W / 2 - 33, y + 44, 66, 66, '#4a8edc'); g.rect(W / 2 - 32, y + 45, 64, 64, '#0a1c32');
      g.clip(W / 2 - 31, y + 46, 62, 62, () => drawPortrait(g, p.key, W / 2 - 31, y + 46, 62, false));
      g.text(`나갈 식물: ${p.name}`, W / 2, y + 120, { font: 'bold', color: P.main, align: 'center' });
      g.text(`${stageName(p)} Lv${lvOf(p)}`, W / 2, y + 138, { color: P.sub, align: 'center' });
    }
    button(app, 'rm_make', x, y + 180, w, 38, '방 만들기', { style: 'gold', font: 'head', icon: 'plus', iconTint: true, disabled: this.busy || !app.room.online, onTap: () => this.call(app, () => R.create()) });
    button(app, 'rm_join', x, y + 226, w, 38, '코드로 들어가기', { style: 'teal', font: 'bold', disabled: this.busy || !app.room.online, onTap: () => openForm(app, {
      title: '코드로 들어가기', note: '친구가 보낸 6자 코드를 써 주세요', fields: [{ id: 'code', label: '초대 코드', max: 8, auto: 'off' }], ok: '들어가기',
      onSubmit: async val => { try { const r = await R.join(val.code.trim()); if (app.room) app.room.view = r; return null; } catch (e) { return e.message; } },
    }) });
  },
  // 방 안: 전광판 코드 · 복사 · 두 사람 카드 · 준비 · 지난 판 · 감정 표현
  inRoom(app, v) {
    const { g, W, H, t, state: s } = app, me = v.members.find(m => m.me), foe = v.members.find(m => !m.me);
    ledBoard(g, [{ text: v.code, color: LED.amber }], W / 2, 64, { font: 'big', minW: 170 });
    const link = `${location.origin}/v2/?room=${v.code}`;
    const c2 = Math.floor((W - 24 - 6) / 2);   // 두 칸 기둥(아래 사람 카드 · 준비 단추와 같은 가장자리 12)
    button(app, 'rm_copy', 12, 92, c2, 22, '코드 복사', { style: 'night', onTap: () => copy(app, v.code, '코드를 복사했어요') });
    button(app, 'rm_link', W - 12 - c2, 92, c2, 22, '링크 복사', { style: 'night', onTap: () => copy(app, link, '초대 링크를 복사했어요') });
    // 방식(같은 날 3:3 친구 대결): 방장 = 1:1 · 3:3 교체전 고르기(바꾸면 둘 다 준비가 풀림), 친구 = 글자만
    const swap = v.mode === 'swap3';
    if (v.host) {
      [['1v1', '1:1 대결'], ['swap3', '3:3 교체전']].forEach(([id, label], i) => button(app, 'rm_mode_' + id, i ? W - 12 - c2 : 12, 120, c2, 22, label, { style: (v.mode || '1v1') === id ? 'gold' : 'night', disabled: this.busy, onTap: () => { if ((v.mode || '1v1') !== id) this.call(app, () => R.mode(id)); } }));
    } else g.text(swap ? '3:3 교체전' : '1:1 대결', W / 2, 126, { color: '#ffd890', align: 'center' });
    // 두 사람 카드(사용자 2026-10-16 "친구대결에서 서로의 패는 보여주지 말자 — 프로필과 이름, 레벨 이정도만"):
    //  위 = 프로필(대표 식물 얼굴 · 이름 · 재배사 Lv · 칭호), 가운데 = 내 카드만 고른 식물 · 3:3이면 팀 셋(상대는 '?' — 대결에서 공개), 아래 = 준비 불
    const cw = 118, cy = 148, ch = 196;
    [me, foe].forEach((m, i) => {
      const x = 12 + i * (cw + 10);
      holo(g, x, cy, cw, ch, m && m.ready ? { fill: '#0d2a1c', fill2: '#123622', frame: '#7cf0a0', frameHi: '#d8ffe4', frameLo: '#2a6a44' } : { fill: '#06111f', fill2: '#0a182c', frame: '#2f5c8a', frameHi: '#8ccfff', frameLo: '#18385e' }, 16);
      if (!m) {
        g.text('친구를', x + cw / 2, cy + 60, { font: 'bold', color: '#8cc4ee', align: 'center' });
        g.text('기다리는 중' + '.'.repeat(1 + Math.floor(t / 400) % 3), x + cw / 2, cy + 78, { font: 'bold', color: '#8cc4ee', align: 'center' });
        return;
      }
      // 프로필 줄 = 그 사람의 배너 창(2026-10-22 — 배너 = 프로필 창 디자인, art/profile.js) 위에 얼굴(대표 식물) · 이름 · 재배사 Lv · 칭호
      const bi = m.color || 0, ink = bannerInk(bi);
      bannerPanel(g, x + 4, cy + 4, cw - 8, 52, bi, t);
      avatarFrame(g, x + 9, cy + 9, 28, bi);
      if (m.avatar && !drawAvatar(g, m.avatar, x + 9, cy + 9, 28, bi)) g.clip(x + 9, cy + 9, 28, 28, () => drawPortrait(g, m.avatar, x + 9, cy + 9, 28, false));   // 아이콘 = 화분째(홈 배너와 같은 그림)
      let nm = m.name; while (g.textW(nm, 'bold') > cw - 50 && nm.length > 2) nm = nm.slice(0, -1);
      g.text(nm, x + 44, cy + 9, { font: 'bold', color: ink ? ink.main : '#ffffff' });
      g.text(`재배사 Lv${m.level || 1}`, x + 44, cy + 25, { color: '#ffd890' });
      let tt = m.title || ''; while (g.textW(tt) > cw - 16 && tt.length > 2) tt = tt.slice(0, -1);
      g.text(tt, x + cw / 2, cy + 41, { color: ink ? ink.sub : '#8cc4ee', align: 'center' });
      if (m.me) g.text('(나)', x + cw - 8, cy + 9, { color: '#8ccfff', align: 'right' });
      // 가운데: 내 식물(나만 보임) / 상대 = 비밀. 3:3 = 내 팀 셋(1번 = 먼저 나감, 주황 테)
      const px = x + cw / 2 - 28, py = cy + 62, c = m.card;
      if (swap && m.me) {
        const tc = m.team || [];
        if (tc.length === 3) {
          tc.forEach((t, k) => {
            const fx = x + 6 + k * 36, fy = py + 4;
            g.rect(fx - 1, fy - 1, 36, 36, k === 0 ? '#f0be7d' : '#4a8edc'); g.rect(fx, fy, 34, 34, '#0a1c32');
            g.clip(fx + 1, fy + 1, 32, 32, () => drawPortrait(g, t.key, fx + 1, fy + 1, 32, false));
            g.text(String(k + 1), fx + 3, fy + 1, { font: 'bold', color: '#ffffff', outline: '#05070b', outlineW: 2 });
          });
          g.text(`${tc[0].name} 먼저`, x + cw / 2, py + 46, { font: 'bold', color: '#e0f0ff', align: 'center' });
          button(app, 'rm_team', x + 10, py + 94, cw - 20, 20, '팀 바꾸기', { style: 'night', onTap: () => { if (!m.ready) this.openTeam(app, tc); else app.toast('준비를 풀고 바꿔요'); } });
        } else {
          g.text('스마트팜에', x + cw / 2, py + 18, { font: 'bold', color: '#ffb0a0', align: 'center' });
          g.text('식물이 셋 있어야 해요', x + cw / 2, py + 36, { font: 'bold', color: '#ffb0a0', align: 'center' });
        }
      } else if (m.me && c && !swap) {
        g.rect(px - 1, py - 1, 58, 58, '#4a8edc'); g.rect(px, py, 56, 56, '#0a1c32');
        g.clip(px + 1, py + 1, 54, 54, () => drawPortrait(g, c.key, px + 1, py + 1, 54, false));
        g.img(icon(SPECIES[c.key].el), px + 58 - 12, py + 2);
        g.text(c.name, x + cw / 2, py + 60, { font: 'bold', color: c.shiny ? '#ffe8a8' : '#e0f0ff', align: 'center' });
        g.text(`${stageName(c)} · Lv${lvOf(c)}`, x + cw / 2, py + 76, { color: '#8cc4ee', align: 'center' });
        button(app, 'rm_pick', x + 10, py + 94, cw - 20, 20, '식물 바꾸기', { style: 'night', onTap: () => { if (!m.ready) this.picker = true; else app.toast('준비를 풀고 바꿔요'); } });
      } else {   // 상대 = 비밀(3:3이면 팀이 되는지만)
        const no3 = swap && !m.team3;
        g.rect(px - 1, py - 1, 58, 58, '#2a3a4e'); g.rect(px, py, 56, 56, '#0a1c32');
        g.text('?', x + cw / 2, py + 18, { font: 'big', color: '#2f5c8a', align: 'center' });
        if (no3) { g.text('식물이 셋', x + cw / 2, py + 62, { color: '#ffb0a0', align: 'center' }); g.text('있어야 해요', x + cw / 2, py + 78, { color: '#ffb0a0', align: 'center' }); }
      }
      const rc = m.ready ? '#7cf0a0' : '#3a4a5e';
      g.rect(x + 10, cy + ch - 16, 8, 8, '#05070b'); g.rect(x + 11, cy + ch - 15, 6, 6, rc);   // 위 '바꾸기' 단추(카드 +176까지)와 안 겹치게
      g.text(!m.online ? '연결 끊김' : m.ready ? '준비 완료!' : '준비 중', x + 24, cy + ch - 18, { font: 'bold', color: !m.online ? '#ff9a8a' : m.ready ? '#9ff0b0' : '#8cc4ee' });
      if (m.host) g.text('방장', x + cw - 10, cy + ch - 18, { color: '#ffd890', align: 'right' });
      // 감정 표현 말풍선(전광판) — 그 사람 카드 가운데 위
      const em = app.room.emotes.filter(e => (e.me === !!m.me) && performance.now() - e.t < 2600).pop();
      if (em) emoteBubble(g, em.i, x + cw / 2, py + 40, performance.now() - em.t);   // 전투와 같은 말풍선
    });
    // 준비
    const ready = me && me.ready, no3 = swap && me && !me.team3 && !ready;
    button(app, 'rm_ready', 12, cy + ch + 10, W - 24, 40, ready ? '준비 취소' : '준비', { style: ready ? 'night' : 'gold', font: 'head', disabled: this.busy || no3, sub: no3 ? '3:3은 식물이 셋 있어야 해요' : null, onTap: () => this.call(app, () => R.ready(!ready)) });
    let y = cy + ch + 60;
    if (v.last) { g.text(`지난 판${v.last.mode === 'swap3' ? '(3:3)' : ''} · ${v.last.winner} 승 · ${v.last.turns}턴` + (v.last.why === 'ko' ? '' : ` (${{ forfeit: '기권', timeout: '시간 넘김', left: '나감' }[v.last.why] || v.last.why})`), W / 2, y, { color: '#ffd890', align: 'center' }); y += 20; }
    // 감정 표현 단추(셋씩 두 줄)
    const bw = Math.floor((W - 24 - 8) / 3), ex = i => (i % 3 === 2 ? W - 12 - bw : 12 + (i % 3) * (bw + 4));
    EMOTES.forEach((e, i) => button(app, 'rm_em' + i, ex(i), y + Math.floor(i / 3) * 26, bw, 22, e, { style: 'night', onTap: () => R.emote(i).catch(() => {}) }));
  },
  // 나갈 식물 고르기(스마트팜 식물)
  pickSheet(app) {
    const { g, W, H, state: s } = app, n = s.plants.length, h = 60 + n * 42, y = Math.max(40, H - h - 16);
    g.c.fillStyle = 'rgba(4,7,14,0.72)'; g.c.fillRect(0, 0, W, H);
    app.input.hit('pk_block', 0, 0, W, H, () => { this.picker = false; });
    holo(g, 10, y, W - 20, h, T.card || T.panel, 16);
    app.input.hit('pk_in', 10, y, W - 20, h, () => {});
    g.text('대결에 나갈 식물', 22, y + 10, { font: 'head', color: T.ptext.main });
    s.plants.forEach((p, i) => {
      const ry = y + 36 + i * 42, id = 'pk_' + i, pr = app.input.isPressed(id);
      holo(g, 16, ry + (pr ? 1 : 0), W - 32, 38, T.deep, 16);
      g.rect(22, ry + 4, 30, 30, '#0a1c32'); g.clip(23, ry + 5, 28, 28, () => drawPortrait(g, p.key, 23, ry + 5, 28, false));
      g.text(p.name, 60, ry + 5, { font: 'bold', color: T.ptext.main });
      g.text(`${stageName(p)} Lv${lvOf(p)}`, 60, ry + 21, { color: T.ptext.sub });
      g.img(icon(SPECIES[p.key].el), W - 40, ry + 13);
      app.input.hit(id, 16, ry, W - 32, 38, () => { this.picker = false; this.call(app, () => R.pick(p.uid)); });
    });
  },
  // 3:3 팀 고르기 = 홈과 같은 창(scenes/teampick.js — 2026-10-18, 전엔 방 전용 목록이라 식물이 많으면 화면 밖으로 넘쳤음) · 처음 고른 셋 = 지금 방 팀(없으면 홈 팀)
  openTeam(app, tc) {
    const s = app.state, home = (s.team || []).map(i => s.plants[i] && s.plants[i].uid).filter(Boolean), cur = tc.map(t => t.uid).filter(Boolean);
    openTeamPick(app, cur.length === 3 ? cur : home, uids => this.saveTeam(app, uids));
  },
  async saveTeam(app, uids) {
    try { await act(app, 'setTeam', { team: uids }); } catch (e) { app.toast(e.message); return; }
    this.call(app, () => R.team(uids));
  },
};
