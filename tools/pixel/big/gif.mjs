// 움직이는 검토판용 GIF89a 인코더 — 같은 크기 프레임(Img, 불투명) 여러 장 → 전역 팔레트(256색 이하) + LZW, 무한 반복
export function encodeGIF(frames, { delay = 10 } = {}) {
  const w = frames[0].w, h = frames[0].h, pal = new Map(), idx = [];
  for (const f of frames) {
    const ix = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const k = (f.data[i * 4] << 16) | (f.data[i * 4 + 1] << 8) | f.data[i * 4 + 2];
      if (!pal.has(k)) { if (pal.size >= 256) throw new Error('GIF 색이 256을 넘음'); pal.set(k, pal.size); }
      ix[i] = pal.get(k);
    }
    idx.push(ix);
  }
  const bits = Math.max(1, Math.ceil(Math.log2(Math.max(2, pal.size)))), mcs = Math.max(2, bits), out = [];
  const u16 = v => [v & 255, (v >> 8) & 255];
  out.push(...[...'GIF89a'].map(c => c.charCodeAt(0)), ...u16(w), ...u16(h), 0xf0 | (bits - 1), 0, 0);
  const table = new Array(3 << bits).fill(0);
  for (const [k, i] of pal) { table[i * 3] = k >> 16; table[i * 3 + 1] = (k >> 8) & 255; table[i * 3 + 2] = k & 255; }
  out.push(...table);
  out.push(0x21, 0xff, 11, ...[...'NETSCAPE2.0'].map(c => c.charCodeAt(0)), 3, 1, 0, 0, 0);
  for (const ix of idx) {
    out.push(0x21, 0xf9, 4, 0, ...u16(delay), 0, 0);
    out.push(0x2c, 0, 0, 0, 0, ...u16(w), ...u16(h), 0, mcs);
    const data = lzw(ix, mcs);
    for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); out.push(n); for (let j = 0; j < n; j++) out.push(data[i + j]); }
    out.push(0);
  }
  out.push(0x3b);
  return Buffer.from(out);
}

export function lzw(ix, mcs) {
  const CLEAR = 1 << mcs, EOI = CLEAR + 1, out = [];
  let size = mcs + 1, next = EOI + 1, dict = new Map(), buf = 0, cnt = 0;
  const put = c => { buf |= c << cnt; cnt += size; while (cnt >= 8) { out.push(buf & 255); buf >>>= 8; cnt -= 8; } };
  put(CLEAR);
  let pre = ix[0];
  for (let i = 1; i < ix.length; i++) {
    const k = ix[i], key = (pre << 8) | k, hit = dict.get(key);
    if (hit !== undefined) { pre = hit; continue; }
    put(pre);
    if (next === 4096) { put(CLEAR); dict = new Map(); size = mcs + 1; next = EOI + 1; }
    else { if (next > (1 << size) - 1) size++; dict.set(key, next++); }
    pre = k;
  }
  put(pre);
  put(EOI);
  if (cnt > 0) out.push(buf & 255);
  return out;
}
