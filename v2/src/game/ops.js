// 화면이 부를 수 있는 일 목록(서버 · 오프라인 시험판 공용). 여기 없는 규칙(전투 보상 · 경험치 주기 등)은 화면이 직접 못 부름.
//  인자는 여기서 모양·길이를 확인한 뒤 logic.js 로 넘김 — 안 되는 일은 logic 이 Err(사용자에게 보일 문구)를 던짐.
import * as L from './logic.js';

const bad = () => { throw new L.Err('잘못된 요청이에요'); };
const str = (v, max = 40) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : bad());
const int = (v, lo, hi, def) => { if (v == null && def != null) return def; const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : bad(); };
const opt = (v, f) => (v == null ? null : f(v));
const idxOf = (s, uid) => s.plants.findIndex(p => p.uid === uid);

export const OPS = {
  feed: (s, a) => L.feed(s, str(a.id), a.kind === 'fert' ? 'fert' : 'water', int(a.n, 1, 99, 1)),
  evolve: (s, a, c) => L.evolve(s, str(a.id), c.rng),
  place: (s, a) => L.placePending(s, str(a.id), str(a.skill), str(a.target, 8)),
  swapJoker: (s, a) => L.swapJoker(s, str(a.id), int(a.slot, 0, 3)),
  setLoadout: (s, a) => L.setLoadout(s, str(a.id), Array.isArray(a.battle) && a.battle.length === 4 ? a.battle.map(v => (v == null ? null : str(v))) : bad()),
  upgrade: (s, a) => L.upgrade(s, str(a.id), str(a.stat, 8), int(a.n, 1, 50, 1)),
  resetPoints: (s, a) => L.resetPoints(s, str(a.id)),
  merge: (s, a) => L.merge(s, str(a.id), str(a.food), str(a.stat, 8)),
  graft: (s, a) => L.graft(s, str(a.id), str(a.scion)),
  regress: (s, a) => L.regress(s, str(a.id), str(a.skill)),
  rename: (s, a) => L.rename(s, str(a.id), str(a.name, 40)),
  setActive: (s, a) => L.setActive(s, idxOf(s, str(a.id))),
  setTeam: (s, a) => L.setTeam(s, Array.isArray(a.team) && a.team.length === 3 ? a.team.map(u => idxOf(s, str(u))) : bad()),
  setMode: (s, a) => L.setMode(s, str(a.mode, 16)),
  setLeague: (s, a) => L.setLeague(s, str(a.league, 12)),
  setProfile: (s, a) => L.setProfile(s, { name: opt(a.name, v => str(v, 40)), title: opt(a.title, v => str(v, 40)), avatar: opt(a.avatar, v => str(v, 40)), color: opt(a.color, v => int(v, 0, 3)) }),
  plantSeed: (s, a, c) => L.plantSeed(s, str(a.seed), c.rng, c.now),
  sellSeed: (s, a) => L.sellSeed(s, str(a.seed)),
  toStorage: (s, a, c) => L.toStorage(s, str(a.id), c.now),
  setShip: (s, a) => L.setShip(s, int(a.model, 1, 9)),
  fromStorage: (s, a, c) => L.fromStorage(s, str(a.id), c.now),
  harvest: (s, a, c) => L.harvest(s, str(a.id), c.rng, c.now),
  harvestAll: (s, a, c) => L.harvestAll(s, c.rng, c.now),
  sell: (s, a) => L.sell(s, str(a.id)),
  dismantle: (s, a, c) => L.dismantle(s, str(a.id), c.rng),
  explore: (s, a, c) => L.explore(s, str(a.planet), c.rng, c.now),
  upgradeProbe: (s, a) => L.upgradeProbe(s, str(a.part, 12)),
  repairProbe: s => L.repairProbe(s),
  buy: (s, a, c) => L.buy(s, str(a.item), c.rng),
  ack: (s, a) => L.ackPending(s, int(a.n, 1, 50, 1)),
  guide: (s, a) => L.seeGuide(s, str(a.id, 16)),
};

// 한 가지 일 하기: 시간으로 차는 것을 먼저 맞추고 → 규칙 → 다시 맞춤. 반환 = 화면에 보일 결과
export function runOp(s, op, args, ctx) {
  const f = Object.prototype.hasOwnProperty.call(OPS, op) ? OPS[op] : null;
  if (!f) throw new L.Err('모르는 요청이에요');
  L.syncTimers(s, ctx.now);
  const res = f(s, args && typeof args === 'object' ? args : {}, ctx);
  L.syncTimers(s, ctx.now);
  return res;
}
