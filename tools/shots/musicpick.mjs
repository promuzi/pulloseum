// 탐사 음악 후보 듣기(2026-11-04 사용자 '클래식은 템포도 느려져서 어색하고 악기도 별로임 어떻게 할지 후보를 줘봐'):
//  후보마다 대기 → 탐사 후보 → 대기 차례를 굽고(soundreel — 실제 음악 지휘자 그대로) 화면엔 후보 이름 · 지금 자리 · 시각.
//  같은 곡 자리에서 시작해 후보끼리 같은 가락 구간을 견줌(대기 2마디 → 탐사 11마디 → 대기 3마디).
//   node tools/shots/musicpick.mjs [--only A,C]  → tools/shots/out/space_pick_A.mp4 …
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeMP4Files } from '../pixel/big/video.mjs';
const here = dirname(fileURLToPath(import.meta.url)), out = resolve(here, 'out');
mkdirSync(out, { recursive: true });
const argv = process.argv.slice(2), oi = argv.indexOf('--only'), only = oi >= 0 ? argv[oi + 1].split(',') : null;
// [글자, 지휘자 상태, 이름, 악기]
const CANDS = [
  ['A', 'spaceA', '㉠ 레트로 SF 신스', '16분 아르페지오 · 아날로그 리드 · 가벼운 북'],
  ['B', 'spaceB', '㉡ 로파이 말렛', '마림바 반주 · 칼림바 가락 · 대기 북 그대로'],
  ['C', 'spaceC', '㉢ 8비트 칩튠', '펄스 아르페지오 · 펄스 가락 · 세모 베이스 · 잡음 북'],
  ['D', 'spaceD', '㉣ 앰비언트 비트', '넓은 패드 · 높은 종 · 유리 리드 · 옅은 북'],
];
const BAR = (60 / 90) * 4, SEC = 42, T_IN = 2 * BAR, T_OUT = 13 * BAR;   // 4.5초 요청 → 2마디부터 탐사 · 34초 요청 → 13마디부터 대기
const py = 'C:/Users/soosa/AppData/Local/Programs/Python/Python312/python.exe';
for (const [key, state, name, inst] of CANDS) {
  if (only && !only.includes(key)) continue;
  const base = `space_pick_${key}`;
  execFileSync(process.execPath, [resolve(here, 'soundreel.mjs'), '--out', base, '--plan', `0:home,4.5:${state},34:home`, '--sec', String(SEC), '--loud', '--nosfx'], { stdio: 'inherit' });
  const dir = mkdtempSync(join(tmpdir(), 'mpick-'));
  writeFileSync(join(dir, 'spec.json'), JSON.stringify({ dir, name, inst, sec: SEC, segs: [['대기', 0, T_IN], ['탐사 후보', T_IN, T_OUT], ['대기', T_OUT, SEC]] }));
  const script = join(dir, 'cards.py');
  writeFileSync(script, [
    'import json, sys, os',
    'from PIL import Image, ImageDraw, ImageFont',
    'J = json.load(open(sys.argv[1], encoding="utf-8"))',
    'F = lambda n, s: ImageFont.truetype("C:/Windows/Fonts/" + n, s)',
    'big, mid, sm = F("malgunbd.ttf", 44), F("malgun.ttf", 26), F("malgun.ttf", 22)',
    'for k in range(int(J["sec"] * 2)):',
    '  t = k / 2',
    '  im = Image.new("RGB", (540, 960), (12, 16, 26)); d = ImageDraw.Draw(im)',
    '  d.text((40, 250), "탐사 음악 후보", fill=(140, 207, 255), font=mid)',
    '  d.text((40, 300), J["name"], fill=(255, 216, 144), font=big)',
    '  d.text((40, 372), J["inst"], fill=(200, 214, 230), font=sm)',
    '  d.text((40, 440), f"{int(t // 60)}:{int(t % 60):02d}", fill=(200, 214, 230), font=mid)',
    '  bar = int(460 * (t / J["sec"])); d.rectangle((40, 490, 500, 502), fill=(36, 48, 70)); d.rectangle((40, 490, 40 + bar, 502), fill=(140, 207, 255))',
    '  y = 560',
    '  for nm, a, b in J["segs"]:',
    '    on = a <= t < b',
    '    d.text((40, y), f"{int(a // 60)}:{int(a % 60):02d}  {nm}", fill=(255, 216, 144) if on else (110, 126, 150), font=mid); y += 44',
    '  im.save(os.path.join(J["dir"], f"f{k:05d}.png"))',
  ].join('\n'));
  execFileSync(py, [script, join(dir, 'spec.json')], { stdio: 'inherit' });
  const files = Array.from({ length: SEC * 2 }, (_, k) => `f${String(k).padStart(5, '0')}.png`);
  writeMP4Files(resolve(out, base + '.mp4'), dir, files, { fps: 2, w: 540, h: 960, audio: resolve(out, base + '.wav'), crf: 'MEDIUM' });
  rmSync(dir, { recursive: true, force: true });
}
