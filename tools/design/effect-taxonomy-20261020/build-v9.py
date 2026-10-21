"""v8 엑셀을 바탕으로 v9를 만든다: 2026-10-21 낮 결정 묶음(속박 재부여·1:1, 불 해제 없음, 포자, 그늘·구름 이름, 갈증, 지옥 불, 연결, 기생·재생 기간, 모래바람)만 칸을 고친다.
사용자 메모는 그대로 두고(첫 줄·원문), 나머지 패키지도 그대로 복사한다."""
import json
import re
import sys
import zipfile
from xml.sax.saxutils import escape, unescape

sys.stdout.reconfigure(encoding="utf-8")

SRC = r"C:\dev\pulloseum\outputs\01a151d0-9d92-7900-b5be-31a811469c9d\풀로세움_효과와스킬_분류_v8.xlsx"
DST = sys.argv[1]
HEIGHTS = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else {}
LOG = sys.argv[3] if len(sys.argv) > 3 else None

S1, S2, S3, S6 = (f"xl/worksheets/sheet{i}.xml" for i in (1, 2, 3, 6))

EDITS = {
    S1: {  # 효과 분류
        "J19": "물 공격에 해제하는 기존 규칙. 지옥 불이 붙으면 최대 2겹, 갈증이 붙으면 매 턴 남은 턴을 다시 채움",
        "J25": "N은 스킬마다 정함. 그늘은 이름·연출만 다른 같은 효과. 특수 포자가 필 때 부여될 수 있음(턴 수는 그 기술이 정함). 재부여 갱신·합산, 전장 구름·밤과 겹칠 때 처리 미결",
        "J27": "막는 기술 개수는 밸런스 검토. 기본기 포함 여부 미결. 불 공격으로 풀리지 않음",
        "E28": "다음 턴 1턴 동안 교체 선택을 제한한다. 그 턴에 기절로 쉬어도 종료하고 불 공격으로 풀리지 않는다. 같은 식물은 교체로 나갔다 들어오기 전까지 한 번만 걸리며, 1:1에서는 봉인(다음 1턴)으로 바뀌어 걸린다.",
        "E30": "몸에 붙어 지연 턴이 지나면 피해를 준다. 다시 걸면 새 포자가 따로 붙고 개수 상한은 없다. 암실·흡혈 등은 특수 포자 기술에만 붙는다.",
        "J30": "기술마다 지연 턴(지금 1겹 기술 = 2턴, 2겹 = 1턴). 턴 끝에 피고 핀 포자만 사라짐. 같은 턴 여럿이면 피해를 더함. 대기 중에도 진행·발동. 포자 번식 카드는 걸 때 지연 1턴 줄임. 피해량은 밸런스",
        "J39": "진영당 한 판 1회. 기존 환경 연계안 유지. 블레이즈블룸이 빠질 때 함께 끝낼지는 기술 구체화 때",
        "D40": "구름·밤(이름 미정)",
        "H40": "보류",
        "J40": "식물 하나에 거는 쪽은 그늘(암실). 직접 전환·기존 보유 햇빛까지 없애지는 않음. 적용 대상·기간·겹침은 기술 구체화 때(보류)",
        "J45": "모래성이 있는 동안 상대 쪽에만 모래바람이 붊(턴 끝 모래 피해·빗나감, 수치는 밸런스). 모래성이 사라지면 멈춤. 다른 식물의 모래바람은 그 기술 기간만큼",
    },
    S2: {  # 스킬 분류
        "D33": "화상이 있는 상대에게 지금 N턴 동안 매 턴 끝 화상의 남은 턴을 다시 채우고 암실을 다시 건다.",
        "E33": "지금 N턴(블레이즈블룸 2턴). 화상이 풀리면 같이 끝, 다시 쓰면 남은 턴 새로",
        "F33": "화상 아이콘에 갈증 꼬리표",
        "D34": "화상이 있는 상대의 화상을 2겹으로 만들어 지금 N턴 동안 턴 끝 화상 피해를 2번 준다. 화상이 없으면 처음 화상만 건다. 공격 스킬이다.",
        "E34": "최대 2겹. 지금 N턴(블레이즈블룸 2턴) 뒤 1겹, 다시 쓰면 남은 턴 새로",
        "F34": "화상 아이콘에 겹 수 표시",
    },
    S3: {  # 검토 대기
        "C11": "교체만으로 상태를 지우지 않는다. 기생은 처음 기생을 건 식물이 회복하며 그 식물이 죽으면 끝난다. 갈증·지옥 불은 화상을 따라가고, 블레이즈블룸이 있어야 하는 지옥 효과는 블레이즈블룸이 빠지면 사라진다.",
        "F11": "남은 검토: 기생의 교체 후 연결 유지·거리 단절(시뮬 보류), 지옥전개 환경을 블레이즈블룸 퇴장 때 끝낼지(기술 구체화 때)",
        "G11": "보류",
        "F12": "모래바람은 상대 쪽에만, 모래성이 있는 동안 유지. 남은 검토: 수치(밸런스), 다른 성체 세부(가이아룩 기술 구체화 때)",
        "G12": "확정",
        "C21": "같은 식물은 교체로 나갔다 들어오기 전까지 한 번만 속박된다. 1:1에서는 속박 대신 봉인(다음 1턴)으로 바꿔 건다.",
        "F21": "없음",
        "G21": "확정",
        "C23": "포자는 기술마다 지연 턴이 정해진 지연성 효과다. 다시 걸면 새 포자가 따로 붙고 개수 상한은 없으며, 턴 끝에 핀 포자만 사라진다.",
        "D23": "지금 1겹 기술 = 지연 2턴, 2겹 기술 = 지연 1턴",
        "F23": "남은 검토: 포자 하나의 피해·지연·비용 수치(밸런스)",
        "G23": "확정",
        "C24": "피면 기본은 피해만 준다. 암실·흡혈 등은 특수 포자 기술에만 붙고, 암실은 그 턴 끝 햇빛부터 막는다.",
        "E24": "조건부(포자)",
        "F24": "남은 검토: 피해량(밸런스), 특수 포자의 암실 턴 수(그 기술에서)",
        "G24": "확정",
        "C25": "식물 하나에 거는 쪽은 그늘(효과는 암실), 전장 전체는 구름 또는 밤(이름 미정) 환경으로 나눈다.",
        "F25": "전장 환경의 적용 대상·기간·겹침은 기술 구체화 때",
        "G25": "보류",
        "F26": "없음(지금 N턴 동안 화상+암실 매 턴 갱신, 화상이 풀리면 끝)",
        "G26": "확정",
        "F27": "없음(최대 2겹·지금 N턴·다시 쓰면 남은 턴 새로·아이콘에 겹 수)",
        "G27": "확정",
        "F28": "기간으로 통일(지금 3턴). 기생 연결이 끊긴 턴은 시뮬 때",
        "G28": "확정",
        "C29": "불 공격에 맞아도 봉인·속박은 풀리지 않는다. 불 속성 면역도 두지 않는다(다른 상태의 불 해제는 그대로).",
        "D29": "불 속성 면역도 두지 않음",
        "F29": "없음",
        "G29": "확정",
    },
    S6: {  # 공통 처리
        "G7": "포자는 정화·회수·불 공격으로 모두 제거, 설치형은 해체. 유지 기간과 구별. 포자는 하나씩 따로 붙어 각자 셈(상한 없음)",
    },
}
# 사용자 메모를 지키는 칸: (시트, 칸, 바꿀 방식)
KEEP_LINE1 = {  # 첫 줄(사용자 메모)은 그대로, 둘째 줄만 교체
    (S2, "H33"): ("별도 상태이상으로 두지 않는 방향. 화상 해제 시 자연 해제 메모와 기존 2턴의 관계는 미결.",
                  "별도 상태이상으로 두지 않는다. 화상이 풀리면 끝나고 교체 후에도 화상을 따라감. 기간 2턴·햇빛 2는 밸런스에서 다시 봄."),
    (S2, "H34"): ("구체적인 중첩 수·상한·독립 기간·기존 2턴 처리 미결.",
                  "최대 2겹·지금 N턴으로 확정. 화상이 풀리면 겹도 사라지고 교체 후에도 화상을 따라감. 수치는 밸런스."),
}
PREFIX = {  # 사용자 메모가 든 원문 앞에 한 문장만 붙임
    (S1, "J31"): ("교체 후 연결 유지 여부는 시뮬 검토로 보류. 원래는 횟수였는데 이게 기간이랑 다른게 뭔지 봐줘", "기간으로 통일(횟수 아님). "),
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
    for name in (S1, S2, S3, S6):
        xml = parts[name].decode("utf-8")
        for (sh, ref), (old2, new2) in KEEP_LINE1.items():
            if sh != name:
                continue
            line1, line2 = old_text(find_cell(xml, ref), sst).split("\n")
            assert line2 == old2, (ref, line2)
            xml = put(xml, ref, f"{line1}\n{new2}", sst, log, name)
        for (sh, ref), (old, pre) in PREFIX.items():
            if sh != name:
                continue
            assert old_text(find_cell(xml, ref), sst) == old, ref
            xml = put(xml, ref, pre + old, sst, log, name)
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
