// 음악 검토 영상(2026-10-16 사용자 "음악 피드백은 언제하나?"): 장면별 곡을 이어 굽고(soundreel — 실제 음악 지휘자 그대로) 화면엔 지금 장면 이름 · 시각.
//  휴대폰으로 보며 "몇 초 ○○ 곡이 별로"처럼 말하기 좋게. node tools/shots/musicreview.mjs → tools/shots/out/music_review.mp4 (+ .wav)
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeMP4Files } from '../pixel/big/video.mjs';
const here = dirname(fileURLToPath(import.meta.url)), out = resolve(here, 'out');
mkdirSync(out, { recursive: true });
// [초, 지휘자 상태, 화면 이름] — 대기 · 메뉴 · 스마트팜 · 탐사 · 식물 관리는 한 곡 안의 세션 바뀜, 매칭 · 전투 · 처음 화면은 다른 곡
const SEG = [[0, 'title', '처음 화면(조율 → 전등)'], [13, 'boot', '켜짐 → 대기실'], [30, 'home', '대기실'], [42, 'menu', '메뉴(가방 · 도감 · 상점 · 친구 대결 방)'],
  [54, 'farm', '스마트팜 · 보관고'], [66, 'space', '탐사 · 정비'], [78, 'focus', '식물 관리'], [90, 'ready', '매칭'], [94, 'battle', '전투'],
  [118, 'win', '승리'], [121, 'result', '결과'], [130, 'battle', '전투(두 번째)'], [140, 'lose', '패배'], [143, 'result', '결과']];
const SEC = 152;
const plan = SEG.map(([t, st]) => `${t}:${st}`).join(',');
execFileSync(process.execPath, [resolve(here, 'soundreel.mjs'), '--out', 'music_review', '--plan', plan, '--sec', String(SEC), '--loud', '--nosfx'], { stdio: 'inherit' });
// 장면 카드(파이썬 PIL — 맑은 고딕): 장면마다 한 장, 1초에 2장으로 이어 붙임
const dir = mkdtempSync(join(tmpdir(), 'mrev-'));
const py = 'C:/Users/soosa/AppData/Local/Programs/Python/Python312/python.exe';
const spec = SEG.map(([t, , name], i) => ({ i, name, t0: t, t1: i + 1 < SEG.length ? SEG[i + 1][0] : SEC }));
writeFileSync(join(dir, 'spec.json'), JSON.stringify({ dir, spec, sec: SEC }));
const script = join(dir, 'cards.py');
writeFileSync(script, [
  'import json, sys, os',
  'from PIL import Image, ImageDraw, ImageFont',
  'J = json.load(open(sys.argv[1], encoding="utf-8"))',
  'big = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 46); mid = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 30)',
  'for s in J["spec"]:',
  '  for half in range(int((s["t1"] - s["t0"]) * 2)):',
  '    t = s["t0"] + half / 2',
  '    im = Image.new("RGB", (540, 960), (12, 16, 26)); d = ImageDraw.Draw(im)',
  '    d.text((40, 300), s["name"], fill=(255, 216, 144), font=big)',
  '    d.text((40, 380), f"{int(t // 60)}:{int(t % 60):02d}", fill=(200, 214, 230), font=mid)',
  '    bar = int(460 * (t / J["sec"])); d.rectangle((40, 440, 500, 452), fill=(36, 48, 70)); d.rectangle((40, 440, 40 + bar, 452), fill=(140, 207, 255))',
  '    y = 520',
  '    for o in J["spec"]:',
  '      on = o["i"] == s["i"]',
  '      d.text((40, y), f"{int(o[\'t0\'] // 60)}:{int(o[\'t0\'] % 60):02d}  {o[\'name\']}", fill=(255, 216, 144) if on else (110, 126, 150), font=ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 20)); y += 28',
  '    im.save(os.path.join(J["dir"], f"f{int(t * 2):05d}.png"))',
].join('\n'));
execFileSync(py, [script, join(dir, 'spec.json')], { stdio: 'inherit' });
const files = Array.from({ length: SEC * 2 }, (_, k) => `f${String(k).padStart(5, '0')}.png`);
writeMP4Files(resolve(out, 'music_review.mp4'), dir, files, { fps: 2, w: 540, h: 960, audio: resolve(out, 'music_review.wav'), crf: 'MEDIUM' });
rmSync(dir, { recursive: true, force: true });
