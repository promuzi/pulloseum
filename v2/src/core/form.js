// 글 입력 판(DOM — 캔버스 위에 뜸): 로그인 · 가입 · 이름 바꾸기 · 방 코드.
//  휴대폰 키보드가 열리면 창 높이가 줄어드는데, 그때 게임 화면 배율이 바뀌지 않게 열려 있는 동안 화면 크기를 고정(screen.fixed).
let cur = null;
const CSS = `
.pf-wrap{position:fixed;inset:0;z-index:10;display:flex;justify-content:center;align-items:flex-start;background:rgba(6,10,18,.62);font-family:Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;-webkit-user-select:text;user-select:text;overflow:auto}
.pf-box{margin:12vh 0 24px;width:min(88vw,330px);background:#0b1d2e;border:2px solid #8ccfff;box-shadow:0 0 0 2px #05070f,0 6px 0 2px #05070f;padding:16px 16px 14px;color:#e6f3ff}
.pf-box h2{margin:0 0 4px;font-size:19px;font-weight:800;letter-spacing:-.2px}
.pf-note{margin:0 0 6px;color:#9cc4dc;font-size:13px;font-weight:600;line-height:1.45}
.pf-box label{display:block;margin:12px 0 5px;color:#8ccfff;font-size:13px;font-weight:700}
.pf-box input{box-sizing:border-box;width:100%;height:46px;padding:0 12px;background:#06111f;border:2px solid #2f5c8a;color:#fff;font:600 16px Pretendard,"Malgun Gothic",sans-serif;border-radius:0;outline:none;-webkit-appearance:none}
.pf-box input:focus{border-color:#8ccfff}
.pf-hint{margin-top:4px;color:#6f98b4;font-size:12px;font-weight:600}
.pf-err{min-height:18px;margin:10px 0 0;color:#ff9a8a;font-size:13px;font-weight:700}
.pf-btns{display:flex;gap:8px;margin-top:8px}
.pf-btns button{flex:1;height:46px;border:0;border-radius:0;font:800 15px Pretendard,"Malgun Gothic",sans-serif;cursor:pointer;box-shadow:inset 0 -4px 0 rgba(0,0,0,.32)}
.pf-ok{background:#f0be7d;color:#2a1a08}
.pf-cancel{background:#1f3a52;color:#d4e9ff}
.pf-btns button:disabled{opacity:.5}
.pf-alt{display:block;margin:12px auto 0;background:none;border:0;color:#8ccfff;font:700 13px Pretendard,"Malgun Gothic",sans-serif;text-decoration:underline;cursor:pointer}
`;
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// opt: { title, note, fields: [{ id, label, type, value, max, hint, auto, mode }], ok, cancel, alt: { label, fn }, onSubmit: async vals => 오류 문구 | null }
export function openForm(app, opt) {
  closeForm();
  if (!document.getElementById('pf-css')) { const st = el('style'); st.id = 'pf-css'; st.textContent = CSS; document.head.appendChild(st); }
  const scr = app.screen; scr.fixed = { s: scr.s, W: scr.W, H: scr.H };
  const wrap = el('div', 'pf-wrap'), box = el('form', 'pf-box');
  box.setAttribute('autocomplete', 'on'); box.noValidate = true;
  box.appendChild(el('h2', null, opt.title));
  if (opt.note) box.appendChild(el('p', 'pf-note', opt.note));
  const inputs = {};
  for (const f of opt.fields || []) {
    const lab = el('label', null, f.label), inp = el('input');
    inp.type = f.type || 'text'; inp.name = f.id; inp.value = f.value || ''; if (f.max) inp.maxLength = f.max;
    inp.autocomplete = f.auto || 'off'; inp.autocapitalize = 'none'; inp.spellcheck = false; if (f.mode) inp.inputMode = f.mode;
    lab.htmlFor = inp.id = 'pf-' + f.id;
    box.appendChild(lab); box.appendChild(inp);
    if (f.hint) box.appendChild(el('div', 'pf-hint', f.hint));
    inputs[f.id] = inp;
  }
  const err = el('p', 'pf-err'); err.setAttribute('role', 'alert'); box.appendChild(err);
  const row = el('div', 'pf-btns'), cancel = el('button', 'pf-cancel', opt.cancel || '취소'), ok = el('button', 'pf-ok', opt.ok || '확인');
  cancel.type = 'button'; ok.type = 'submit';
  if (opt.cancel !== false) row.appendChild(cancel);
  row.appendChild(ok); box.appendChild(row);
  if (opt.alt) { const a = el('button', 'pf-alt', opt.alt.label); a.type = 'button'; a.onclick = () => { closeForm(); opt.alt.fn(); }; box.appendChild(a); }
  cancel.onclick = () => { closeForm(); if (opt.onCancel) opt.onCancel(); };
  box.onsubmit = async e => {
    e.preventDefault();
    const vals = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.value]));
    ok.disabled = cancel.disabled = true; err.textContent = '';
    let msg = null;
    try { msg = await opt.onSubmit(vals); } catch (x) { msg = x.message || '문제가 생겼어요'; }
    if (!cur || cur.box !== box) return;
    if (msg) { err.textContent = msg; ok.disabled = cancel.disabled = false; } else closeForm();
  };
  wrap.addEventListener('pointerdown', e => { if (e.target === wrap && opt.cancel !== false) { closeForm(); if (opt.onCancel) opt.onCancel(); } });
  wrap.appendChild(box); document.body.appendChild(wrap);
  cur = { wrap, box, app };
  const first = Object.values(inputs)[0];
  if (first) setTimeout(() => { try { first.focus(); } catch {} }, 60);
  return cur;
}
export function closeForm() {
  if (!cur) return;
  const { wrap, app } = cur; cur = null;
  wrap.remove();
  app.screen.fixed = null; app.screen.resize(); app.g.ctx = app.screen.ctx;
}
export const formOpen = () => !!cur;
