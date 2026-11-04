// 장면 음악 들어 보기: 실제 장면 차례를 굽고(soundreel — 실제 음악 지휘자 그대로) 화면엔 지금 장면 · 시각 → 넘어가는 이음까지 한 번에.
//   node tools/shots/musicscene.mjs [묶음 …]  → tools/shots/out/<묶음 out>.mp4 (+ .wav) · 묶음 없음 = scene
//   scene = 탐사 · 정비 · 상점(2026-11-04 사용자 'BCD 전부 어울리는 곳에 배치해줘' — 대기 → 탐사 → 정비 → 탐사 → 상점 → 대기)
//   farm = 스마트팜 스윙 재즈(2026-11-04 사용자 '재즈 특유의 박자 갖고 노는 느낌은 못 만드나?' → '새판 버전 좋아ㄱㄱ' — 옛 재즈팝은 뺌)
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeMP4Files } from '../pixel/big/video.mjs';
const here = dirname(fileURLToPath(import.meta.url)), out = resolve(here, 'out');
mkdirSync(out, { recursive: true });
const BAR = (60 / 90) * 4;
// [요청 초, 지휘자 상태, 화면 이름, 바뀌는 마디] — 요청은 마디 끝 박 앞(이음 장식이 들리게), 실제로 바뀌는 때 = 다음 마디 첫 칸
const SETS = {
  scene: { out: 'music_scene', sec: 60, plan: [[0, 'home', '대기실', 0], [4.5, 'space', '탐사 — 앰비언트 비트', 2], [18, 'hangar', '탐사선 정비 — 8비트 칩튠', 7], [31, 'space', '탐사', 12], [39.5, 'shop', '상점 — 로파이 말렛', 15], [52, 'home', '대기실', 20]] },
  farm: { out: 'music_farm', sec: 46, plan: [[0, 'home', '대기실', 0], [4.5, 'farm', '스마트팜 — 스윙 재즈', 2], [39.5, 'home', '대기실', 15]] },
};
const want = process.argv.slice(2).filter(a => SETS[a]);
const py = 'C:/Users/soosa/AppData/Local/Programs/Python/Python312/python.exe';
for (const key of want.length ? want : ['scene']) {
  const { out: name, sec: SEC, plan: PLAN } = SETS[key];
  execFileSync(process.execPath, [resolve(here, 'soundreel.mjs'), '--out', name, '--plan', PLAN.map(([t, st]) => `${t}:${st}`).join(','), '--sec', String(SEC), '--loud', '--nosfx'], { stdio: 'inherit' });
  const dir = mkdtempSync(join(tmpdir(), 'mscene-'));
  const segs = PLAN.map(([, , nm, bar], i) => [nm, bar * BAR, i + 1 < PLAN.length ? PLAN[i + 1][3] * BAR : SEC]);
  writeFileSync(join(dir, 'spec.json'), JSON.stringify({ dir, sec: SEC, segs }));
  const script = join(dir, 'cards.py');
  writeFileSync(script, [
    'import json, sys, os',
    'from PIL import Image, ImageDraw, ImageFont',
    'J = json.load(open(sys.argv[1], encoding="utf-8"))',
    'F = lambda n, s: ImageFont.truetype("C:/Windows/Fonts/" + n, s)',
    'big, mid, sm = F("malgunbd.ttf", 40), F("malgun.ttf", 28), F("malgun.ttf", 24)',
    'for k in range(int(J["sec"] * 2)):',
    '  t = k / 2',
    '  im = Image.new("RGB", (540, 960), (12, 16, 26)); d = ImageDraw.Draw(im)',
    '  now = [s for s in J["segs"] if s[1] <= t < s[2]] or [J["segs"][-1]]',
    '  d.text((40, 260), now[0][0], fill=(255, 216, 144), font=big)',
    '  d.text((40, 330), f"{int(t // 60)}:{int(t % 60):02d}", fill=(200, 214, 230), font=mid)',
    '  bar = int(460 * (t / J["sec"])); d.rectangle((40, 380, 500, 392), fill=(36, 48, 70)); d.rectangle((40, 380, 40 + bar, 392), fill=(140, 207, 255))',
    '  y = 450',
    '  for nm, a, b in J["segs"]:',
    '    on = a <= t < b',
    '    d.text((40, y), f"{int(a // 60)}:{int(a % 60):02d}  {nm}", fill=(255, 216, 144) if on else (110, 126, 150), font=sm); y += 40',
    '  im.save(os.path.join(J["dir"], f"f{k:05d}.png"))',
  ].join('\n'));
  execFileSync(py, [script, join(dir, 'spec.json')], { stdio: 'inherit' });
  const files = Array.from({ length: SEC * 2 }, (_, k) => `f${String(k).padStart(5, '0')}.png`);
  writeMP4Files(resolve(out, name + '.mp4'), dir, files, { fps: 2, w: 540, h: 960, audio: resolve(out, name + '.wav'), crf: 'MEDIUM' });
  rmSync(dir, { recursive: true, force: true });
}
