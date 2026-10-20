"""v4 엑셀을 바탕으로 v5를 만든다: 지정한 칸만 바꾸고 나머지 패키지는 그대로 복사한다."""
import json
import re
import sys
import zipfile
from xml.sax.saxutils import escape, unescape

sys.stdout.reconfigure(encoding="utf-8")

SRC = r"C:\dev\pulloseum\outputs\01a151d0-9d92-7900-b5be-31a811469c9d\풀로세움_효과와스킬_분류_v4.xlsx"
DST = sys.argv[1]
HEIGHTS = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else {}
LOG = sys.argv[3] if len(sys.argv) > 3 else None

S1, S2, S3, S4 = (f"xl/worksheets/sheet{i}.xml" for i in (1, 2, 3, 4))

# 칸 주소는 v4 기준(스킬 분류는 행 끼워 넣기 전 주소)
EDITS = {
    S1: {  # 효과 분류
        "D5": "정화=자신 / 회수=타인. 이로운·해로운 대상을 지정. 한 종류 제거 시 모든 겹 제거. 교체 후 유지·턴 진행, 대기 중에도 피해·회복 발생",
        "D6": "교체 시 제거. 집중·은신은 행동 불가로 해제. 보호막은 빗나감·행동 불가에도 유지. 집중·보호막은 공격 기술 1회의 모든 타에 적용",
        "E22": "약한 피해를 주며, 지속 중 확률로 마비를 일으킨다. 마비는 기절과 같은 행동 취소다.",
        "J22": "마비 발동 시 소비하는 기존 안. 대기 중에도 피해. 면역과 겹치면 제거",
        "E23": "겹이 쌓여 얼음으로 이어진다. 얼음은 기절과 같은 행동 취소다.",
        "J23": "2턴 동안 재부여가 없으면 매 턴 1겹씩 감소. 불 공격에도 해제. 면역 중 가득 차면 기절 없이 초기화",
        "E25": "선공·후공과 무관하게 다음 턴의 기술 선택에서 무작위로 고른 기술을 1턴 동안 제한한다. 그 턴에 기절로 쉬어도 종료한다.",
        "J25": "막는 기술 개수는 밸런스 검토. 기본기 포함 여부 미결",
        "E26": "다음 턴 1턴 동안 교체 선택을 제한한다. 그 턴에 기절로 쉬어도 종료한다.",
        "E27": "다음 턴 1턴 동안 공격 스킬만 고를 수 있고 교체할 수 없다. 햇빛이 부족하면 0번 무료 기본공격을 쓸 수 있다. 그 턴에 기절로 쉬어도 종료한다.",
        "J27": "방어스킬+다른스킬에 관해서는 어떻게 할 지 논의\n대표 분류가 공격이면 복합 기술도 허용. 도발 강도는 밸런스 검토",
        "J29": "턴 수 기준 확정. 턴 단축·즉시 발동 가능. 교체 대기 중에도 턴 진행·발동. 초기값·재부여·단축 수단·발동 단계·발동 후 처리 미결",
        "E30": "상대에게 지속 피해를 주고 처음 기생을 건 식물이 회복한다. 건 식물이 죽으면 피해·회복이 모두 끝난다.",
        "J30": "교체 후 연결 유지 여부는 시뮬 검토로 보류. 원래는 횟수였는데 이게 기간이랑 다른게 뭔지 봐줘",
        "J31": "교체 대기 중에도 실제로 회복",
        "E33": "기절에 의한 행동 취소를 기간 동안 확정 차단한다.",
        "J33": "연속 행동 취소 방지용. 빙결 누적은 허용하되 가득 차면 기절 없이 초기화. 감전은 면역과 겹치면 제거. 소모·연장·감전 피해와의 선후·종료 경계 미결",
        "E34": "다음 공격 기술 1회의 모든 타에 치명 확률을 높이고 기술이 끝나면 소비한다.",
        "J34": "각 타의 치명은 따로 판정. 빙결·기절 등 한 턴 쉬면 해제",
        "E36": "상대 공격 기술 1회의 모든 타를 남은 보호량까지 흡수한다.",
        "J36": "그 기술이 끝나면 잔량도 제거. 보호량이 먼저 바닥나면 이후 타는 일반 피해. 모두 빗나가거나 행동 불가·상태이상 피해면 소모하지 않음",
        "J37": "개인 환경과 공존 허용·개수 제한 없음(시뮬 조정). 재사용 기준은 검토 대기",
        "E44": "가이아 자신에게 유지되어 방어를 높이는 모래 환경이다. 모래바람은 다른 식물도 쓸 수 있는 별도 환경이다.",
        "J44": "모래바람의 적용 대상·수치 미결. 기존 적 모래 피해·명중 방해도 이 범위에서 검토",
    },
    S2: {  # 스킬 분류
        "H8": "상태창 미표시. 턴 전체 유지 여부와 연타 대응 폭은 추가 검토",
        "H15": "능력치 버프·디버프와 다른 분류는 제거 불가. 한 종류를 제거하면 그 상태의 모든 겹 제거",
        "H16": "능력치 강화·약화/준비/환경/설치형/소환수는 대상 아님. 한 종류를 제거하면 모든 겹 제거",
        "B21": "착취",
        "C21": "착취",
        "D21": "상대의 버프·디버프 적용 전 능력치로 계산한 양만큼 상대를 약화하고 자신을 강화한다.",
        "E21": "별도 상태 없는 약화·강화 조합. 각 겹 5턴 독립 만료·중첩 가능",
        "H21": "기술별 비율은 밸런스 검토. 이미 걸린 버프·디버프로 계산 기준을 바꾸지 않음. 능력치 디버프를 정화로 지우는 안은 폐기",
        "H22": "1턴 소분류의 명칭은 미정. 속박 단독 기술은 두지 않으며 해당 기술 허용 여부는 논의. 부여 분포는 시뮬 조정(스택형은 여러 스킬로, 비스택형은 비중 축소, 불 스킬 화상 일괄 부가 지양)",
        "D24": "다음 공격 기술 1회의 모든 타에 적용할 집중을 준비한다.",
        "D26": "상대 공격 기술 1회의 모든 타를 보호량 한도에서 막는다.",
        "E26": "막은 기술이 끝나면 잔량 제거",
        "H26": "사용 전 유지. 교체 시 제거. 빗나감·행동 불가에는 유지",
        "H27": "취소 불가. 교체 시 종료·유지는 환경 종류별. 환경마다 자신·상대 효과를 따로 지정. 개인 환경과 공존·개수 제한 없음(시뮬 조정)",
    },
    S3: {  # 검토 대기
        "C6": "다음 해당 행동 한 번을 취소하는 대표 태그다. 마비·얼음은 이름·컨셉·연출만 다른 같은 기절이다.",
        "D6": "일반 기절 기술 / 페탈로즈 방패 타격 / 망치 무기 변이",
        "F6": "남은 검토: 망치 무기 변이의 확률·조건·수치·횟수. 매혹은 보류",
        "G6": "확정",
        "C7": "감전의 확률 판정이 발동하면 걸리는 기절이다. 이름·컨셉·연출만 다르다.",
        "E7": "기절로 통합",
        "F7": "원인인 감전의 발동 조건은 감전 규칙에서 다룬다",
        "G7": "통합",
        "C8": "빙결이 가득 차면 걸리는 기절이다. 이름·컨셉·연출만 다르며 받는 피해 감소는 따로 두지 않는다.",
        "E8": "기절로 통합",
        "F8": "원인인 빙결의 누적·발동 조건은 빙결 규칙에서 다룬다",
        "G8": "통합",
        "G9": "보류",
        "C10": "교체 대기 중에도 상태와 남은 시간을 유지하며 데미지 상태의 피해·체력 회복·포자 발동이 실제로 일어난다.",
        "D10": "대기 중 화상·독·감전·재생·포자",
        "F10": "남은 검토: 기생의 교체 후 연결(B11), 마비·기절의 대기 중 행동 취소·소모",
        "G10": "확정",
        "C11": "교체만으로 상태를 지우지 않는다. 기생은 처음 기생을 건 식물이 회복하며, 그 식물이 죽으면 피해·회복이 모두 끝난다.",
        "F11": "기생의 교체 후 연결 유지·거리 단절은 시뮬 검토로 보류. 갈증·지옥 불의 연결 대상 미결",
        "C12": "가이아 희생 외 성체는 자신에게 적용하는 환경으로 옮긴다. 환경마다 자신·상대 효과를 따로 둘 수 있다.",
        "F12": "모래바람은 다른 식물도 쓰는 환경, 모래성의 자기 방어는 개인 환경으로 구분. 모래바람의 적용 대상·수치와 다른 성체 세부 미결",
        "C13": "상태이상 한 종류를 제거하면 그 상태의 모든 겹을 없앤다. 능력치 버프·디버프는 제거 불가.",
        "F13": "남은 검토: 부여 스킬 수·한 번에 쌓는 겹·위력·비용·위험은 시뮬 조정",
        "G13": "확정",
        "C14": "기절의 행동 취소를 막고 원인 상태 자체는 막지 않는다. 빙결이 가득 차면 기절 없이 초기화하고, 감전은 면역과 겹치면 사라진다.",
        "F14": "남은 검토: 면역 소모·연장, 같은 턴 감전 피해와 제거의 선후, 종료 경계",
        "G14": "확정",
        "B15": "착취량·연동",
        "C15": "상대의 버프·디버프 적용 전 능력치로 계산한 양을 상대 약화량과 내 강화량으로 쓴다. 각 겹 5턴 독립 만료·제거 불가이며 상대 정화로 반환하는 전제는 폐기한다.",
        "E15": "약화·강화 조합",
        "F15": "남은 검토: 기술별 비율은 밸런스 검토",
        "G15": "확정",
        "C16": "전장 환경과 개인 환경의 공존을 허용하고 지금은 동시 유지 개수를 제한하지 않는다.",
        "F16": "남은 검토: 무제한 공존은 시뮬로 확인·조정. 경기·장소 자체 환경과의 충돌·우선순위 미결",
        "G16": "확정",
        "C17": "보호막은 상대 공격 기술 1회의 모든 타를 남은 보호량까지 흡수하고 기술이 끝나면 잔량을 없앤다. 집중은 다음 공격 기술 1회의 모든 타에 적용한다. 반사는 첫 적중 1타만 반사한다.",
        "F17": "남은 검토: 방어 자세의 턴 전체 유지·연타 위력 감소 폭",
        "G17": "확정",
        "C19": "봉인·속박·도발은 부여한 다음 턴에 1턴 적용하고 그 턴에 기절로 쉬어도 종료한다.",
        "F19": "암실·면역의 종료 경계",
        "C22": "도발 중에는 대표 분류가 공격인 기술만 고를 수 있고 교체할 수 없다. 햇빛이 부족하면 0번 무료 기본공격을 쓸 수 있다.",
        "F22": "남은 검토: 도발 강도(햇빛 비용·부여 빈도·조건)는 밸런스. 기본공격의 봉인 대상 포함 여부 미결",
        "G22": "확정",
        "C23": "포자는 상태이상이며 남은 턴으로 발동한다. 턴 단축·즉시 발동을 지원하며 교체 대기 중에도 턴이 진행되어 발동한다.",
        "F23": "초기값·재부여·단축 수단·턴 내 발동 단계·발동 후 처리",
        "F28": "기간3·교체 중 시간 진행 유지. 재생은 대기 중에도 회복. 기생의 연결이 끊긴 경우의 효력은 시뮬 검토로 보류",
    },
    S4: {  # 미분류·잔여
        "E10": "전투 기록으로 유지 여부 검토. 교체 후 2턴 금지는 시뮬 후 결정",
    },
}

# 스킬 분류 공격 스킬 묶음에 끼워 넣는 두 줄(행 7 다음). 서식은 행 7과 같게.
NEW_ROWS = [
    ["범위", "범위 공격",
     "확정 명중 없이 회피 자세·높은 기동성·은신 대상에게 단일 공격보다 잘 맞는다. 이 대상도 빗나갈 수 있다.",
     "범위 태그", "기술 연출", "불기둥·해일·지진",
     "대가는 햇빛 비용 증가 우선, 필요하면 위력 하향. 명중 보정·은신 대응률·추가 비용 미정. 공격 전 은신 해제 처리 재검토. 모션·폭탄 아이콘 개선은 나중 작업"],
    ["연타", "연타 공격",
     "같은 햇빛 비용이면 연타는 총위력을 낮추는 대신 한 타 방어·반사를 돌파하고, 단타는 더 높은 총피해를 준다.",
     "회피는 매 타 판정. 기본 방어·반사는 첫 적중 1타. 보호막·집중은 기술 1회 전체", "기술 연출", "수리검 난무·잎새 연사·가시 탄환",
     "위력 감소율·기술별 수치는 시뮬로 결정. 방어 자세의 턴 전체 유지·감소 폭은 추가 검토"],
]
ROW7_STYLES = {"A": "47", "B": "7", "C": "7", "D": "1", "E": "1", "F": "1", "G": "1", "H": "1"}
INSERT_AT, INSERT_N = 8, 2

DV_OLD = '<formula1>"보류,유지,통합,삭제,미결"</formula1>'
DV_NEW = '<formula1>"보류,유지,통합,삭제,미결,확정"</formula1>'


def sst_strings(xml):
    out = []
    for si in re.findall(r"<si>(.*?)</si>", xml, re.S):
        out.append(unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", si, re.S))))
    return out


def cell_pattern(ref):
    return re.compile(rf'<c r="{ref}"(?P<attrs>[^>]*?)(?:/>|>(?P<body>.*?)</c>)', re.S)


def old_text(attrs, body, sst):
    if body is None:
        return ""
    if 't="inlineStr"' in attrs:
        return unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", body, re.S)))
    m = re.search(r"<v>(.*?)</v>", body, re.S)
    if not m:
        return ""
    return sst[int(m.group(1))] if 't="s"' in attrs else m.group(1)


def inline_cell(ref, style, text):
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t>{escape(text)}</t></is></c>'


def set_cell(xml, ref, text, sst, log):
    pat = cell_pattern(ref)
    found = pat.findall(xml)
    assert len(found) == 1, (ref, len(found))
    m = pat.search(xml)
    style = re.search(r' s="(\d+)"', m.group("attrs")).group(1)
    log.append((ref, old_text(m.group("attrs"), m.group("body"), sst), text))
    return xml[: m.start()] + inline_cell(ref, style, text) + xml[m.end():]


def set_height(xml, row, ht):
    pat = re.compile(rf'<row r="{row}"([^>]*?) ht="([\d.]+)"')
    assert len(pat.findall(xml)) == 1, ("row", row)
    return pat.sub(lambda m: f'<row r="{row}"{m.group(1)} ht="{ht}"', xml)


def shift(n):
    n = int(n)
    return n + INSERT_N if n >= INSERT_AT else n


def insert_rows(xml):
    head, rest = xml.split("<sheetData>", 1)
    data, tail = rest.split("</sheetData>", 1)
    data = re.sub(r'(<row r=")(\d+)(")', lambda m: f"{m.group(1)}{shift(m.group(2))}{m.group(3)}", data)
    data = re.sub(r'(<c r="[A-Z]+)(\d+)(")', lambda m: f"{m.group(1)}{shift(m.group(2))}{m.group(3)}", data)
    new = []
    for i, vals in enumerate(NEW_ROWS):
        r = INSERT_AT + i
        cells = [f'<c r="A{r}" s="{ROW7_STYLES["A"]}"/>']
        for col, v in zip("BCDEFGH", vals):
            cells.append(inline_cell(f"{col}{r}", ROW7_STYLES[col], v))
        new.append(f'<row r="{r}" spans="1:8" ht="64" customHeight="1">' + "".join(cells) + "</row>")
    end7 = re.search(r'<row r="7"[^>]*>.*?</row>', data, re.S)
    data = data[: end7.end()] + "".join(new) + data[end7.end():]

    def shift_ref(m):
        c1, r1, c2, r2 = m.groups()
        if (c1, r1, c2, r2) == ("A", "6", "A", "7"):
            return 'ref="A6:A9"'
        return f'ref="{c1}{shift(r1)}:{c2}{shift(r2)}"'

    tail = re.sub(r'ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"', shift_ref, tail)
    head = head.replace('<dimension ref="A1:H32"/>', '<dimension ref="A1:H34"/>', 1)
    head = head.replace('topLeftCell="D20"', 'topLeftCell="D22"', 1)
    return head + "<sheetData>" + data + "</sheetData>" + tail


def main():
    zin = zipfile.ZipFile(SRC)
    parts = {i.filename: zin.read(i.filename) for i in zin.infolist()}
    sst = sst_strings(parts["xl/sharedStrings.xml"].decode("utf-8"))
    log = []
    for name, edits in EDITS.items():
        xml = parts[name].decode("utf-8")
        for ref, text in edits.items():
            before = len(log)
            xml = set_cell(xml, ref, text, sst, log)
            log[before] = (name, *log[before])
        if name == S3:
            assert xml.count(DV_OLD) == 1
            xml = xml.replace(DV_OLD, DV_NEW)
        if name == S2:
            assert '<dimension ref="A1:H32"/>' in xml and 'topLeftCell="D20"' in xml
            xml = insert_rows(xml)
        for row, ht in HEIGHTS.get(name, {}).items():
            xml = set_height(xml, row, ht)
        parts[name] = xml.encode("utf-8")
    # 공유 문자열 참조 수(count)를 실제 수에 맞춤
    total = sum(p.decode("utf-8").count('t="s"') for n, p in parts.items() if n.startswith("xl/worksheets/sheet"))
    ss = parts["xl/sharedStrings.xml"].decode("utf-8")
    ss = re.sub(r'count="\d+"', f'count="{total}"', ss, count=1)
    parts["xl/sharedStrings.xml"] = ss.encode("utf-8")
    with zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            zout.writestr(info, parts[info.filename], compress_type=zipfile.ZIP_DEFLATED)
    if LOG:
        with open(LOG, "w", encoding="utf-8") as fh:
            for name, ref, old, new in log:
                fh.write(f"{name} {ref}\n  - {old!r}\n  + {new!r}\n")
    print("edits", len(log), "sst count", total)


main()
