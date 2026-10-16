# 실행: PYTHONIOENCODING=utf-8 PYTHONPATH=tools/fonts/pyshim python tools/fonts/subset.py — 게임 글자를 바꾸면(새 낱말에 상용 2,350자 밖 글자가 있으면) 다시 돌림
# 프리텐다드 줄이기: 영문 · 기호 + 한글 상용 2,350자(KS X 1001) + 게임 코드에 들어 있는 모든 글자 → assets/fonts/sub/*.woff2
import os, glob, subprocess, sys
R = 'C:/dev/pulloseum/'
chars = set(chr(c) for c in range(0x20, 0x7F))
chars |= set(chr(c) for c in range(0xA0, 0x100))            # 라틴-1(· 등)
chars |= set(chr(c) for c in range(0x2010, 0x2070))          # 문장 부호(— … ‘ ’ “ ” ※ 등)
chars |= set(chr(c) for c in range(0x2190, 0x21FF))          # 화살표
chars |= set(chr(c) for c in range(0x2460, 0x24FF))          # 동그라미 숫자
chars |= set(chr(c) for c in range(0x25A0, 0x2600)) | set(chr(c) for c in range(0x2600, 0x2700)) | set(chr(c) for c in range(0x2700, 0x27C0))   # 도형 · 기호 · 딩뱃
chars |= set(chr(c) for c in range(0x3000, 0x3040)) | set(chr(c) for c in range(0x3130, 0x3190))   # 한글 낱자 · 동아시아 문장 부호
for c in range(0xAC00, 0xD7A4):
    ch = chr(c)
    try:
        if len(ch.encode('euc-kr')) == 2: chars.add(ch)   # 상용 2,350자(KS X 1001 두 바이트) — 8바이트 조합형은 뺌
    except UnicodeEncodeError: pass
n0 = len(chars)
for p in glob.glob(R + 'v2/src/**/*.js', recursive=True) + [R + 'v2/index.html', R + 'v2/privacy.html']:
    for ch in open(p, encoding='utf-8').read():
        if ord(ch) >= 0x80: chars.add(ch)
print('글자', n0, '→', len(chars))
uf = R + 'tools/fonts/unicodes.txt'
os.makedirs(R + 'assets/fonts/sub', exist_ok=True)
open(uf, 'w').write(','.join('U+%04X' % ord(c) for c in sorted(chars)))
for w in ['SemiBold', 'Bold', 'ExtraBold', 'Black']:
    src = R + f'assets/fonts/Pretendard-{w}.woff2'; out = R + f'assets/fonts/sub/Pretendard-{w}.woff2'
    subprocess.run([sys.executable, '-m', 'fontTools.subset', src, f'--unicodes-file={uf}', '--flavor=woff2', f'--output-file={out}', '--layout-features=*', '--no-hinting'], check=True)
    print(w, os.path.getsize(src) // 1024, 'KB →', os.path.getsize(out) // 1024, 'KB')
