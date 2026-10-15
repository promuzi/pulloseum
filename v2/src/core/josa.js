// 한국어 조사(받침에 따라): 이/가 · 은/는 · 을/를 · 과/와 · (으)로
const code = s => { s = String(s); const c = s.charCodeAt(s.length - 1) - 0xac00; return c >= 0 && c <= 11171 ? c % 28 : -1; };
export const hasB = s => code(s) > 0;
export const ga = s => s + (hasB(s) ? '이' : '가');
export const eun = s => s + (hasB(s) ? '은' : '는');
export const eul = s => s + (hasB(s) ? '을' : '를');
export const wa = s => s + (hasB(s) ? '과' : '와');
export const ro = s => s + (hasB(s) && code(s) !== 8 ? '으로' : '로');   // ㄹ 받침은 '로'
