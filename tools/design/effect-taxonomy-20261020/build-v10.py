"""v9 엑셀을 바탕으로 v10을 만든다: 2026-10-21 오후 결정 묶음만 칸을 고친다.
(봉인 기본기·다 막히면 쉼·쉰 다음 턴 면역, 기간형 재부여 긴 쪽, 같은 환경 재사용 불가, 준비 효과 N회·불타는 의지,
철벽 → 억셈, 미분류 넷 유지, 자세는 그 턴 모든 타·연타 안정형, 회복 방해는 출혈만, 강제 교체 처리 보류,
면역 중 감전 판정, 장소 환경 우선순위 보류, 의지 대상)
사용자 메모가 든 칸은 건드리지 않고, 나머지 패키지도 그대로 복사한다."""
import json
import re
import sys
import zipfile
from xml.sax.saxutils import escape, unescape

sys.stdout.reconfigure(encoding="utf-8")

SRC = r"C:\dev\pulloseum\outputs\01a151d0-9d92-7900-b5be-31a811469c9d\풀로세움_효과와스킬_분류_v9.xlsx"
DST = sys.argv[1]
HEIGHTS = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 and sys.argv[2] != "-" else {}
LOG = sys.argv[3] if len(sys.argv) > 3 else None

S1, S2, S3, S4 = (f"xl/worksheets/sheet{i}.xml" for i in (1, 2, 3, 4))

EDITS = {
    S1: {  # 효과 분류
        "D5": "정화=자신 / 회수=타인. 이로운·해로운 대상을 지정. 한 종류 제거 시 모든 겹 제거. 교체 후 유지·턴 진행, 대기 중에도 피해·회복 발생. 기간형을 다시 걸면 남은 턴과 새 기간 중 긴 쪽",
        "D6": "교체 시 제거. 조준·은신은 행동 불가로 해제. 보호막은 빗나감·행동 불가에도 유지. 조준·보호막은 공격 기술 1회의 모든 타에 적용. 일회성이 기본이고 불타는 의지는 N회(쓸 때마다 1회 줄고 기절로 쉰 턴엔 남음, 다시 쓰면 큰 쪽)",
        "D7": "지금 N턴=걸린 턴부터 셈 · 다음 N턴=다음 턴부터 셈(제한) · 일회성=한 번 쓰이거나 발동하면 끝 · N회=N번 쓰이면 끝 · 지연 N턴=다음 턴부터 세어 N턴째 끝에 발동 · 재사용 대기 N턴=쓴 다음 턴부터 N턴 금지",
        "J10": "사용자 지정명. 철벽은 기술·연출 이름으로만 쓰고 효과는 억셈",
        "E19": "기간 동안 지속 피해를 입는다. 회복은 막지 않는다(회복 방해는 출혈).",
        "J21": "화상보다 약한 지속 피해 + 받는 회복 절반. 피해량은 밸런스",
        "J22": "마비가 터지면 사라짐(면역·의지가 막아도 사라짐). 대기 중에도 피해. 면역 중에도 남아 피해·판정",
        "J25": "N은 스킬마다 정함. 그늘은 이름·연출만 다른 같은 효과. 특수 포자가 필 때 부여될 수 있음(턴 수는 그 기술이 정함). 다시 걸면 긴 쪽. 전장 구름·밤과 겹칠 때 처리 미결",
        "I26": "강제 교체 기술 때",
        "J26": "마비(감전)·얼음(빙결)은 같은 효과의 다른 이름. 면역이 막고 의지는 확률로 막음. 쉬는 차례엔 일반 교체 불가, 강제 교체 때 처리는 그 기술을 정할 때",
        "J27": "막는 기술 개수는 밸런스 검토. 기본기도 무작위로 막고, 쓸 수 있는 행동이 하나도 없으면 그 턴은 쉼(쉰 다음 턴 면역). 불 공격으로 풀리지 않음",
        "E29": "다음 턴 1턴 동안 공격 스킬만 고를 수 있고 교체할 수 없다. 햇빛이 부족하면 0번 무료 기본공격을 쓸 수 있고, 그것도 봉인되면 쉰다. 그 턴에 기절로 쉬어도 종료한다.",
        "E33": "기절(마비·얼음)·봉인·속박·도발에 저항할 확률을 높인다.",
        "J33": "확률은 밸런스. 다시 걸면 긴 쪽. 막으면 빙결·감전은 면역처럼(빙결은 기절 없이 초기화, 감전은 사라짐)",
        "E34": "기절로 쉬었거나 쓸 행동이 다 막혀 쉰 뒤 다음 행동 한 번을 기절 없이 하게 하고, 그 행동을 마치면 끝난다.",
        "J34": "연속 기절 방지용. 그 행동 전에 오는 기절은 막고 막아도 유지. 빙결 누적은 허용하되 가득 차면 기절 없이 초기화. 감전은 남아 피해·판정하고 마비가 터지면 막은 뒤 사라짐. 강제 교체 때 처리는 그 기술 때",
        "J38": "개인 환경과 공존 허용·개수 제한 없음(시뮬 조정). 같은 편이 켠 같은 환경이 남아 있으면 다시 켜지지 않음(환경만 켜는 기술은 못 고름). 상대 편의 같은 환경은 미결",
    },
    S2: {  # 스킬 분류
        "D9": "타마다 따로 판정해 회피·은신 상대에게도 몇 타는 맞히는 안정형이다(리스크 낮추기). 단타는 맞으면 크고 피하면 0인 한 방이라 확실할 때 쓴다.",
        "E9": "회피·방어 자세는 그 턴 모든 타. 반사는 첫 적중 1타. 보호막·조준은 기술 1회 전체. 불운 보정 없음",
        "H9": "총위력 감소 폭·기술별 수치는 시뮬로 결정(방어 돌파가 없어진 만큼 덜 깎는 쪽 검토). 연타·단타·범위 어느 하나도 꺼려지지 않게 밸런스",
        "D10": "선공·후공과 무관하게 그 턴의 상대 공격 모든 타에 방어 효과를 적용한다.",
        "E10": "지금 1턴·그 턴 모든 타",
        "H10": "상태창 미표시. 연달아 쓰면 효과 절반. 관통·기습·도발로 견제",
        "D11": "선공·후공과 무관하게 그 턴의 상대 공격 모든 타에 회피 효과를 적용한다(타마다 판정).",
        "H29": "취소 불가. 교체 시 종료·유지는 환경 종류별. 환경마다 자신·상대 효과를 따로 지정. 개인 환경과 공존·개수 제한 없음(시뮬 조정). 같은 편의 같은 환경은 켜져 있는 동안 다시 안 켜짐. 장소 자체 환경과의 우선순위는 그 기능을 만들 때",
    },
    S3: {  # 검토 대기
        "F6": "남은 검토: 망치 무기 변이의 확률·조건·수치·횟수. 교체 대기 중 소모는 강제 교체 기술 때. 매혹은 보류",
        "F10": "남은 검토: 기생의 교체 후 연결(B11). 기절의 대기 중 소모는 강제 교체 기술 때",
        "C14": "기절을 막고 원인 상태 자체는 막지 않는다. 빙결이 가득 차면 기절 없이 초기화하고, 감전은 남아 판정하다 마비가 터지면 막은 뒤 사라진다.",
        "D14": "기절로 쉬었거나 다 막혀 쉰 뒤 다음 행동 한 번의 면역(지금 1턴)",
        "F14": "남은 검토: 강제 교체 때 처리(그 기술 때)",
        "F16": "남은 검토: 무제한 공존은 시뮬로 확인·조정. 같은 편의 같은 환경은 켜져 있는 동안 다시 안 켜짐. 장소 자체 환경과의 우선순위는 그 기능을 만들 때",
        "F17": "방어·회피 자세는 그 턴 모든 타. 남은 검토: 연타 위력 감소 폭(시뮬)",
        "F22": "남은 검토: 도발 강도(햇빛 비용·부여 빈도·조건)는 밸런스. 기본공격도 봉인될 수 있고 쓸 행동이 다 막히면 쉼(쉰 다음 턴 면역)",
    },
    S4: {  # 미분류·잔여 (내 결정 칸 목록: 보류·유지·통합·삭제)
        "E6": "준비 효과 N회로 편입(불타는 의지 = 다음 검방술 N회, N은 밸런스)",
        "F6": "통합",
        "E7": "억셈으로 통합. 철벽은 기술·연출 이름으로만",
        "F7": "통합",
        "E10": "전투 기록으로 유지(정화 불가). 교체 후 재사용 대기 2턴은 시뮬 후 결정",
        "F10": "유지",
        "E11": "공통 판정으로 유지",
        "F11": "유지",
        "E12": "패시브로 유지. 실제로 거는 효과는 그 효과 규칙",
        "F12": "유지",
        "E13": "육성·장착 수치로 유지",
        "F13": "유지",
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
    for name in (S1, S2, S3, S4):
        xml = parts[name].decode("utf-8")
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
