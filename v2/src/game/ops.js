// 화면이 부를 수 있는 일 목록(서버 · 오프라인 시험판 공용). 여기 없는 규칙(전투 보상 · 경험치 주기 등)은 화면이 직접 못 부름.
//  인자는 여기서 모양·길이를 확인한 뒤 logic.js 로 넘김 — 안 되는 일은 logic 이 Err(사용자에게 보일 문구)를 던짐.
import * as L from './logic.js';

const bad = () => { throw new L.Err('잘못된 요청이에요'); };
const str = (v, max = 40) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : bad());
const int = (v, lo, hi, def) => { if (v == null && def != null) return def; const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : bad(); };
const opt = (v, f) => (v == null ? null : f(v));
const idxOf = (s, uid) => s.plants.findIndex(p => p.uid === uid);
const cell = v => (v == null || v === '' ? null : str(v));
const cells = (v, n, exact) => (Array.isArray(v) && (exact ? v.length === n : v.length <= n) ? v.map(cell) : bad());   // 칸 배열(길이 · 원소 모양만 — 규칙은 logic)
const cellsOpt = (v, n, exact) => (v == null ? undefined : cells(v, n, exact));
const layoutArg = v => (v && typeof v === 'object' ? { battle: cellsOpt(v.battle, L.LOADOUT, true), store: cellsOpt(v.store, L.SKILL_STORE), cards: cellsOpt(v.cards, 3, true), pstore: cellsOpt(v.pstore, 3) } : bad());
const cardsArg = v => (Array.isArray(v) && (v.length === 2 || v.length === 3) ? v.map(cell) : bad());   // 패시브 칸(옛 화면 둘 · 새 화면 셋)

export const OPS = {
  feed: (s, a) => L.feed(s, str(a.id), a.kind === 'fert' ? 'fert' : 'water', int(a.n, 1, 99, 1)),
  evolve: (s, a, c) => L.evolve(s, str(a.id), c.rng),
  draftApply: (s, a) => L.draftApply(s, str(a.id), int(a.n, 0, 20, 0), layoutArg(a.layout)),   // 새 고르기 화면 확정(놓은 배치 그대로 — 2026-10-18)
  draftPick: (s, a) => L.draftPick(s, str(a.id), int(a.n, 0, 20, 0), Array.isArray(a.picks) ? a.picks.slice(0, 8).map(x => String(x)) : []),   // 카드 고르기(2026-10-18)
  place: (s, a) => L.placePending(s, str(a.id), str(a.skill), str(a.target, 8)),
  swapJoker: (s, a) => L.swapJoker(s, str(a.id), int(a.slot, 0, L.LOADOUT - 1)),
  setCards: (s, a) => L.setCards(s, str(a.id), cardsArg(a.cards)),   // 패시브 칸 셋(2026-10-18 — 옛 화면은 둘)
  setSlots: (s, a) => (Array.isArray(a.store)   // 새 꼴 = 스킬 장착 · 보관 · 패시브 장착 · 패시브 보관 전부(2026-10-18) · 옛 꼴 = 장착 + 패시브 칸
    ? L.setSlots(s, str(a.id), { battle: cells(a.battle, L.LOADOUT, true), store: cells(a.store, L.SKILL_STORE), cards: cells(a.cards, 3, true), pstore: cells(a.pstore || [], 3) })
    : L.setSlots(s, str(a.id), cells(a.battle, L.LOADOUT, true), cardsArg(a.cards))),
  setLoadout: (s, a) => L.setLoadout(s, str(a.id), Array.isArray(a.battle) && a.battle.length === L.LOADOUT ? a.battle.map(v => (v == null ? null : str(v))) : bad()),
  upgrade: (s, a) => L.upgrade(s, str(a.id), str(a.stat, 8), int(a.n, 1, 50, 1)),
  resetPoints: (s, a) => L.resetPoints(s, str(a.id)),
  seedFeed: (s, a, c) => L.seedFeed(s, str(a.id), str(a.stat, 8), Array.isArray(a.seeds) && a.seeds.length <= 60 ? a.seeds.map(v => str(v)) : bad(), c.rng),   // 확률(난수 — QUICK 아님)   // 종자 거름(2026-10-18 — 식물 통째 거름 merge 는 없앰)
  graft: (s, a) => L.graft(s, str(a.id), str(a.scion)),   // 접목 = 카드 고르기를 맨 앞에(확정 = draftApply · 보류 = graftHold — 2026-10-22)
  graftHold: (s, a) => L.graftHold(s, str(a.id)),
  regress: (s, a) => L.regress(s, str(a.id), str(a.skill)),
  rename: (s, a) => L.rename(s, str(a.id), str(a.name, 40)),
  setActive: (s, a) => L.setActive(s, idxOf(s, str(a.id))),
  setFav: (s, a) => L.setFav(s, str(a.id), !!a.on),
  setTeam: (s, a) => L.setTeam(s, Array.isArray(a.team) && a.team.length === 3 ? a.team.map(u => idxOf(s, str(u))) : bad()),
  setMode: (s, a) => L.setMode(s, str(a.mode, 16)),
  setLeague: (s, a) => L.setLeague(s, str(a.league, 12)),
  setProfile: (s, a) => L.setProfile(s, { name: opt(a.name, v => str(v, 40)), title: opt(a.title, v => str(v, 40)), avatar: opt(a.avatar, v => str(v, 40)), color: opt(a.color, v => int(v, 0, 7)) }),
  plantSeed: (s, a, c) => L.plantSeed(s, str(a.seed), c.rng, c.now),
  sellSeed: (s, a) => L.sellSeed(s, str(a.seed)),
  sellSeeds: (s, a) => L.sellSeeds(s, Array.isArray(a.seeds) ? a.seeds.slice(0, 80).map(v => str(v)) : []),   // 가방 고르기 모드(2026-10-22) — map(str) 은 칸 번호가 길이 한도로 들어가 안 됨
  seedMark: (s, a) => L.markSeed(s, str(a.seed), { lock: typeof a.lock === 'boolean' ? a.lock : undefined, fav: typeof a.fav === 'boolean' ? a.fav : undefined }),   // 종자 잠금 · 즐겨찾기(2026-10-18)
  toStorage: (s, a, c) => L.toStorage(s, str(a.id), c.now),
  setShip: (s, a) => L.setShip(s, int(a.model, 1, 9)),
  fromStorage: (s, a, c) => L.fromStorage(s, str(a.id), c.now),
  harvest: (s, a, c) => L.harvest(s, str(a.id), c.rng, c.now),
  harvestAll: (s, a, c) => L.harvestAll(s, c.rng, c.now),
  sell: (s, a) => L.sell(s, str(a.id)),
  dismantle: (s, a, c) => L.dismantle(s, str(a.id), c.rng),
  explore: (s, a, c) => L.explore(s, str(a.planet), c.rng, c.now, opt(a.region, v => str(v, 24))),   // region 없음 = 첫 지역(옛 화면)
  upgradeProbe: (s, a) => L.upgradeProbe(s, str(a.part, 12)),
  buy: (s, a, c) => L.buy(s, str(a.item), c.rng),
  openPack: (s, a, c) => L.openPack(s, str(a.id), a.part === 'skill' ? 'skill' : 'passive', c.rng),   // 카드 꾸러미 열기(난수 — QUICK 아님, 2026-10-22)
  cardUp: (s, a) => L.cardUp(s, str(a.card)),     // 같은 카드 두 장 + 돈 → 한 단계 위
  sellCard: (s, a) => L.sellCard(s, str(a.card)),
  discardCard: (s, a) => L.discardCard(s, str(a.id), str(a.card)),   // 식물 보관의 카드 버리기(귀속 — 2026-10-22)
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
