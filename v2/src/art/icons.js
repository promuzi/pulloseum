// 도트 아이콘(직접 그림). 글자 하나 = 도트 한 칸, '.' = 투명. 색 글자 뜻은 LEGEND.
// 기본 11×11(글자 줄 높이와 같음), 하단 탭·큰 버튼용은 15×15.
const LEGEND = {
  o: '#2e222f', w: '#ffffff', l: '#c7dcd0', m: '#9babb2', s: '#7f708a', d: '#625565', q: '#3e3546',
  y: '#f9c22b', Y: '#fbff86', O: '#f79617', f: '#fb6b1d',
  r: '#e83b3b', R: '#ae2334', p: '#fca790', P: '#f57d4a',
  g: '#1ebc73', G: '#91db69', e: '#239063', E: '#165a4c', a: '#cddf6c',
  b: '#4d9be6', B: '#8fd3ff', n: '#4d65b4', N: '#484a77',
  t: '#30e1b9', T: '#8ff8e2', k: '#0eaf9b', K: '#0b8a8f',
  v: '#a884f3', V: '#eaaded', u: '#905ea9', U: '#6b3e75',
  c: '#cd683d', C: '#e6904e', x: '#9e4539', X: '#fbb954',
  h: '#966c6c', H: '#ab947a', j: '#694f62',
  z: '#d5e04b', Z: '#a2a947',
};

export const ICON_SRC = {
  coin: [
    '...ooooo...',
    '..oYyyyyo..',
    '.oYyyyyyOo.',
    'oYyyOOOyyOo',
    'oyyOyyyOyOo',
    'oyyOyYyOyOo',
    'oyyOyyyOyOo',
    'oyyyOOOyOOo',
    '.oyyyyyOOo.',
    '..oOOOOOo..',
    '...ooooo...',
  ],
  gem: [
    '.....o.....',
    '....owo....',
    '...oTwto...',
    '..oTTttko..',
    '.oTTtttkko.',
    'oTTtttttkko',
    '.ottttkkko.',
    '..otkkKKo..',
    '...okKKo...',
    '....oKo....',
    '.....o.....',
  ],
  gear: [
    '....ooo....',
    '.oo.olo.oo.',
    '.olooloolo.',
    '..ollllmo..',
    'oollo.ommoo',
    'olll...mmmo',
    'oollo.ommoo',
    '..olmmmmo..',
    '.olooroomo.',
    '.oo.omo.oo.',
    '....ooo....',
  ],
  heart: [
    '..ooo.ooo..',
    '.opyroryyo.',
    'opyrrrrrrRo',
    'orrrrrrrrRo',
    'orrrrrrrrRo',
    '.orrrrrrRo.',
    '..orrrrRo..',
    '...orrRo...',
    '....oRo....',
    '.....o.....',
  ],
  sword: [
    '.........oo',
    '........owo',
    '.......owlo',
    '......owlo.',
    '..o..owlo..',
    '..oyowlo...',
    '...oyyo....',
    '..ohoyyo...',
    '.ohoo.oyo..',
    'oHoo...oo..',
    'oo.........',
  ],
  shield: [
    'ooooooooooo',
    'oBBBBbbbbno',
    'oBbbbbbbbno',
    'oBbbwbbbbno',
    'oBbwwwbbbno',
    'oBbbwbbbbno',
    '.oBbbbbbno.',
    '.obbbbbbno.',
    '..obbbbno..',
    '...obbno...',
    '....ono....',
  ],
  speed: [
    '...........',
    'oo...oo....',
    'oTo..oTo...',
    '.oTo..oTo..',
    '..oTo..oTo.',
    '...otT.oktT',
    '..oto..oto.',
    '.oto..oto..',
    'oto..oto...',
    'oo...oo....',
    '...........',
  ],
  target: [
    '...ooooo...',
    '..orrrrro..',
    '.orwwwwwro.',
    'orwrrrrrwro',
    'orwrwwwrwro',
    'orwrwrwrwro',
    'orwrwwwrwro',
    'orwrrrrrwro',
    '.orwwwwwro.',
    '..orrrrro..',
    '...ooooo...',
  ],
  sparkle: [
    '.....o.....',
    '....oVo....',
    '....oVo....',
    '...oVwvo...',
    'oooVwwwvooo',
    'oVVwwwwwvvo',
    'oooVwwwvooo',
    '...ovwvo...',
    '....ovo....',
    '....ovo....',
    '.....o.....',
  ],
  crit: [
    '.....o.....',
    '.o..oyo..o.',
    '.oo.oyo.oo.',
    '..oyoYoyo..',
    '...oYwYo...',
    'ooyYwwwYyoo',
    '...oYwYo...',
    '..oyoYoyo..',
    '.oo.oyo.oo.',
    '.o..oyo..o.',
    '.....o.....',
  ],
  energy: [
    '......ooo..',
    '.....oYyo..',
    '....oYyo...',
    '...oYyo....',
    '..oYyyoooo.',
    '.oYyyyyyyo.',
    '.ooooyyyo..',
    '....oyyo...',
    '...oyOo....',
    '..oOOo.....',
    '..ooo......',
  ],
  fire: [
    '.....o.....',
    '....oro....',
    '...orfo.o..',
    '..orffooro.',
    '.orffyfffro',
    '.orfyyyffro',
    'orffyYyffro',
    'orfyYwYyfro',
    'orfyYYYyfro',
    '.orfyyyfro.',
    '..ooooooo..',
  ],
  water: [   // 물방울: 위 뾰족 · 아래 둥글게(2026-10-17 사용자 "물방울 젖음 아이콘이 똥 모양이야 — 더 물방울처럼" · 옛 판은 아래가 넓고 평평했음)
    '.....o.....',
    '....oBo....',
    '...oBbbo...',
    '...oBbbo...',
    '..oBwbbbo..',
    '.oBwbbbbbo.',
    '.oBwbbbbbo.',
    '.oBbbbbbno.',
    '.oBbbbbbno.',
    '..onbbbno..',
    '...ooooo...',
  ],
  grass: [
    '........ooo',
    '......ooGGo',
    '....ooGGgGo',
    '...oGGggego',
    '..oGgggeego',
    '.oGgggeeggo',
    '.oGggeggggo',
    'oGggegggeo.',
    'oggegggoo..',
    'oeeoooo....',
    'oo.........',
  ],
  earth: [
    '...........',
    '....ooo....',
    '...oCCco...',
    '..oCCcccoo.',
    '.oCCcccxXxo',
    '.oCccccxxxo',
    'oCCccccxxco',
    'oCcccccxcco',
    'occcccxxcco',
    'oxxxxxxxxxo',
    '.ooooooooo.',
  ],
  wind: [
    '...........',
    '....ooooo..',
    '...oVVVvvo.',
    '..oVooooovo',
    '..oo.oo..vo',
    'ooooooVvovo',
    'oVVVVVvvvo.',
    'oooooooooo.',
    '.oVVVvvvo..',
    '..ooooooo..',
    '...........',
  ],
  bolt: [
    '......ooo..',
    '.....oYzo..',
    '....oYzo...',
    '...oYzo....',
    '..oYzzoooo.',
    '.oYzzzzzzo.',
    '.ooooozzo..',
    '....ozzo...',
    '...ozZo....',
    '..oZZo.....',
    '..ooo......',
  ],
  ice: [
    '.....o.....',
    '..o.oTo.o..',
    '.oTooTooTo.',
    '..oTtTtTo..',
    '.o.otwto.o.',
    'oTttwwwttTo',
    '.o.otwto.o.',
    '..oTtTtTo..',
    '.oTooTooTo.',
    '..o.oTo.o..',
    '.....o.....',
  ],
  // 타입
  tree: [
    '...ooooo...',
    '..oGGgggo..',
    '.oGGggggeo.',
    'oGGgggggeeo',
    'oGgggggeeeo',
    'ogggggeeeEo',
    '.oeeeeeeEo.',
    '..ooohoooo.',
    '....oHo....',
    '...oHhho...',
    '..ooooooo..',
  ],
  flower: [
    '....ooo....',
    '..oorpro...',
    '.oppooppo..',
    '.oppoyopro.',
    '..oooyoooo.',
    '.oprooppro.',
    '.oppoorpo..',
    '..oooGooo..',
    '..oGoGo....',
    '...oGGo....',
    '....ooo....',
  ],
  cactus: [
    '....ooo....',
    '...oGgo....',
    '.o.oGgo.o..',
    'oGooGgooGo.',
    'oGgoGgoGgo.',
    'oGgGGggggo.',
    '.ooGGgeoo..',
    '...oGgeo...',
    '..oooooooo.',
    '..ocCCcxo..',
    '...oooooo..',
  ],
  vine: [
    '......oo...',
    '.....oGGo..',
    '....oGggo..',
    '..o.oggo...',
    '.oGooge....',
    '.oGgoge....',
    '..oogge.oo.',
    '....oggoGGo',
    '....ogggGgo',
    '...oggoooo.',
    '...ooo.....',
  ],
  mushroom: [
    '...ooooo...',
    '..oRrrrro..',
    '.oRrwrrwro.',
    'oRrrrrrrrRo',
    'orwrrrrwrRo',
    'oooooooooo.',
    '...olllo...',
    '...olllo...',
    '...olmlo...',
    '..ollmmlo..',
    '..ooooooo..',
  ],
  // 분류·상태
  up: [
    '.....o.....',
    '....oGo....',
    '...oGgGo...',
    '..oGgggGo..',
    '.oGgggggGo.',
    'ooooggeoooo',
    '...oggeo...',
    '...oggeo...',
    '...oggeo...',
    '...oggeo...',
    '...ooooo...',
  ],
  down: [
    '...ooooo...',
    '...ovvuo...',
    '...ovvuo...',
    '...ovvuo...',
    '...ovvuo...',
    'oooovvuoooo',
    '.ouvvvvvuo.',
    '..ouvvvuo..',
    '...ouvuo...',
    '....ouo....',
    '.....o.....',
  ],
  heal: [
    '...ooooo...',
    '...oGGgo...',
    '...oGgeo...',
    'oooogggoooo',
    'oGGGgggggeo',
    'oGggggggeeo',
    'ogggggggeeo',
    'ooooggeoooo',
    '...oggeo...',
    '...oeeeo...',
    '...ooooo...',
  ],
  // 조작
  close: [
    'oo.......oo',
    'olo.....olo',
    '.olo...olo.',
    '..olo.olo..',
    '...olool...',
    '....olo....',
    '...oloolo..',
    '..olo.olo..',
    '.olo...olo.',
    'olo.....olo',
    'oo.......oo',
  ],
  back: [
    '....oo.....',
    '...olo.....',
    '..olo......',
    '.ollooooo..',
    'ollllllllo.',
    '.olloooooo.',
    '..olo......',
    '...olo.....',
    '....oo.....',
  ],
  left: [
    '....oo.',
    '...olo.',
    '..ollo.',
    '.olllo.',
    'ollllo.',
    '.olllo.',
    '..ollo.',
    '...olo.',
    '....oo.',
  ],
  right: [
    '.oo....',
    '.olo...',
    '.ollo..',
    '.olllo.',
    '.ollllo',
    '.olllo.',
    '.ollo..',
    '.olo...',
    '.oo....',
  ],
  lock: [
    '...ooooo...',
    '..oo...oo..',
    '..o.....o..',
    '..o.....o..',
    'ooooooooooo',
    'oyyyyyyyyOo',
    'oyYyyoyyyOo',
    'oyyyoooyyOo',
    'oyyyyoyyyOo',
    'oOOOOOOOOOo',
    'ooooooooooo',
  ],
  check: [
    '..........o',
    '.........oo',
    '........oGo',
    '.......oGo.',
    'oo....oGgo.',
    'oGo..oGgo..',
    'oGgooGgo...',
    '.oGgGgo....',
    '..oGgo.....',
    '...oo......',
  ],
  flag: [
    '.oo........',
    '.olooooo...',
    '.ollllllo..',
    '.olllllllo.',
    '.ollllllo..',
    '.olooooo...',
    '.oo........',
    '.oo........',
    '.oo........',
    '.oo........',
    'oooo.......',
  ],
  star: [
    '.....o.....',
    '....oYo....',
    '....oyo....',
    '...oyyyo...',
    'ooooyyyoooo',
    'oYyyyyyyyOo',
    '.oyyyyyyOo.',
    '..oyyyyOo..',
    '.oyyOoOyOo.',
    '.oyOo.oOOo.',
    '.ooo...ooo.',
  ],
  starOff: [
    '.....o.....',
    '....odo....',
    '....odo....',
    '...odddo...',
    'oooodddoooo',
    'oddddddddqo',
    '.oddddddqo.',
    '..oddddqo..',
    '.oddqoqdqo.',
    '.odqo.oqqo.',
    '.ooo...ooo.',
  ],
  seed: [
    '...........',
    '.....ooo...',
    '....oHHho..',
    '...oHhhhjo.',
    '..oHhhhhjo.',
    '..oHhhhjjo.',
    '.oHhhhhjo..',
    '.ohhhhjjo..',
    '.ohhhjjo...',
    '..oojoo....',
    '....o......',
  ],
  fruit: [
    '.....oo....',
    '....oeoGo..',
    '...ooeoGGo.',
    '.ooroooooo.',
    'opprrrrrro.',
    'oprrrrrrRo.',
    'orrrrrrrRo.',
    'orrrrrrRRo.',
    '.orrrrRRo..',
    '..oooooo...',
  ],
  potion: [
    '...ooooo...',
    '...ohhho...',
    '...ooooo...',
    '....olo....',
    '...oloTo...',
    '..olTttko..',
    '.olTttttko.',
    '.oTtttttko.',
    '.otttttkko.',
    '..okkkkko..',
    '...ooooo...',
  ],
  box: [
    '..ooooooo..',
    '.oHHHyHHHo.',
    'oHHhhyhhhjo',
    'ooooooooooo',
    'ohhhoyohhjo',
    'ohhhoYohhjo',
    'ohhhoyohhjo',
    'ohhhhyhhhjo',
    'ojjjjyjjjjo',
    'ooooooooooo',
  ],
  pencil: [
    '........oo.',
    '.......orro',
    '......olrRo',
    '.....oylo..',
    '....oyyo...',
    '...oyyo....',
    '..oyyo.....',
    '.oHyo......',
    '.oHo.......',
    'ooo........',
  ],
  trophy: [
    'ooooooooooo',
    'oyYyyyyyyOo',
    'ooYyyyyyOoo',
    'o.oyyyyyOo.',
    '.o.oyyyOo.o',
    '..o.oyOo.o.',
    '.....oOo...',
    '.....oOo...',
    '....ooooo..',
    '...oyyyyOo.',
    '...ooooooo.',
  ],
  fert: [   // 비료 포대: 묶은 주둥이 · 자루 · 초록 잎 표
    '...o...o...',
    '...oo.oo...',
    '....ooo....',
    '...oHHHo...',
    '..oHHHHHo..',
    '.oHHhGhhho.',
    'oHHhGGGhhjo',
    'oHhhhGhhhjo',
    'oHhhhhhhhjo',
    'ohhhhhhhjjo',
    '.ooooooooo.',
  ],
  bomb: [   // 폭탄(광역 공격 카드 수치 — 2026-10-16 사용자 "광역은 검 대신 폭탄 아이콘")
    '........Y..',
    '.......YyY.',
    '......o.Y..',
    '.....o.....',
    '...ooooo...',
    '..oddqqqo..',
    '.odwdqqqqo.',
    '.oddqqqqqo.',
    '.oqqqqqqqo.',
    '..oqqqqqo..',
    '...ooooo...',
  ],
  can: [   // 물뿌리개(물 — 물건): 손잡이 · 몸통 · 위로 뻗은 주둥이와 꼭지
    '........ooo',
    '..ooo..oBBo',
    '.o...o.oBo.',
    '.o...ooBo..',
    'ooooooBo...',
    'oBBBBbbo...',
    'oBwbbbbo...',
    'oBbbbbbo...',
    'obbbbbno...',
    'onnnnnno...',
    '.oooooo....',
  ],
  play: [
    '.oo........',
    '.oTo.......',
    '.oTto......',
    '.oTttoo....',
    '.oTtttko...',
    '.oTttko....',
    '.oTkoo.....',
    '.oko.......',
    '.oo........',
  ],
  ff: [
    'oo....oo...',
    'oTo...oTo..',
    'oTto..oTto.',
    'oTtto.oTtto',
    'oTtkooTtkoo',
    'oTkoo.oTko.',
    'oko...oko..',
    'oo....oo...',
  ],
  potIcon: [
    '...........',
    'ooooooooooo',
    'oCCCCCCCcxo',
    'ooooooooooo',
    '.oCccccxxo.',
    '.oCccccxxo.',
    '.oCccccxxo.',
    '..oCcccxo..',
    '..oxxxxxo..',
    '...ooooo...',
  ],
  sun: [
    '.....o.....',
    '.o...o...o.',
    '..o.....o..',
    '....ooo....',
    '...oYYyo...',
    'oo.oYyyo.oo',
    '...oyyOo...',
    '....ooo....',
    '..o.....o..',
    '.o...o...o.',
    '.....o.....',
  ],
  clock: [
    '...ooooo...',
    '..olllllo..',
    '.ollllolmo.',
    'olllllolllo',
    'olllllollmo',
    'ollllooolmo',
    'olllllllmmo',
    'ollllllmmmo',
    '.ollmmmmmo.',
    '..ommmmmo..',
    '...ooooo...',
  ],
  plus: [
    '...ooo...',
    '...olo...',
    '...olo...',
    'oooolooooo'.slice(0, 9),
    'olllllllo',
    'ooooloooo',
    '...olo...',
    '...olo...',
    '...ooo...',
  ],
  warn: [
    '.....o.....',
    '....oyo....',
    '...oyyyo...',
    '...oyoyo...',
    '..oyyoyyo..',
    '..oyyoyyo..',
    '.oyyyyyyyo.',
    '.oyyyoyyyo.',
    'oyyyyyyyyyo',
    'ooooooooooo',
  ],
  // 그늘(햇빛을 가린 구름) — 전투 효과 창(2026-10-15)
  shade: [
    '...........',
    '...ooo.....',
    '..ollmo....',
    '.olllmmooo.',
    '.ollmmmlmmo',
    'ollmmmmmmmo',
    'olmmmmmmmso',
    'ommmmmmmsso',
    '.osssssssdo',
    '..ooooooooo',
    '...........',
  ],
  // 독(보라 방울 + 기포) — 전투 효과 창(2026-10-15)
  poison: [
    '....o......',
    '...ovo..o..',
    '..ovVvo.oVo',
    '..ovVvo..o.',
    '.ovVvvvo...',
    'ovvvvvvvo..',
    'ovvvvvvuo..',
    'ovvvvvvuo..',
    'ouvvvvuuo..',
    '.ouuuuuo...',
    '..ooooo....',
  ],
  lockS: [
    '..ooo..',
    '.o...o.',
    'ooooooo',
    'oyyoyyo',
    'oyyoyOo',
    'oOOOOOo',
    'ooooooo',
  ],
  // 15×15 — 하단 탭
  navShop: [   // 카트 — 한 색으로 칠해지는 실루엣(2026-10-17 사용자 "아래 상점 탐사 쭉 아이콘이 뭘 의미하는지 모르겠어")
    '...............',
    'ooo............',
    '..o............',
    '..ooooooooooooo',
    '..ooooooooooooo',
    '...oo.oo.oo.oo.',
    '...oo.oo.oo.oo.',
    '....oooooooooo.',
    '....ooooooooo..',
    '.....o.........',
    '.....ooooooooo.',
    '...............',
    '.....oo....oo..',
    '.....oo....oo..',
    '...............',
  ],
  navExplore: [   // 고리 행성 + 별 — 한 색으로 칠해지는 실루엣(2026-10-17 사용자 "아래 상점 탐사 쭉 아이콘이 뭘 의미하는지 모르겠어")
    '.............o.',
    '............ooo',
    '.....ooooo...o.',
    '...ooooooooo...',
    '..ooooooooooo..',
    '..ooooooooooo..',
    '.............oo',
    '..ooooooooooooo',
    'ooooooooooooo..',
    'oo.............',
    '..ooooooooooo..',
    '...ooooooooo...',
    '.....ooooo.....',
    '...............',
    '...............',
  ],
  navHome: [   // 화분 속 새싹 — 한 색으로 칠해지는 실루엣(2026-10-17 사용자 "아래 상점 탐사 쭉 아이콘이 뭘 의미하는지 모르겠어")
    '.........oooo..',
    '..oo....oooooo.',
    '.oooo..ooooooo.',
    '.ooooo.oooooo..',
    '..ooooooooo....',
    '....oooooo.....',
    '......oo.......',
    '......oo.......',
    '..ooooooooooo..',
    '...............',
    '...ooooooooo...',
    '...ooooooooo...',
    '....ooooooo....',
    '....ooooooo....',
    '...............',
  ],
  navNursery: [   // 물뿌리개 + 물방울 — 한 색으로 칠해지는 실루엣(2026-10-17 사용자 "아래 상점 탐사 쭉 아이콘이 뭘 의미하는지 모르겠어")
    '...............',
    '...ooooo.......',
    '..oo...oo......',
    '..o.....o...oo.',
    '.ooooooooo.ooo.',
    '.ooooooooooooo.',
    '.oooooooooooo..',
    '.oooooooooo....',
    '.oooooooooo....',
    '.oooooooooo..o.',
    '.oooooooooo.ooo',
    '..oooooooo..ooo',
    '..............o',
    '...........o...',
    '..........ooo..',
  ],
  navShip: [   // 로켓(네모 창) — 한 색으로 칠해지는 실루엣(2026-10-17 사용자 "아래 상점 탐사 쭉 아이콘이 뭘 의미하는지 모르겠어")
    '.......o.......',
    '......ooo......',
    '.....ooooo.....',
    '....ooooooo....',
    '....oo...oo....',
    '....oo...oo....',
    '....ooooooo....',
    '....ooooooo....',
    '..o.ooooooo.o..',
    '.oo.ooooooo.oo.',
    '.ooooooooooooo.',
    '.oo..ooooo..oo.',
    '......ooo......',
    '.......o.......',
    '...............',
  ],
  navBag: [
    '.....ooooo.....',
    '....ohhhhjo....',
    '.....ooooo.....',
    '....oHhhhjo....',
    '...oHHhhhhjo...',
    '..oHHhhhhhhjo..',
    '.oHHhhyyyhhhjo.',
    '.oHhhhyYyhhhjo.',
    '.oHhhhyyyhhhjo.',
    '.oHhhhhhhhhhjo.',
    '.oHhhhhhhhhjjo.',
    '..ohhhhhhhjjo..',
    '...ojjjjjjjo...',
    '....ooooooo....',
    '...............',
  ],
  navBook: [
    '...............',
    '.ooooooo.ooooo.',
    '.orrrrrro.Bbbo.',
    'orRrrrrrRoBbbno',
    'orRrlllrRoBbbno',
    'orRrrrrrRoBbbno',
    'orRrlllrRoBbbno',
    'orRrrrrrRoBbbno',
    'orRrrrrrRoBbbno',
    'orRrrrrrRoBbbno',
    'orRRRRRRRoBbbno',
    'oooooooooonnnno',
    '.ollllllllllllo',
    '.ooooooooooooo.',
    '...............',
  ],
  // 대기실 오른쪽 단추(2026-10-22): 순위표 = 우승컵 · 공지 = 느낌표 말풍선
  navRank: [
    '...............',
    '..ooooooooooo..',
    'oooYyyyyyyyyOoo',
    'o.oYyyyYyyyOo.o',
    'o.oYyyYYYyyOo.o',
    '.ooYyyyYyyyOoo.',
    '..oYyyyyyyyOo..',
    '...oYyyyyyOo...',
    '....ooyyyoo....',
    '......oyo......',
    '......oyo......',
    '....ooOOOoo....',
    '...oyyyyyyyo...',
    '...ooooooooo...',
    '...............',
  ],
  navNotice: [
    '...............',
    '..ooooooooooo..',
    '.oBBBBBBBBBBBo.',
    'oBBBBBBoBBBBbbo',
    'oBBBBBBoBBBBbbo',
    'oBBBBBBoBBBBbbo',
    'oBBBBBBoBBBBbbo',
    'oBBBBBBBBBBBbbo',
    'oBBBBBBoBBBBbbo',
    '.obbbbbbbbbbbo.',
    '..oooobbooooo..',
    '......obo......',
    '......oo.......',
    '...............',
    '...............',
  ],
};

const built = new Map();
// 코덱스 아이콘(2026-10-22 사용자 "전부해봐" — 손그림 아이콘을 코덱스 디자인 도트로, tools/pixel/big/icons.mjs → assets/v2/icons/):
//  <이름>.png = 손그림과 같은 크기(1배 자리 — icon() 이 손그림 대신 돌려줌) · <이름>_b.png = 두 배(g.img 배율 2 자리에 저절로 — gfx.js) · 하단 탭 = <이름>_n.png 22칸
//  SMALL_KEEP = 11칸으로 줄이면 뭉개져 1배 자리엔 손그림을 그대로 쓰는 것(2배 자리만 새 그림) · ALIAS = 새 이름의 그림이 아직 없을 때 쓸 손그림
//  <이름>_m.png = 18칸(효과 창 · 효과 칩 — iconMid, 2026-10-23 사용자 "상태이상 아이콘이 픽셀화 하면서 너무 작아져서 알아보기 힘들어") — MID 목록만
export const ICONART = {}, ICONBIG = {}, ICONNAV = {}, ICONMID = {};
const MID = n => /^(fx_|st_|env_|trap_|summon_)/.test(n) || ['sword', 'shield', 'speed', 'crit', 'target'].includes(n);   // tools/pixel/big/icons.mjs MID 와 같은 목록
const NAV_ICONS = ['navShop', 'navExplore', 'navHome', 'navNursery', 'navShip', 'navBag', 'navBook'];
const ART_ICONS = ['gear', 'coin', 'gem', 'energy', 'lock', 'fire', 'water', 'grass', 'earth', 'wind', 'bolt', 'ice', 'flower', 'cactus', 'vine', 'mushroom', 'heart', 'sword', 'shield', 'speed', 'target', 'sparkle', 'crit',
  'st_stun', 'st_spore', 'st_frozen', 'st_paral', 'st_leech', 'st_root',
  // 효과 아이콘 = 효과 · 스킬 분류 엑셀 v10의 효과(2026-10-22 — 짝 표 docs/superpowers/specs/2026-10-22-v2-effect-icons.md) · 환경 · 설치형 · 소환수
  'fx_burn', 'fx_poison', 'fx_bleed', 'fx_shock', 'fx_chill', 'fx_wet', 'fx_shade', 'fx_seal', 'fx_taunt', 'fx_regen', 'fx_will', 'fx_immune', 'fx_aim', 'fx_stealth', 'fx_barrier', 'fx_evade', 'fx_reflect', 'fx_armor',
  'env_gale', 'env_inferno', 'env_fortress', 'env_sandcastle', 'env_sandstorm', 'env_healcastle', 'env_hellfort', 'env_walkcastle', 'trap_thorn', 'summon_guard',
  'can', 'fert', 'potion', 'fuel', 'parts'];
const EXTRA = ['chest_body', 'chest_lid', 'planet_ex_ermias', 'planet_ex_calisto', 'planet_ex_seraphin', 'planet_ex_kairen', 'planet_ex_mirdin', 'planet_ex_volkar', 'planet_ex_veloc', 'planet_ex_aztel', 'planet_ex_octavis', 'planet_ex_nereidon', 'planet_ex_tiamen',
  // 대회 단계 엠블럼(2026-10-23 — tools/pixel/big/emblems.mjs): l 96칸(단계 승급 모션) · m 48칸(칸 승급) · s 24칸(점수 판 · 순위표) — scenes/rankfx.js emblem()
  ...['bronze', 'silver', 'gold', 'plat', 'diamond', 'master', 'pullo'].flatMap(k => ['l', 'm', 's'].map(z => `emblem_${k}_${z}`))];
const SMALL_KEEP = new Set(['potion', 'parts', 'energy', 'shield', 'speed', 'vine']);   // 11칸 검토(2026-10-22): 해 빛살이 사라짐 · 방패가 점 · 날개 신발이 뭉개짐 · 덩굴이 가늘어짐 · 주사기 · 부품
const ALIAS = { st_stun: 'star', st_spore: 'mushroom', st_frozen: 'ice', st_paral: 'bolt', st_leech: 'seed', st_root: 'tree', fuel: 'energy', parts: 'gear',
  fx_burn: 'fire', fx_poison: 'poison', fx_bleed: 'heart', fx_shock: 'bolt', fx_chill: 'ice', fx_wet: 'water', fx_shade: 'shade', fx_seal: 'lock', fx_taunt: 'target', fx_regen: 'heal', fx_will: 'star', fx_immune: 'lock',
  fx_aim: 'crit', fx_stealth: 'down', fx_barrier: 'ice', fx_evade: 'speed', fx_reflect: 'cactus', fx_armor: 'gear', env_gale: 'wind', env_inferno: 'fire', env_fortress: 'shield', env_sandcastle: 'earth', env_sandstorm: 'wind',
  env_healcastle: 'heal', env_hellfort: 'fire', env_walkcastle: 'earth', trap_thorn: 'cactus', summon_guard: 'shield' };
const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
export async function loadIconArt(base = '../assets/v2/icons/') {
  const list = [...NAV_ICONS.flatMap(n => [n, n + '_b', n + '_n']), ...ART_ICONS.flatMap(n => [n, n + '_b', ...(MID(n) ? [n + '_m'] : [])]), ...EXTRA], got = await Promise.all(list.map(n => loadImg(base + n + '.png'))), by = {};
  list.forEach((n, i) => { if (got[i]) by[n] = got[i]; });
  for (const n of [...NAV_ICONS, ...ART_ICONS]) {
    if (by[n + '_b']) ICONBIG[n] = by[n + '_b'];
    if (by[n] && !SMALL_KEEP.has(n)) { ICONART[n] = by[n]; if (ICONBIG[n]) ICONART[n].big = ICONBIG[n]; }
    if (by[n + '_n']) ICONNAV[n] = by[n + '_n'];
    if (by[n + '_m']) ICONMID[n] = by[n + '_m'];
  }
  for (const n of EXTRA) if (by[n]) ICONART[n] = by[n];
  built.clear();   // 손그림으로 먼저 구운 것(색 입힌 것 포함)을 비워 새 그림으로
  return list.filter(n => !by[n]);
}
// 능력치 강화 · 약화(효과 · 스킬 분류 엑셀 v10 — 활력 · 억셈 · 가속 · 예리 · 집중 / 쇠약 · 시듦 · 둔화 · 무딤 · 교란, 2026-10-22 사용자 "아이콘은 엑셀 … 기준으로"):
//  fx_<능력치>_up|down = 능력치 아이콘 + 오른쪽 아래 화살표(강화 = 초록 위 · 약화 = 빨강 아래) — 같은 능력치의 강화 · 약화가 짝으로 읽히고 속성 · 상태 아이콘과 안 겹침
//  fx_all_up = 여러 능력치를 한꺼번에 올림(지금 게임의 만개 — 엑셀은 활력 · 억셈 · 가속을 따로 검) = 큰 초록 화살표
const FX_STAT = { atk: 'sword', def: 'shield', spd: 'speed', crit: 'crit', acc: 'target' };
const ARROW = {
  s: ['...o...', '..oAo..', '.oaAAo.', 'oAAAAAo', 'ooooooo'],
  b: ['.....o.....', '....oAo....', '...oaAAo...', '..oaAAAAo..', '.oAAAAAAAo.', 'oAAAAAAAAAo', 'ooooooooooo'],
  m: ['....o....', '...oAo...', '..oaAAo..', '.oaAAAAo.', 'oAAAAAAAo', 'ooooooooo'],   // 18칸 효과 창
  all: ['.....o.....', '....oAo....', '...oaAAo...', '..oaAAAAo..', '.oaAAAAAAo.', 'oooAAAAAooo', '..oAAAAAo..', '..oAAAAAo..', '..oAAAAAo..', '..ooooooo..'],
  allm: ['.......o.......', '......oAo......', '.....oaAAo.....', '....oaAAAAo....', '...oaAAAAAAo...', '..oaAAAAAAAAo..', '.oaAAAAAAAAAAo.', 'oooooAAAAAooooo',
    '....oAAAAAo....', '....oAAAAAo....', '....oAAAAAo....', '....oAAAAAo....', '....oAAAAAo....', '....ooooooo....'],
};
function fxStat(stat, up) {
  const paint = (cv, rows, ox, oy, flip, k = 1) => {
    const x = cv.getContext('2d'), P = up ? { o: '#2e222f', A: '#4fd36a', a: '#b8f5c4' } : { o: '#2e222f', A: '#ff5050', a: '#ffb0a8' };
    rows.forEach((row, j) => { const r = flip ? rows[rows.length - 1 - j] : row; for (let i = 0; i < r.length; i++) { const col = P[r[i]]; if (col) { x.fillStyle = col; x.fillRect(ox + i * k, oy + j * k, k, k); } } });
  };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  if (stat === 'all') { const c = mk(11, 10); paint(c, ARROW.all, 0, 0, false); c.big = mk(22, 20); paint(c.big, ARROW.all, 0, 0, false, 2); c.mid = mk(18, 18); paint(c.mid, ARROW.allm, 1, 2, false); return c; }
  const base = icon(FX_STAT[stat]), w = base.naturalWidth || base.width, h = base.naturalHeight || base.height, c = mk(Math.max(w, 9), Math.max(h, 9));
  c.getContext('2d').drawImage(base, 0, 0);
  paint(c, ARROW.s, c.width - 7, c.height - 5, !up);
  const B = ICONBIG[FX_STAT[stat]];
  if (B) { const bw = B.naturalWidth || B.width, bh = B.naturalHeight || B.height; c.big = mk(bw, bh); c.big.getContext('2d').drawImage(B, 0, 0); paint(c.big, ARROW.b, bw - 11, bh - 7, !up); }
  const M = ICONMID[FX_STAT[stat]];
  if (M) { const mw = M.naturalWidth || M.width, mh = M.naturalHeight || M.height; c.mid = mk(mw, mh); c.mid.getContext('2d').drawImage(M, 0, 0); paint(c.mid, ARROW.m, mw - 9, mh - 6, !up); }
  return c;
}
// 효과 창 · 효과 칩 크기(18칸) — 그림이 없으면 null(부르는 쪽이 11칸 icon 으로)
export function iconMid(name) {
  if (ICONMID[name]) return ICONMID[name];
  if (/^fx_(atk|def|spd|crit|acc|all)_(up|down)$/.test(name)) { const c = icon(name); return (c && c.mid) || null; }
  return null;
}
export function icon(name) {
  const a = ICONART[name]; if (a) return a;
  let c = built.get(name);
  if (c) return c;
  const fm = /^fx_(atk|def|spd|crit|acc|all)_(up|down)$/.exec(name);
  if (fm) { c = fxStat(fm[1], fm[2] === 'up'); built.set(name, c); return c; }
  const src = ICON_SRC[name];
  if (!src) return ALIAS[name] ? icon(ALIAS[name]) : null;
  const h = src.length, w = Math.max(...src.map(r => r.length));
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  src.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const col = LEGEND[row[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } } });
  if (ICONBIG[name]) c.big = ICONBIG[name];   // 1배는 손그림 · 2배 자리는 새 그림(SMALL_KEEP)
  built.set(name, c);
  return c;
}

// 크기를 고를 수 있는 열매(2026-10-18 사용자 "열매 아이콘 키워 · 멀리 있는 각도는 소실점 · 본인 화단 안에서도 거리감" — 스마트팜 잔디 위 열매를 줄 깊이 · 화단 앞뒤로 크기를 달리):
//  'fruit' 아이콘과 같은 색(o 테 · r 빨강 · R 그늘 · p 반짝 · w 흰 점 · E/e 꼭지 · G 잎)으로 S칸 폭 사과를 매번 도트로 새로 그림(늘려 그리지 않음 — 칸이 고름)
//  fruitPix(S) = 글자 줄(시험 · 노드에서도) · fruitIcon(S) = 캔버스(크기마다 한 번)
export function fruitPix(S) {
  S = Math.max(7, Math.round(S));
  const t = Math.max(2, Math.round(S * 0.24)), bh = Math.max(6, Math.round(S * 0.86)), H = t + bh, W = S, rx = S / 2, ry = bh / 2, cx = S / 2, cy = t + ry;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const body = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry; if (nx * nx + ny * ny > 1) return false; return !(ny < -0.8 && Math.abs(nx) < 0.2); };   // 위 가운데 살짝 오목(사과 꼭지 자리)
  const hr = Math.max(0.2, 1.2 / S + 0.12);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!body(x, y)) continue;
    if (!body(x - 1, y) || !body(x + 1, y) || !body(x, y - 1) || !body(x, y + 1)) { g[y][x] = 'o'; continue; }
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, hd = Math.hypot(nx + 0.42, ny + 0.38);
    g[y][x] = hd < hr ? 'p' : nx * 0.6 + ny * 0.8 > 0.42 ? 'R' : 'r';
  }
  if (S >= 13) { const hx = Math.floor(cx - rx * 0.42), hy = Math.floor(cy - ry * 0.38); if (g[hy] && g[hy][hx] === 'p') g[hy][hx] = 'w'; }
  const sx = Math.floor(cx - 0.5), sw = S >= 18 ? 2 : 1;   // 꼭지(위로) + 오른쪽 잎
  for (let y = 0; y <= t; y++) for (let k = 0; k < sw; k++) if (g[y][sx + k] === '.' || y === t) g[y][sx + k] = y === 0 ? 'o' : 'E';
  const lx = cx + S * 0.2, ly = t * 0.55, lrx = Math.max(1.4, S * 0.2), lry = Math.max(0.9, t * 0.5);
  const leaf = (x, y) => x >= 0 && y >= 0 && x < W && y < H && ((x + 0.5 - lx) / lrx) ** 2 + ((y + 0.5 - ly) / lry) ** 2 <= 1 && x > sx + sw - 1;
  for (let y = 0; y < t + 1; y++) for (let x = 0; x < W; x++) if (leaf(x, y) && g[y][x] === '.') g[y][x] = !leaf(x, y - 1) || !leaf(x + 1, y) || !leaf(x, y + 1) ? 'e' : 'G';
  return g.map(r => r.join(''));
}
const fruits = new Map();
export function fruitIcon(S) {
  S = Math.max(7, Math.round(S));
  let c = fruits.get(S);
  if (c) return c;
  const src = fruitPix(S);
  c = document.createElement('canvas'); c.width = src[0].length; c.height = src.length;
  const x = c.getContext('2d');
  src.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const col = LEGEND[row[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } } });
  fruits.set(S, c);
  return c;
}

// 한 번만: 줄 길이 불일치 검사(그림 실수 방지)
export function checkIcons() {
  const bad = [];
  for (const [n, src] of Object.entries(ICON_SRC)) {
    const w = src[0].length;
    src.forEach((r, j) => { if (r.length !== w) bad.push(`${n} 줄${j} 길이 ${r.length}≠${w}`); for (const ch of r) if (ch !== '.' && !LEGEND[ch]) bad.push(`${n} 줄${j} 모르는 색 '${ch}'`); });
  }
  return bad;
}

// 아이콘 색 바꾸기(잠김 표시 등): 모든 칠을 한 색으로
export function tinted(name, col) {
  const key = name + '@' + col; let c = built.get(key); if (c) return c;
  const base = icon(name); if (!base) return null;
  c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
  const x = c.getContext('2d'); x.drawImage(base, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  built.set(key, c); return c;
}
