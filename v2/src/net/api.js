// 서버와 이야기하기(같은 주소의 /api). 로그인 열쇠 = 이 브라우저 localStorage 'pullo.token'. 서버 시각과의 차이(off)로 열매·연료 시계를 맞춤.
//  오프라인(?offline=1 · 촬영 도구) = 같은 규칙(ops.js · fight.js)을 이 브라우저에서 돌림 — 저장은 안 함(체험·검토용).
import { runOp } from '../game/ops.js';
import { battleReward, battleForfeit, syncTimers } from '../game/logic.js';
import { makeRng } from '../battle/rules.js';
import { setupBot, botStep, viewOf, botPlant, botTrainer } from '../game/fight.js';

const KEY = 'pullo.token';
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} },
};
export class NetErr extends Error { constructor(msg, status) { super(msg); this.status = status; } }

export const net = {
  token: store.get(KEY), user: null, off: 0, offline: false,
  now() { return Date.now() + this.off; },
  setToken(t) { this.token = t; store.set(KEY, t); },
  async req(path, body, method) {
    let r;
    try {
      r = await fetch(path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(this.token ? { authorization: 'Bearer ' + this.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    } catch { throw new NetErr('서버에 연결할 수 없어요 — 인터넷을 확인해 주세요', 0); }
    let j = null;
    try { j = await r.json(); } catch {}
    if (j && j.now) this.off = j.now - Date.now();
    if (!r.ok) { if (r.status === 401) this.setToken(null); throw new NetErr((j && j.error) || '서버에 문제가 생겼어요', r.status); }
    return j;
  },
};

// ── 봇 판(서버가 한 턴씩 — 오프라인이면 이 브라우저에서) ──
const TIERS = ['브론즈', '실버', '골드', '플래티넘', '다이아', '마스터', '풀로세움'];
let local = null;   // 오프라인 판 { spec, B }
export const bot = {
  async start(app) {
    if (!net.offline) return net.req('/api/battle/start', {});
    const s = app.state, mode = s.mode === 'swap3' ? 'swap3' : 'tournament', rng = makeRng((Math.random() * 2 ** 31) | 0);
    const mine = mode === 'swap3' ? s.team.map(i => s.plants[i]).filter(Boolean) : [s.plants[s.active]];
    if (mode === 'swap3' && mine.length < 3) throw new NetErr('3:3 교체전은 식물 셋이 필요해요 — 팀을 골라 주세요', 400);
    const T = s.tournament, foes = mine.map(p => botPlant(rng, p.stage, p.lv, Math.max(0, TIERS.indexOf(T.tier))));
    const info = mode === 'swap3' ? { mode, title: '3:3 교체전', swap3: { ...s.swap3 } } : { mode, title: `${T.name} · ${T.round}`, tier: T.tier, round: T.round, wins: T.wins, losses: T.losses, bestOf: T.bestOf };
    const spec = { seed: (Math.random() * 2 ** 31) | 0, mode, mine: JSON.parse(JSON.stringify(mine)), foes, trainer: botTrainer(rng), rank: `${T.tier} ${1 + Math.floor(rng() * 3)}`, info };
    local = { spec, B: setupBot(spec) };
    return { id: 'local', mode, view: viewOf(local.B), info };
  },
  async turn(app, id, act, turn) {
    if (!net.offline) { const r = await net.req('/api/battle/turn', { id, act, turn }); if (r.state) app.state = r.state; return r; }
    const { spec, B } = local, step = botStep(B, spec.mode, act), out = { turn: step.turn || null, send: step.send || null, view: viewOf(B), over: B.over };
    if (B.over) { out.reward = battleReward(app.state, { mode: spec.mode, win: B.over === 'win', rng: Math.random, now: Date.now() }); syncTimers(app.state, Date.now()); }
    return out;
  },
  async forfeit(app, id) {
    if (!net.offline) { const r = await net.req('/api/battle/forfeit', { id }); if (r.state) app.state = r.state; return r; }
    return { reward: battleForfeit(app.state, local ? local.spec.mode : 'tournament') };
  },
};

// ── 일 하나(양육·탐사·상점…) ──
export async function act(app, op, args) {
  if (net.offline) return runOp(app.state, op, args, { rng: Math.random, now: Date.now() });
  const r = await net.req('/api/act', { op, args });
  app.state = r.state;
  return r.res;
}

// ── 친구 대결 방: 서버 → 화면 한 줄 흐름(fetch 로 읽음 — 로그인 열쇠를 주소에 안 실으려고). 끊기면 점점 늦게 다시 붙음 ──
export function openStream(onEvent) {
  let stop = false, ctrl = null, wait = 500;
  (async () => {
    while (!stop) {
      try {
        ctrl = new AbortController();
        const r = await fetch('/api/room/events', { headers: { authorization: 'Bearer ' + net.token }, signal: ctrl.signal });
        if (r.status === 401) { onEvent('auth', null); break; }
        if (!r.ok || !r.body) throw new Error('stream');
        wait = 500; onEvent('open', null);
        const rd = r.body.getReader(), dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await rd.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
            let type = null, data = null;
            for (const line of chunk.split('\n')) { if (line.startsWith('event: ')) type = line.slice(7); else if (line.startsWith('data: ')) { try { data = JSON.parse(line.slice(6)); } catch {} } }
            if (type) onEvent(type, data);
          }
        }
      } catch {}
      if (stop) break;
      onEvent('lost', null);
      await new Promise(res => setTimeout(res, wait)); wait = Math.min(8000, wait * 2);
    }
  })();
  return { close() { stop = true; try { ctrl && ctrl.abort(); } catch {} } };
}
export const room = {
  view: () => net.req('/api/room'),
  create: () => net.req('/api/room/create', {}),
  join: code => net.req('/api/room/join', { code }),
  leave: () => net.req('/api/room/leave', {}),
  pick: plant => net.req('/api/room/pick', { plant }),
  ready: on => net.req('/api/room/ready', { on }),
  move: (act, turn) => net.req('/api/room/move', { act, turn }),
  forfeit: () => net.req('/api/room/forfeit', {}),
  emote: i => net.req('/api/room/emote', { i }),
};
