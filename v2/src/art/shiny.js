// 색 변종(이로치) 그림(2026-10-22 사용자 "색 변종 그림부터 해줘" — 결정 2026-10-18: 그림 색을 진짜로 바꿈 · 주된 몸 색만 바꾸고 눈 · 화분은 그대로 · 종마다 보여 드리고 고름):
//  종 규칙(shinyRules.js — 후보 A · B · C 중 pick)대로 시트 · 작은 그림의 색을 바꿔 한 번 굽고 재사용. 눈(깜빡임 장과 다른 칸의 색) · 흙 덮기 색은 그대로.
//  그림 키 꼬리 '~s' = 고른 후보 · '~sA' · '~sB' · '~sC' = 그 후보(검토판) — art/sprites.js bigOf · smallOf 가 처음 쓸 때 만듦
import { SHINY_RULES } from './shinyRules.js';
import { recolorData, eyeKeep } from './shinyColor.js';
import { soilish } from './potgrass.js';
export const speciesOf = key => String(key).replace(/~s.*$/, '').replace(/_(young|teen)$/, '');
const stageOf = key => (String(key).replace(/~s.*$/, '').match(/_(young|teen)$/) || [])[1];
// 생장 단계 그림(어린 · 자람)은 그 단계 규칙이 있으면 그것(몸에 묻힌 어린 불꽃처럼 부위 모양이 달라 성체 규칙이 안 맞는 종 — 2026-10-22)
//  stage = 'small' 이면 작은 그림 규칙(절반으로 줄여 불꽃 · 배 빛이 붙어 버린 그림)
export const shinyRule = (key, v, stage = null) => { const S = SHINY_RULES[speciesOf(key)]; if (!S) return null; const p = v || S.pick, T = S[stage || stageOf(key)]; return (T && T[p]) || S[p] || null; };
// 그림 키를 [원래 키, 후보] 로(색 변종이 아니면 null)
export function shinyKey(key) { const i = typeof key === 'string' ? key.indexOf('~s') : -1; return i < 0 ? null : [key.slice(0, i), key.slice(i + 2) || null]; }
// img = 시트(meta 가 있으면 깜빡임 장으로 눈 색을 찾음) 또는 작은 그림(eye = 그 종 시트에서 찾은 눈 색 · 48×56 두 층)
export function shinyCanvas(img, key, v, meta = null, eye = null) {
  const rule = shinyRule(key, v, meta ? null : 'small'); if (!rule) return null;
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, w, h), keep = eye || (meta ? eyeKeep(d.data, w, meta) : null);
  const geom = meta ? { W: w, w: meta.w, h: meta.h, cols: meta.cols, rows: meta.rows } : { W: w, w, h: h >> 1, cols: 1, rows: 1 };   // 장마다 식물 둘레(띠의 box 조건)
  recolorData(d.data, rule, keep, soilish, geom);
  x.putImageData(d, 0, 0);
  c.eye = keep;
  return c;
}
