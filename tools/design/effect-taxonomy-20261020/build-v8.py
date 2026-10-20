"""v7 엑셀을 바탕으로 v8을 만든다: 속박 단독 스킬 결정과 오늘 바꾼 이름이 덜 바뀐 칸만 고치고 나머지 패키지는 그대로 복사한다."""
import json
import re
import sys
import zipfile
from xml.sax.saxutils import escape, unescape

sys.stdout.reconfigure(encoding="utf-8")

SRC = r"C:\dev\pulloseum\outputs\01a151d0-9d92-7900-b5be-31a811469c9d\풀로세움_효과와스킬_분류_v7.xlsx"
DST = sys.argv[1]
HEIGHTS = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else {}
LOG = sys.argv[3] if len(sys.argv) > 3 else None

S1, S2, S3 = (f"xl/worksheets/sheet{i}.xml" for i in (1, 2, 3))

# 효과 분류 J28(속박): 사용자 메모 첫 줄은 그대로 두고 둘째 줄만 바꾼다
J28_OLD_LINE2 = "속박만 있는 스킬은 두지 않고 항상 부가 상태이상으로 연결한다. 해당 스킬 허용 여부는 미결."
J28_NEW_LINE2 = "속박만 있는 스킬은 지금 두지 않고 부가 상태이상으로 연결한다. 금지 규칙은 아니며 단독으로 쓸 만하면 나중에 넣어 본다."

EDITS = {
    S2: {  # 스킬 분류
        "H24": "제한(봉인·속박·도발)은 다음 1턴. 속박 단독 기술은 지금 없지만 금지 규칙은 아님(쓸 만하면 나중에 추가). 부여 분포는 시뮬 조정(스택형은 여러 스킬로, 비스택형은 비중 축소, 불 스킬 화상 일괄 부가 지양)",
    },
    S3: {  # 검토 대기
        "A2": "검토할 용어와 기절",
        "F10": "남은 검토: 기생의 교체 후 연결(B11), 기절(마비·얼음 포함)의 대기 중 소모",
        "D14": "기절로 쉰 뒤 다음 행동 한 번의 면역(지금 1턴)",
        "C20": "속박만 거는 스킬은 지금 쓸모가 없어 두지 않지만 금지 규칙은 아니다. 단독으로 쓸 만하면 나중에 넣어 본다.",
        "D20": "교체 제한 다음 1턴. 지금 게임의 속박 기술 8개는 모두 공격+속박",
        "F20": "없음",
        "G20": "확정",
    },
}


def sst_strings(xml):
    return [unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", si, re.S))) for si in re.findall(r"<si>(.*?)</si>", xml, re.S)]


def find_cell(xml, ref):
    pat = re.compile(rf'<c r="{ref}"(?P<attrs>[^>]*?)(?:/>|>(?P<body>.*?)</c>)', re.S)
    assert len(pat.findall(xml)) == 1, (ref, len(pat.findall(xml)))
    return pat.search(xml)


def old_text(m, sst):
    attrs, body = m.group("attrs"), m.group("body")
    if body is None:
        return ""
    if 't="inlineStr"' in attrs:
        return unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", body, re.S)))
    v = re.search(r"<v>(.*?)</v>", body, re.S)
    return (sst[int(v.group(1))] if 't="s"' in attrs else v.group(1)) if v else ""


def put(xml, ref, text, sst, log, name):
    m = find_cell(xml, ref)
    style = re.search(r' s="(\d+)"', m.group("attrs")).group(1)
    log.append((name, ref, old_text(m, sst), text))
    return xml[: m.start()] + f'<c r="{ref}" s="{style}" t="inlineStr"><is><t>{escape(text)}</t></is></c>' + xml[m.end():]


def set_height(xml, row, ht):
    pat = re.compile(rf'<row r="{row}"([^>]*?) ht="([\d.]+)"( customHeight="1")?')
    assert len(pat.findall(xml)) == 1, ("row", row)
    return pat.sub(lambda m: f'<row r="{row}"{m.group(1)} ht="{ht}" customHeight="1"', xml)


def main():
    zin = zipfile.ZipFile(SRC)
    parts = {i.filename: zin.read(i.filename) for i in zin.infolist()}
    sst = sst_strings(parts["xl/sharedStrings.xml"].decode("utf-8"))
    log = []
    for name in (S1, S2, S3):
        xml = parts[name].decode("utf-8")
        if name == S1:
            old = old_text(find_cell(xml, "J28"), sst)
            line1, line2 = old.split("\n")
            assert line2 == J28_OLD_LINE2, line2
            xml = put(xml, "J28", f"{line1}\n{J28_NEW_LINE2}", sst, log, name)
        for ref, text in EDITS.get(name, {}).items():
            xml = put(xml, ref, text, sst, log, name)
        for row, ht in HEIGHTS.get(name, {}).items():
            xml = set_height(xml, row, ht)
        parts[name] = xml.encode("utf-8")
    total = sum(p.decode("utf-8").count('t="s"') for n, p in parts.items() if n.startswith("xl/worksheets/sheet"))
    ss = parts["xl/sharedStrings.xml"].decode("utf-8")
    parts["xl/sharedStrings.xml"] = re.sub(r'count="\d+"', f'count="{total}"', ss, count=1).encode("utf-8")
    with zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            zout.writestr(info, parts[info.filename], compress_type=zipfile.ZIP_DEFLATED)
    if LOG:
        with open(LOG, "w", encoding="utf-8") as fh:
            for name, ref, old, new in log:
                fh.write(f"{name} {ref}\n  - {old!r}\n  + {new!r}\n")
    print("edits", len(log), "sst count", total)


main()
