"""v6 엑셀을 바탕으로 v7을 만든다: 효과 분류 비데미지 칸 끝(26행)에 기절 줄을 끼워 넣고 검토 대기 두 칸을 고친다.
나머지 패키지는 그대로 복사한다."""
import json
import re
import sys
import zipfile
from xml.sax.saxutils import escape, unescape

sys.stdout.reconfigure(encoding="utf-8")

SRC = r"C:\dev\pulloseum\outputs\01a151d0-9d92-7900-b5be-31a811469c9d\풀로세움_효과와스킬_분류_v6.xlsx"
DST = sys.argv[1]
HEIGHTS = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else {}
LOG = sys.argv[3] if len(sys.argv) > 3 else None

S1, S3 = "xl/worksheets/sheet1.xml", "xl/worksheets/sheet3.xml"
AT, N = 26, 1
NEW_ROW = {  # 효과 분류 26행 = 기절(행 25 암실과 같은 서식)
    "A": ("51", None), "B": ("51", None), "C": ("51", None),
    "D": ("3", "기절"),
    "E": ("1", "바로 다음 행동 한 번을 취소한다. 선공에게 맞으면 그 턴 행동이, 후공에게 맞으면 다음 턴 행동이 취소된다."),
    "F": ("24", "불가"),
    "G": ("24", "다음 행동 시 소모"),
    "H": ("25", "일회성"),
    "I": ("24", "미결"),
    "J": ("1", "마비(감전)·얼음(빙결)은 같은 효과의 다른 이름. 면역이 막음. 교체 대기 중 소모 여부 미결"),
}
EDITS = {
    S3: {
        "E6": "해로운 비데미지 상태(효과 분류 26행)",
        "F6": "남은 검토: 망치 무기 변이의 확률·조건·수치·횟수, 교체 대기 중 소모. 매혹은 보류",
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


def cell_xml(ref, style, text):
    return f'<c r="{ref}" s="{style}"/>' if not text else f'<c r="{ref}" s="{style}" t="inlineStr"><is><t>{escape(text)}</t></is></c>'


def put(xml, ref, text, sst, log):
    m = find_cell(xml, ref)
    style = re.search(r' s="(\d+)"', m.group("attrs")).group(1)
    log.append((ref, old_text(m, sst), text))
    return xml[: m.start()] + cell_xml(ref, style, text) + xml[m.end():]


def set_height(xml, row, ht):
    pat = re.compile(rf'<row r="{row}"([^>]*?) ht="([\d.]+)"( customHeight="1")?')
    assert len(pat.findall(xml)) == 1, ("row", row)
    return pat.sub(lambda m: f'<row r="{row}"{m.group(1)} ht="{ht}" customHeight="1"', xml)


def shift(n):
    n = int(n)
    return n + N if n >= AT else n


def insert_row(xml):
    head, rest = xml.split("<sheetData>", 1)
    data, tail = rest.split("</sheetData>", 1)
    data = re.sub(r'(<row r=")(\d+)(")', lambda m: f"{m.group(1)}{shift(m.group(2))}{m.group(3)}", data)
    data = re.sub(r'(<c r="[A-Z]+)(\d+)(")', lambda m: f"{m.group(1)}{shift(m.group(2))}{m.group(3)}", data)
    cells = "".join(cell_xml(f"{c}{AT}", s, t) for c, (s, t) in NEW_ROW.items())
    new = f'<row r="{AT}" spans="1:10" ht="42" customHeight="1">{cells}</row>'
    prev = re.search(rf'<row r="{AT - 1}"[^>]*>.*?</row>', data, re.S)
    data = data[: prev.end()] + new + data[prev.end():]

    def merge_ref(m):
        c1, r1, c2, r2 = m.group(1), int(m.group(2)), m.group(3), int(m.group(4))
        if (c1, r1, c2, r2) == ("C", 23, "C", 25):   # 비데미지 칸이 기절 줄까지 늘어남
            return 'ref="C23:C26"'
        return f'ref="{c1}{shift(r1)}:{c2}{shift(r2)}"'

    tail = re.sub(r'ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"', merge_ref, tail)
    assert '<dimension ref="A1:J49"/>' in head and 'topLeftCell="E39"' in head and 'sqref="D41"' in head
    head = head.replace('<dimension ref="A1:J49"/>', '<dimension ref="A1:J50"/>', 1)
    head = head.replace('topLeftCell="E39"', 'topLeftCell="E40"', 1)
    head = head.replace('activeCell="D41" sqref="D41"', 'activeCell="D42" sqref="D42"', 1)
    return head + "<sheetData>" + data + "</sheetData>" + tail


def main():
    zin = zipfile.ZipFile(SRC)
    parts = {i.filename: zin.read(i.filename) for i in zin.infolist()}
    sst = sst_strings(parts["xl/sharedStrings.xml"].decode("utf-8"))
    log = []
    for name in (S1, S3):
        xml = parts[name].decode("utf-8")
        if name == S1:
            xml = insert_row(xml)
            log += [(name, f"{c}{AT}", "", t or "") for c, (s, t) in NEW_ROW.items() if t]
        for ref, text in EDITS.get(name, {}).items():
            before = len(log)
            xml = put(xml, ref, text, sst, log)
            log[before] = (name, *log[before])
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
    print("writes", len(log), "sst count", total)


main()
