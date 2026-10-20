"""Prepare explicit, source-based v4 edits without writing a workbook."""
import copy, hashlib, importlib.util, json, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
HERE=Path(__file__).resolve().parent
OUT=HERE.parents[2]/'outputs/01a151d0-9d92-7900-b5be-31a811469c9d'
WORK=OUT/'_previews'
SOURCE=Path('C:/Users/soosa/OneDrive/Desktop/풀로세움_효과와스킬_분류_v3_보류분리.xlsx')
spec=importlib.util.spec_from_file_location('reader',HERE/'inspect-source.py')
reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
book=reader.read_book(SOURCE)
assert list(book)==['효과 분류','스킬 분류','검토 대기','미분류·잔여','보류']
assert all(not c['f'] for sh in book.values() for c in sh['values'].values())
assert reader.read_book(SOURCE)==reader.read_book(OUT/'풀로세움_효과와스킬_분류_v3.xlsx'),'Review newer desktop edits first.'
(WORK/'v4-source.xlsx').write_bytes(SOURCE.read_bytes())

def row(name,r,n):
    return [book[name]['values'].get(f'{chr(65+c)}{r}',{}).get('v','') for c in range(n)]

def groups(rows,start):
    merges=[];first=start
    for i in range(1,len(rows)+1):
        if i==len(rows) or rows[i]['v'][0]:
            last=start+i-1
            if last>first: merges.append(f'A{first}:A{last}')
            first=start+i
    return merges

plan={'source':str(SOURCE),'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'sourceMerges':{name:sh['merges'] for name,sh in book.items()},'sheets':{}}
effects=[{'src':r,'v':row('효과 분류',r,10)} for r in range(9,50)]
for r in effects:
    n=r['src'];v=r['v']
    if 19<=n<=33: v[5]='정화·회수'
    if 34<=n<=36: v[5]='불가'
    if n==29:
        v[4]='몸에 붙어 남은 대기 턴이 0이 되면 피해와 암실을 부여한다.'
        v[6]='지연 발동';v[7]='미결'
        v[9]='턴 수 기준 확정. 턴 단축·즉시 발동 가능. 초기값·재부여·대기 중 실제 발동·발동 후 처리 미결'
    if n==34:
        v[6]='사용·행동 불가 시';v[9]='해당 공격 실행 시 1회 소모. 빙결·기절 등 한 턴 쉬면 해제. 연타 적용 범위 미결'
    if n==35:
        v[6]='사용·피격·행동 불가 시';v[9]='내 공격·회피 실패·빙결/기절 등 행동 불가로 해제. 상태이상 피해는 제외. 분신은 연출만 다름'
    if n==36:
        v[6]='방어 사용 시';v[9]='한 번 막으면 잔량과 무관하게 제거. 빗나감·행동 불가·상태이상 피해로는 소모하지 않음. 연타 범위 미결'
    if n==48:
        v[0]='설치형';v[1]='함정';v[5]='해체';v[8]='양측 교체에도 유지';v[9]='사용·작동·해체 시 종료. 공유·소유 세부는 기존 검토 유지'
    if n==49:
        v[5]='파괴';v[9]='주인 교체·파괴 시 종료. 재출전해도 자동 복원 안 됨. 상대는 파괴 외 제거 불가. 기존 성체 변경 규칙은 별도 기록 유지'
plan['sheets']['효과 분류']={'template':'효과 분류','start':9,'cols':10,'rows':effects,'merges':[m for m in book['효과 분류']['merges'] if int(m.split(':')[0][1:])>=9],
 'edits':{'F8':'제거 방식','D4':'각 중첩 5턴·독립 만료·교체 중 진행. 제거 불가, 반대 능력치 효과로 보완','D5':'정화=자신 / 회수=타인. 이로운·해로운 대상을 지정. 교체 후 유지·턴 진행','D6':'교체 시 제거. 집중·은신은 행동 불가로 해제. 보호막은 빗나감·행동 불가에도 유지'},'heights':{str(r):66 for r in (29,30,34,35,36,48,49)}}

skills=[]
for r in range(6,29):
    v=row('스킬 분류',r,8)
    if r==6: v[6]='업화: 화상 제외 해로운 상태 회수+고정 피해 / 지옥 불의 첫 불 공격'
    if r==8: v[3]='선공·후공과 무관하게 그 턴의 상대 공격에 방어 효과를 적용한다.'
    if r==9: v[3]='선공·후공과 무관하게 그 턴의 상대 공격에 회피 효과를 적용한다.'
    if r==14:
        v[1]='자신의 상태 제거';v[3]='자신의 상태이상을 제거한다. 이로운/해로운 대상을 기술마다 지정한다.'
        v[4]='기존 제거 개수·무작위 기준 유지';v[7]='능력치 버프·디버프와 다른 분류는 제거 불가. 상태 겹 제거 범위 미결'
    if r==20: v[4]='사용·교체·한 턴 행동 불가 시 제거'
    if r==21: v[7]='후공 사용 시 다음 상대 공격까지 대기. 빙결·기절 등 한 턴 쉬면 해제'
    if r==22: v[7]='사용 전 유지. 교체 시 제거. 빗나감·행동 불가에는 유지. 연타 범위 미결'
    if r==23: v[7]='취소 불가. 교체 시 종료·유지는 환경 종류별'
    if r==24: v[7]='정화·회수·해체로 취소 불가. 기존 유지비·주인 교체 종료 규칙 유지'
    if r==25:
        v[0]='설치형 스킬';v[1]='함정 설치';v[3]='양측 교체에도 유지되는 설치물을 둔다.'
        v[4]='사용·작동·해체 시 종료';v[7]='지연 발동과 조합 가능. 다이너마이트는 채택 미정 예시. 직접 피해 혼합은 공격 대표'
    if r==26: v[4]='주인 교체·파괴로 종료';v[7]='재출전 자동 복원 없음. 상대는 파괴 외 제거 불가'
    skills.append({'src':r,'v':v})
    if r==10:
        skills.append({'src':8,'v':['','그 턴 생존','그 턴 버티기','행동 순서와 무관하게 턴 시작부터 유효하며, 그 턴에 쓰러질 직접 공격을 받으면 버틴다.','조건 미발생 시 턴 종료','방어 행동 연출','쏜위드 죽은 줄 알았나?','발동 조건·회복량·사용 횟수는 고유 규칙. 전용 스킬 수치 미결 유지']})
    if r==14:
        skills += [
          {'src':14,'v':['','타인의 상태 제거','회수','타인의 상태이상을 제거한다. 이로운/해로운 대상을 기술마다 지정한다.','제거 범위는 기술별','기술 연출','업화·타이드 마지막 공격','능력치 강화·약화/준비/환경/설치형/소환수는 대상 아님']},
          {'src':14,'v':['','상태이상 복사','복사','이로운·해로운 상태이상 전체를 복사한다. 데미지/비데미지 모두 포함한다.','조화의 선후공 방향·덮어쓰기 유지','기술 연출','아쿠아벌브 조화','다른 효과 분류 제외. 겹·잔여 기간·면역 세부 미결']},
          {'src':13,'v':['','고유 자원 전환','전환','자원을 바꾸는 기술은 서포팅으로 분류하고 전환 조건은 고유스킬에 둔다.','고유 자원 규칙','기술 연출','스파크번 태양광? 그거야!','전환량·제한은 기존 고유스킬 결정 유지']}
        ]
plan['sheets']['스킬 분류']={'template':'스킬 분류','start':6,'cols':8,'rows':skills,'merges':groups(skills,6),'edits':{},'heights':{str(6+i):max(108 if item['src']==27 else 144 if item['src']==28 else 64,float(book['스킬 분류']['rows'].get(str(item['src']),{}).get('ht','42'))) for i,item in enumerate(skills)}}

reviews=[]
for r in range(12,36):
    v=row('검토 대기',r,7)
    if r==16: v[5]='대기석에서도 피해·회복·지연 발동을 처리할지'
    if r==17: v[3]='기생·갈증·지옥 불'
    if r==19:
        v[2]='상태이상 한 종류를 제거할 때 겹을 어디까지 없앨지 정해야 한다.';v[3]='독 등이 여러 겹인 경우'
        v[4]='정화·회수';v[2]+=' 능력치 버프·디버프는 제거 불가.';v[6]='미결'
    if r==21:
        v[1]='능력치 흡수량·연동';v[5]='흡수량·비율과 두 효과의 계산 연결'
        v[2]='상대 약화와 내 강화는 각각 5턴 독립 만료하며 제거 불가. 상대 정화로 반환하는 전제는 폐기한다.';v[6]='미결'
    if r==29:
        v[1]='포자 지연·재부여';v[2]='포자는 상태이상이며 남은 턴으로 발동한다. 턴 단축·즉시 발동을 지원한다.'
        v[3]='턴 기준 확정. 초기 대기 턴 수는 미결';v[5]='초기값·재부여·대기 중 실제 발동·발동 후 처리';v[6]='미결'
    if r==34: v[5]='기간3·교체 중 시간 진행 유지. 대기 중 실제 발동·연결이 끊긴 경우의 효력'
    v[6]='미결'
    reviews.append({'src':r,'v':v})
plan['sheets']['검토 대기']={'template':'검토 대기','start':6,'cols':7,'rows':reviews,'merges':groups(reviews,6),'edits':{},'heights':{str(6+i):72 for i in range(len(reviews))},'validation':'G6:G29'}

residual=[{'src':r,'v':row('미분류·잔여',r,6)} for r in range(6,14)]
residual[1]['v'][4]='억셈으로 통합하거나 피해 경감 상태를 추가'
residual[2]['v'][4]='고유 자원으로 유지. 소비 공통 처리와 연결';residual[2]['v'][5]='유지'
residual[3]['v'][4]='종 고유 규칙으로 유지. 허세·위축의 한쪽 소비 조건을 지정';residual[3]['v'][5]='유지'
residual += [
 {'src':8,'v':['고유스킬 규칙','스파크번 자원 전환','서포팅 스킬. 햇빛을 전기로 바꾼다.','전환량·충전 정지 등의 조건은 종 전용이다.','공통 소비와 기존 충전 규칙을 사용','유지']},
 {'src':8,'v':['','블레이즈블룸 업화','화상을 제외한, 해로운 상태이상을 회수한다.','기존 원안의 디버프는 해로운 상태이상을 뜻한다.','회수한 수에 비례한 고정 피해. 구체 수치는 기존 검토 유지','유지']},
 {'src':8,'v':['','쏜위드 죽은 줄 알았나?','방어 스킬. 행동 순서와 무관하게 사용한 턴 시작부터 유효하다.','쓰러질 직접 공격에 버티고 체력을 회복하는 종 전용 규칙이다.','발동 조건·회복량·횟수는 고유 규칙. 조건 미발생 시 턴 종료','유지']}
]
plan['sheets']['미분류·잔여']={'template':'미분류·잔여','start':6,'cols':6,'rows':residual,'merges':groups(residual,6),'edits':{'A2':'고유 규칙과 미분류 항목'},'heights':{str(r):66 for r in range(14,17)},'validation':'F6:F16'}

common=[
 ['공통 처리 태그','소비','고유 자원·햇빛','스킬에 지정한 자원을 소비한다. 피격 피해와 원인을 구별한다.','대상·양·소비 시점','스파크 전기 / 앰버 허세·위축','상태이상 제거는 정화·회수. 스킬별 실패·환급 규칙은 개별 지정'],
 ['','지연','상태이상·설치형 등의 발동 예약','남은 턴이 0이면 발동. 다른 요소로 턴 단축·즉시 발동 가능.','초기 대기 턴·단축·즉시 발동 조건','포자 / 다이너마이트(채택 미정 예시)','포자는 정화·회수, 설치형은 해체. 유지 기간과 구별. 초기값·재부여·발동 단계 미결'],
 ['','해체','설치형','해체 태그를 가진 기술로 설치물을 제거한다.','제거 대상·개수·성공 조건','쏜위드 덫 / 다이너마이트(채택 미정 예시)','환경·소환수는 해체 대상 아님. 스킬별 수치·성공 조건 미결']
]
plan['sheets']['공통 처리']={'template':'검토 대기','new':True,'start':6,'cols':7,'rows':[{'src':6,'v':v} for v in common],'merges':['A6:A8'],'edits':{'A2':'공통 처리 태그','A5':'구분','B5':'처리','C5':'대상','D5':'공통 규칙','E5':'스킬별 지정','F5':'예시','G5':'조건·미결'},'heights':{str(r):100 for r in range(6,9)},'widths':[16,16,30,52,30,34,58]}
(HERE/'v4-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print('Plan saved: effects 41, skills 27, review 24, residual/unique 11, hold 1, shared processing 3.')
