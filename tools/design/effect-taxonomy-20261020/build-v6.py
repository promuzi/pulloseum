"""v5 엑셀을 바탕으로 v6를 만든다: 지정한 칸만 바꾸고 나머지 패키지는 그대로 복사한다.
효과 분류 25~28행은 내용만 옮기고(암실 → 비데미지 끝, 봉인·속박·도발 → 제한) 칸 서식·사용자 구분선은 자리에 둔다."""
import json
import re
import sys
import zipfile
from xml.sax.saxutils import escape, unescape

sys.stdout.reconfigure(encoding="utf-8")

SRC = r"C:\dev\pulloseum\outputs\01a151d0-9d92-7900-b5be-31a811469c9d\풀로세움_효과와스킬_분류_v5.xlsx"
DST = sys.argv[1]
HEIGHTS = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else {}
LOG = sys.argv[3] if len(sys.argv) > 3 else None

S1, S2, S3, S4, S6 = (f"xl/worksheets/sheet{i}.xml" for i in (1, 2, 3, 4, 6))

# 효과 분류 25~28행 내용 옮기기: 새 행 ← 옛 행
ROW_MOVES = {25: 28, 26: 25, 27: 26, 28: 27}
MOVE_COLS = "DEFGHIJ"
MOVED_HEIGHTS = {"25": 42, "26": 52, "27": 92, "28": 68}

LEGEND = "지금 N턴=걸린 턴부터 셈 · 다음 N턴=다음 턴부터 셈(제한) · 일회성=한 번 쓰이거나 발동하면 끝 · 지연 N턴=다음 턴부터 세어 N턴째 끝에 발동 · 재사용 대기 N턴=쓴 다음 턴부터 N턴 금지"

EDITS = {
    S1: {  # 효과 분류(옮긴 뒤 주소)
        "A7": "기간 표기",
        "D7": LEGEND,
        "D4": "각 중첩 지금 5턴·독립 만료·교체 중 진행. 제거 불가, 반대 능력치 효과로 보완",
        "D6": "교체 시 제거. 조준·은신은 행동 불가로 해제. 보호막은 빗나감·행동 불가에도 유지. 조준·보호막은 공격 기술 1회의 모든 타에 적용. 모두 일회성",
        **{f"H{r}": "지금 5턴" for r in range(9, 19)},
        "H19": "지금 3턴", "H21": "지금 3턴", "H22": "지금 3턴", "H24": "지금 3턴",
        "J20": "최대 5겹. 마지막으로 걸린 다음 턴부터 2턴 동안 다시 안 걸리면 그 2턴째 끝부터 매 턴 1겹씩 감소",
        "E22": "약한 피해를 주며, 지속 중 확률로 마비(기절의 다른 이름)를 일으킨다.",
        "E23": "겹이 쌓여 얼음(기절의 다른 이름)으로 이어진다.",
        "J23": "마지막으로 걸린 다음 턴부터 2턴 동안 다시 안 걸리면 그 2턴째 끝부터 매 턴 1겹씩 감소. 불 공격에도 해제. 면역 중 가득 차면 기절 없이 초기화",
        "C25": None,
        "E25": "걸린 턴 끝부터 자연 햇빛 충전을 N턴 동안 막는다. 기절로 쉬어도 막고, 광합성·직접 전환은 막지 않는다.",
        "H25": "지금 N턴",
        "J25": "N은 스킬마다 정함. 구름은 이름·연출만 다른 같은 효과. 포자 발동 시 피해와 함께 부여(턴 수 미결). 재부여 갱신·합산, 그늘 환경과 겹칠 때 처리 미결",
        "C26": "제한",
        "H26": "다음 1턴", "H27": "다음 1턴", "H28": "다음 1턴",
        "H29": "지연 N턴",
        "H30": "지금 3턴", "H31": "지금 3턴", "H32": "지금 3턴",
        "C33": None,
        "E33": "기절로 쉰 뒤 다음 행동 한 번을 기절 없이 하게 하고, 그 행동을 마치면 끝난다.",
        "H33": "지금 1턴",
        "J33": "연속 기절 방지용. 그 행동 전에 오는 기절은 막고 막아도 유지. 빙결 누적은 허용하되 가득 차면 기절 없이 초기화. 감전은 면역과 겹치면 제거. 같은 턴 감전 피해와 제거의 선후·교체 중 처리 미결",
        "D34": "조준",
        "H34": "일회성", "H35": "일회성", "H36": "일회성",
        "H37": "지금 2턴", "H38": "지금 3턴", "H39": "지금 1턴",
        "J39": "식물 하나에 거는 쪽은 구름(암실). 직접 전환·기존 보유 햇빛까지 없애지는 않음. 적용 진영·지속, 구름·암실과 겹칠 때 미결",
        "H40": "지금 3턴", "H41": "지금 3턴", "H42": "지금 3턴",
    },
    S2: {  # 스킬 분류(v5 주소)
        "E9": "회피는 매 타 판정. 기본 방어·반사는 첫 적중 1타. 보호막·조준은 기술 1회 전체",
        "E10": "지금 1턴·유효 타수",
        "E11": "지금 1턴",
        "E12": "지금 1턴. 첫 적중 1타 후 종료",
        "E13": "지금 1턴. 조건 미발생 시 턴 종료",
        "E21": "각 겹 지금 5턴. 교체 중에도 시간 진행",
        "E22": "각 겹 지금 5턴. 교체 중에도 시간 진행",
        "E23": "별도 상태 없는 약화·강화 조합. 각 겹 지금 5턴 독립 만료·중첩 가능",
        "H24": "제한(봉인·속박·도발)은 다음 1턴. 속박 단독 기술은 두지 않으며 해당 기술 허용 여부는 논의. 부여 분포는 시뮬 조정(스택형은 여러 스킬로, 비스택형은 비중 축소, 불 스킬 화상 일괄 부가 지양)",
        "H25": "면역·의지는 비체력 상태이상. 면역은 지금 1턴",
        "C26": "조준 부여",
        "D26": "다음 공격 기술 1회의 모든 타에 적용할 조준을 준비한다.",
        "G26": "조준",
    },
    S3: {  # 검토 대기
        "A6": "기절",
        "C6": "바로 다음 행동 한 번을 취소하는 일회성 효과다. 마비·얼음은 이름·컨셉·연출만 다른 같은 기절이다.",
        "F6": "남은 검토: 효과 분류 시트 위치, 망치 무기 변이의 확률·조건·수치·횟수. 매혹은 보류",
        "C14": "기절을 막고 원인 상태 자체는 막지 않는다. 빙결이 가득 차면 기절 없이 초기화하고, 감전은 면역과 겹치면 사라진다.",
        "E14": "비체력 상태이상",
        "F14": "남은 검토: 같은 턴 감전 피해와 제거의 선후, 교체 중 처리",
        "B17": "조준과 보호막의 연타",
        "C17": "보호막은 상대 공격 기술 1회의 모든 타를 남은 보호량까지 흡수하고 기술이 끝나면 잔량을 없앤다. 조준은 다음 공격 기술 1회의 모든 타에 적용한다. 반사는 첫 적중 1타만 반사한다.",
        "D17": "연타 공격과 조준·보호막",
        "C18": "봉인·속박·도발은 제한(다음 1턴)으로 묶고, 암실은 비데미지, 면역은 비체력으로 옮긴다.",
        "E18": "제한",
        "F18": "없음",
        "G18": "확정",
        "C19": "봉인·속박·도발은 다음 1턴이며 기절로 쉬어도 종료한다. 암실은 지금 N턴, 면역은 지금 1턴(다음 행동 한 번 뒤 종료)이다.",
        "F19": "없음(기간 표기는 효과 분류 7행)",
        "G19": "확정",
        "E20": "제한", "E21": "제한", "E22": "제한",
        "C23": "포자는 지연 N턴 상태이상이다(걸린 다음 턴부터 세어 N턴째 끝에 발동). 턴 단축·즉시 발동을 지원하며 교체 대기 중에도 턴이 진행되어 발동한다.",
        "C24": "발동하면 피해와 암실을 함께 부여한다. 암실은 그 턴 끝 햇빛부터 막는다(지금 N턴).",
        "E24": "조건부→비데미지(암실)",
        "F24": "피해량·피해 시점·암실 턴 수",
        "C25": "전장 전체는 그늘 환경, 식물 하나에 거는 쪽은 구름(효과는 암실)으로 나눈다.",
        "E25": "환경·비데미지",
        "F25": "그늘의 적용 진영·지속 기준, 구름·암실과 겹칠 때 처리",
        "E29": "제한",
    },
    S4: {  # 미분류·잔여
        "E10": "전투 기록으로 유지 여부 검토. 교체 후 재사용 대기 2턴은 시뮬 후 결정",
    },
    S6: {  # 공통 처리
        "D7": "지연 N턴: 걸린 다음 턴부터 세어 N턴째 끝(남은 턴 0)에 발동. 다른 요소로 턴 단축·즉시 발동 가능.",
    },
}
STYLE_SET = {S1: {"B7": "53", "C7": "53", "A7": "53", **{f"{c}7": "54" for c in "DEFGHIJ"}}}
MERGE_SWAP = {S1: [('<mergeCell ref="C23:C24"/>', '<mergeCell ref="C23:C25"/>'),
                   ('<mergeCell ref="C25:C28"/>', '<mergeCell ref="C26:C28"/>')]}
MERGE_ADD = {S1: ["C32:C33", "A7:C7", "D7:J7"]}


def sst_strings(xml):
    return [unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", si, re.S))) for si in re.findall(r"<si>(.*?)</si>", xml, re.S)]


def cell_pattern(ref):
    return re.compile(rf'<c r="{ref}"(?P<attrs>[^>]*?)(?:/>|>(?P<body>.*?)</c>)', re.S)


def find_cell(xml, ref):
    pat = cell_pattern(ref)
    assert len(pat.findall(xml)) == 1, (ref, len(pat.findall(xml)))
    return pat.search(xml)


def old_text(m, sst):
    attrs, body = m.group("attrs"), m.group("body")
    if body is None:
        return ""
    if 't="inlineStr"' in attrs:
        return unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", body, re.S)))
    v = re.search(r"<v>(.*?)</v>", body, re.S)
    if not v:
        return ""
    return sst[int(v.group(1))] if 't="s"' in attrs else v.group(1)


def style_of(m):
    return re.search(r' s="(\d+)"', m.group("attrs")).group(1)


def put(xml, ref, text, sst, log, style=None):
    m = find_cell(xml, ref)
    s = style or style_of(m)
    log.append((ref, old_text(m, sst), text))
    new = f'<c r="{ref}" s="{s}"/>' if not text else f'<c r="{ref}" s="{s}" t="inlineStr"><is><t>{escape(text)}</t></is></c>'
    return xml[: m.start()] + new + xml[m.end():]


def restyle(xml, ref, sid):
    m = find_cell(xml, ref)
    head = re.sub(r' s="\d+"', f' s="{sid}"', xml[m.start(): m.start() + len(f'<c r="{ref}"') + len(m.group("attrs"))], count=1)
    return xml[: m.start()] + head + xml[m.start() + len(f'<c r="{ref}"') + len(m.group("attrs")):]


def set_height(xml, row, ht):
    pat = re.compile(rf'<row r="{row}"([^>]*?) ht="([\d.]+)"( customHeight="1")?')
    assert len(pat.findall(xml)) == 1, ("row", row)
    return pat.sub(lambda m: f'<row r="{row}"{m.group(1)} ht="{ht}" customHeight="1"', xml)


def main():
    zin = zipfile.ZipFile(SRC)
    parts = {i.filename: zin.read(i.filename) for i in zin.infolist()}
    sst = sst_strings(parts["xl/sharedStrings.xml"].decode("utf-8"))
    log = []
    for name in (S1, S2, S3, S4, S6):
        xml = parts[name].decode("utf-8")
        if name == S1:
            moved = {(new, c): old_text(find_cell(xml, f"{c}{old}"), sst) for new, old in ROW_MOVES.items() for c in MOVE_COLS}
            for (new, c), text in moved.items():
                xml = put(xml, f"{c}{new}", text, sst, log)
            for row, ht in MOVED_HEIGHTS.items():
                xml = set_height(xml, row, ht)
            for ref, sid in STYLE_SET[S1].items():
                xml = restyle(xml, ref, sid)
            xml = xml.replace('<row r="7" spans="1:10" ht="17">', '<row r="7" spans="1:10" ht="23.15" customHeight="1">', 1)
        for ref, text in EDITS.get(name, {}).items():
            xml = put(xml, ref, text, sst, log)
        for a, b in MERGE_SWAP.get(name, []):
            assert xml.count(a) == 1, a
            xml = xml.replace(a, b)
        for ref in MERGE_ADD.get(name, []):
            xml = xml.replace("</mergeCells>", f'<mergeCell ref="{ref}"/></mergeCells>', 1)
        if MERGE_ADD.get(name):
            n = len(re.findall(r"<mergeCell ", xml))
            xml = re.sub(r'<mergeCells count="\d+">', f'<mergeCells count="{n}">', xml, count=1)
        for row, ht in HEIGHTS.get(name, {}).items():
            xml = set_height(xml, row, ht)
        parts[name] = xml.encode("utf-8")
        log = [(name, *e) if len(e) == 3 else e for e in log]
    total = sum(p.decode("utf-8").count('t="s"') for n, p in parts.items() if n.startswith("xl/worksheets/sheet"))
    ss = parts["xl/sharedStrings.xml"].decode("utf-8")
    parts["xl/sharedStrings.xml"] = re.sub(r'count="\d+"', f'count="{total}"', ss, count=1).encode("utf-8")
    with zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            zout.writestr(info, parts[info.filename], compress_type=zipfile.ZIP_DEFLATED)
    if LOG:
        with open(LOG, "w", encoding="utf-8") as fh:
            for name, ref, old, new in log:
                if old != (new or ""):
                    fh.write(f"{name} {ref}\n  - {old!r}\n  + {new!r}\n")
    print("writes", len(log), "changed", sum(1 for e in log if e[2] != (e[3] or "")), "sst count", total)


main()
