"""Build a bounded edit plan from the user's saved v2; do not author XLSX."""
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
WORK = ROOT / 'outputs/01a151d0-9d92-7900-b5be-31a811469c9d/_previews'
spec = importlib.util.spec_from_file_location('source_reader', HERE / 'inspect-source.py')
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
source = reader.read_book(WORK / 'v3-source.xlsx')
baseline_path = WORK / 'v2-repository-baseline.xlsx'
if not baseline_path.exists():
    baseline_path = WORK.parent / '풀로세움_효과와스킬_분류_v2.xlsx'
baseline = reader.read_book(baseline_path)
changes = []
for name, sheet in source.items():
    old = baseline[name]['values']
    for address in sorted(old.keys() | sheet['values'].keys()):
        before, after = old.get(address, {}).get('v', ''), sheet['values'].get(address, {}).get('v', '')
        if before != after:
            changes.append(dict(sheet=name, cell=address, before=before, after=after))
(HERE / 'user-v2-changes.json').write_text(json.dumps(changes, ensure_ascii=False, indent=2), encoding='utf-8')


def value(name, address):
    v = source[name]['values'].get(address, {}).get('v', '')
    return int(v) if address.startswith('H') and v.isdecimal() else v


def row(name, index, columns):
    return [value(name, f'{chr(65+c)}{index}') for c in range(columns)]


def data_merges(name):
    return [m for m in source[name]['merges'] if int(''.join(c for c in m.split(':')[0] if c.isdigit())) >= 9]


effect_sources = list(range(9, 19)) + [19,20,21,22,23,25,24,26,27,30,31,32,35,37,36,38,39,40,41,42,29,43,44,45,46,47,48,49,50,51,52]
effect_rows = [row('효과 분류', r, 10) for r in effect_sources]
mapping = {old: 9+i for i, old in enumerate(effect_sources)}
for i, cells in enumerate(effect_rows):
    if i >= 10:
        cells[:3] = ['', '', '']


def effect(old, **values):
    cells = effect_rows[mapping[old]-9]
    for column, v in values.items():
        cells[ord(column)-65] = v


effect(19, A='상태이상', B='해로운 상태이상', C='데미지')
effect(23, C='비데미지')
effect(24, C='명칭 미정(1턴)', E='사용 가능한 기술 중 하나를 무작위로 골라 1턴 동안 사용을 제한한다.', H=1)
effect(26, H=1, J=value('효과 분류','J26')+'\n속박만 있는 스킬은 두지 않고 항상 부가 상태이상으로 연결한다. 해당 스킬 허용 여부는 미결.')
effect(30, E='1턴 동안 자연 햇빛 획득을 막는다.', G='기간', H=1, J='포자 발동 시 피해와 함께 부여. 그늘 환경과의 관계·1턴 계산 시점은 미결')
effect(31, C='조건부', E='스택이 쌓이다가 발동 시 피해와 암실을 부여한다.', G='발동까지', H='미결', J='3턴 경과와 3겹 도달 중 발동 기준은 미결. 기존 안은 다음 턴부터 턴 끝마다 1겹 증가, 3겹에서 발동·소모. 불 공격 제거 여부·발동 후 처리도 후속 검토')
effect(35, B='이로운 상태이상', C='체력')
effect(37, C='비체력', E='기절·봉인·교체 방해에 저항할 확률을 높인다.')
effect(36, C='명칭 미정(1턴)', H=1)
effect(38, A='준비 효과', B='공격 준비', C='치명 준비')
effect(39, B='회피 준비', C='연결 공격')
effect(40, B='보호 준비', C='1회 흡수')
effect(41, A='환경', B='전장 환경', C='바람')
effect(42, C='화염')
effect(29, C='햇빛', E='환경이 유지되는 동안 자연 햇빛 획득을 막는다.', F='불가', I='전장 유지', J='직접 전환·기존 보유 햇빛까지 없애지는 않음. 암실과의 적용 대상·중복 여부는 미결')
effect(43, C='기존 초안')
effect(46, B='개인 환경', C='방어')
for old, kind in [(47,'모래'),(48,'회복'),(49,'화염'),(50,'공격·기동')]:
    effect(old, C=kind)
effect(51, A='함정', B='설치형', C='조건 발동')
effect(52, A='소환수', B='희생형', C='대신 맞기')
effect_merges = ['A9:A13','B9:B13','A14:A18','B14:B18','A19:A33','B19:B30','C19:C22','C23:C24','C25:C28','C29:C30','B31:B33','A34:A36','A37:A47','B37:B42','C40:C42','B43:B47']

skill_edits = {
    'D14':'정해진 수의 해로운 상태이상을 제거한다. 능력치 디버프는 정화로 제거하지 않는다.',
    'H14':'여러 겹의 해로운 상태를 제거할 때의 처리 범위는 미결',
    'H17':'흡수량·비율 미정. 능력치 디버프를 정화로 지우는 안은 폐기',
    'H18':'1턴 소분류의 명칭은 미정. 속박 단독 기술은 두지 않으며 해당 기술 허용 여부는 논의',
    'H19':'면역은 1턴 소분류, 의지는 비체력 상태이상',
    'G23':'강풍·지옥·그늘',
}
skill_extra = [
    ['공격 부가 처리','화상·암실 연계','갈증',value('효과 분류','E33'),'세부 지속·갱신 미결','부가 효과 연출','기존 타들어가는 갈망',value('효과 분류','J33')+'\n별도 상태이상으로 두지 않는 방향. 화상 해제 시 자연 해제 메모와 기존 2턴의 관계는 미결.'],
    ['', '화상 중첩 연계','지옥 불',value('효과 분류','E34'),'중첩·지속 미결','화상 중첩 표시 검토','기존 지옥의 불씨',value('효과 분류','J34')+'\n구체적인 중첩 수·상한·독립 기간·기존 2턴 처리 미결.'],
]
review_edits = {
    'E21':'이로운 1턴 소분류(명칭 미정)',
    'G20':'능력치 버프·디버프의 정화 여부와 분리한다. 능력치 디버프는 정화 불가이며 상태이상 중첩 제거 범위만 미결.',
    'G22':'능력치 디버프는 정화 불가. 상대 정화 시 반환하는 기존 전제는 적용하지 않으며 다른 해제 연동은 미결.',
}
review_extra = [
    ['추가 논의','1턴 소분류 이름','해로운 상태는 봉인·속박·도발·암실, 이로운 상태는 면역이다.','봉인·속박·도발·암실 / 면역','명칭 미정(1턴)','해로운 쪽과 이로운 쪽의 소분류 이름','미결'],
    ['', '1턴의 시작과 종료','1턴만 부여한다는 기간은 확정, 부여 시점에 따른 종료 기준은 미정이다.','선공·후공 사용, 턴 끝의 포자 발동','상태이상 공통 규칙','이번 턴 종료인지 다음 해당 행동까지인지','미결'],
    ['', '속박 스킬 허용','속박만 있는 스킬은 두지 않고 항상 부가 상태이상으로 연결한다.','교체 제한 1턴','해로운 1턴 상태','해당 기술을 허용할지, 어떤 부가 상태와 연결할지','미결'],
    ['', '속박 재부여·1:1','한 식물에게 여러 번 사용 금지, 교체 시 초기화.','속박. 1:1에서 봉인처럼 취급할지 논의','해로운 1턴 상태','재사용 금지 범위·초기화 기준·1:1 처리','미결'],
    ['', '도발과 복합 스킬','방어스킬을 전부 제한한다는 사용자 편집을 유지한다.','방어+공격·방어+다른 효과 스킬','해로운 1턴 상태','방어 외 효과가 섞인 스킬도 전부 차단할지','미결'],
    ['', '포자 발동 기준','스택이 쌓이고 발동 시 피해+암실. 3턴·3겹 기준은 추후 판단한다.','기존: 다음 턴부터 1겹씩 증가, 3겹에서 발동·소모','조건부 상태','3턴 경과와 3겹 도달 중 기준, 재부여·교체·발동 후 처리','미결'],
    ['', '포자 피해·암실 시점','발동하면 피해와 1턴 암실을 함께 부여한다.','턴 끝 발동 후 자연 햇빛 처리','조건부→해로운 1턴 상태','피해량·피해 시점·암실의 적용 턴','미결'],
    ['', '그늘·암실 관계','그늘은 환경으로 이동하고 암실은 개체의 1턴 상태로 둔다.','자연 햇빛 획득 방해','환경·해로운 1턴 상태','그늘의 적용 진영·지속 기준, 암실과 중복할 때 처리','미결'],
    ['', '갈증의 효과 연결',value('효과 분류','J33'),'화상 해제 시 자연 해제 메모·기존 2턴','스킬 부가 처리','화상+암실 갱신 범위·종료 기준·지속','미결'],
    ['', '지옥 불의 화상 중첩',value('효과 분류','J34'),'화상 해제 시 자연 해제 메모·기존 2턴','스킬 부가 처리','중첩 수·상한·기간·재부여·표시 방식','미결'],
    ['', '기생·재생의 기간과 횟수','기간3은 턴마다 남은 기간을 줄이고, 횟수3은 실제 피해·회복이 발생한 횟수를 센다.','대기석·연결 끊김·발동 불가 시 차이','기간 상태·공통 발동 규칙','현재는 기간3 유지. 대기·발동 불가 때도 감소할지','미결'],
    ['', '봉인·속박의 불 해제','봉인은 기존 덩쿨의 새 이름이며 과거 불 피격 해제 조건은 재논의 중이다.','불타입 사용 제약도 함께 논의','해로운 1턴 상태','불속성으로 해제할지와 적용 조건','미결'],
]

plan = {
    'source':'v3-source.xlsx',
    'effects':{'sources':effect_sources,'startRow':9,'lastRow':49,'rows':effect_rows,'removeMerges':data_merges('효과 분류'),'addMerges':effect_merges,
        'rowHeights':{str(mapping[26]):92,str(mapping[31]):100,str(mapping[35]):72,str(mapping[36]):72,str(mapping[37]):72,str(mapping[29]):80,**{str(mapping[r]):72 for r in (38,39,40)}}},
    'skills':{'edits':skill_edits,'extraStart':27,'extraRows':skill_extra,'addMerges':['A27:A28'],'rowHeights':{'27':148,'28':164}},
    'review':{'edits':review_edits,'extraStart':25,'extraRows':review_extra,'addMerges':['A25:A36'],'rowHeights':{str(r):100 for r in range(25,37)}},
    'userChanges':changes,
}
(HERE / 'v3-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'userChangedCells':len(changes),'effectRows':len(effect_rows),'skillRows':23,'reviewRows':31,'residualRows':8},ensure_ascii=False))
