"""Preserve the source XLSX package around the artifact-authored one-row move."""
import copy
import importlib.util
import re
import sys
import zipfile
from pathlib import Path
from lxml import etree as E

sys.stdout.reconfigure(encoding='utf-8')
HERE=Path(__file__).resolve().parent
OUT=HERE.parents[2]/'outputs/01a151d0-9d92-7900-b5be-31a811469c9d'
WORK=OUT/'_previews'
DESKTOP=Path('C:/Users/soosa/OneDrive/Desktop/풀로세움_효과와스킬_분류_v3.xlsx')
spec=importlib.util.spec_from_file_location('reader',HERE/'inspect-source.py')
reader=importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
before=reader.read_book(WORK/'hold-source.xlsx')
authored=reader.read_book(WORK/'hold-authored.xlsx')
NS=reader.NS
S=NS['s']
part=before['검토 대기']['part']

def value(cell,text):
    for child in list(cell):
        if child.tag.rsplit('}',1)[-1] in ('v','is','f'): cell.remove(child)
    cell.set('t','inlineStr')
    E.SubElement(E.SubElement(cell,f'{{{S}}}is'),f'{{{S}}}t').text=text

def shift(text):
    return re.sub(r'(\$?[A-Z]+\$?)(\d+)',lambda m:m[1]+str(int(m[2])-(int(m[2])>10)),text)

with zipfile.ZipFile(WORK/'hold-source.xlsx') as source:
    review=E.fromstring(source.read(part))
    hold=copy.deepcopy(review)
    data=review.find('s:sheetData',NS)
    for row in list(data):
        number=int(row.get('r'))
        if number==10: data.remove(row)
        elif number>10:
            row.set('r',str(number-1))
            for cell in row:
                if cell.get('r'): cell.set('r',shift(cell.get('r')))
    for node in review.iter():
        if node.tag==f'{{{S}}}c': continue
        for key in ('ref','sqref','activeCell','topLeftCell'):
            if node.get(key): node.set(key,shift(node.get(key)))
    hd=hold.find('s:sheetData',NS)
    for row in list(hd):
        number=int(row.get('r'))
        if number not in (1,2,3,4,5,10): hd.remove(row)
        elif number==10:
            row.set('r','6')
            for col in 'ABCDEFG':
                cell=next((c for c in row if c.get('r')==f'{col}10'),None)
                if cell is None: cell=E.SubElement(row,f'{{{S}}}c',r=f'{col}6')
                cell.set('r',f'{col}6')
                value(cell,authored['보류']['values'][f'{col}6']['v'])
    value(hold.find("s:sheetData/s:row/s:c[@r='A2']",NS),'보류한 처리와 스킬')
    hold.find('s:dimension',NS).set('ref','A1:G6')
    merges=hold.find('s:mergeCells',NS)
    for item in list(merges):
        if item.get('ref')!='A2:G2': merges.remove(item)
    merges.set('count',str(len(merges)))
    for node in hold.findall('s:dataValidations/s:dataValidation',NS): node.set('sqref','G6')
    for node in hold.findall('s:sheetViews/s:sheetView/s:selection',NS):
        node.set('activeCell','B6');node.set('sqref','B6')
    for node in hold.findall('s:sheetViews/s:sheetView',NS): node.attrib.pop('tabSelected',None)
    main=E.fromstring(source.read('xl/workbook.xml'))
    rels=E.fromstring(source.read('xl/_rels/workbook.xml.rels'))
    types=E.fromstring(source.read('[Content_Types].xml'))
    rid='rId'+str(max(int(x.get('Id')[3:]) for x in rels)+1)
    sid=max(int(x.get('sheetId')) for x in main.find('s:sheets',NS))+1
    newpart=f'xl/worksheets/sheet{sid}.xml'
    E.SubElement(main.find('s:sheets',NS),f'{{{S}}}sheet',name='보류',sheetId=str(sid),attrib={'{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id':rid})
    E.SubElement(rels,'{http://schemas.openxmlformats.org/package/2006/relationships}Relationship',Id=rid,Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet',Target=f'worksheets/sheet{sid}.xml')
    E.SubElement(types,'{http://schemas.openxmlformats.org/package/2006/content-types}Override',PartName='/'+newpart,ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')
    changes={part:review,newpart:hold,'xl/workbook.xml':main,'xl/_rels/workbook.xml.rels':rels,'[Content_Types].xml':types}
    if 'docProps/app.xml' in source.namelist():
        app=E.fromstring(source.read('docProps/app.xml'))
        vt={'a':'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties','v':'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes'}
        titles=app.find('a:TitlesOfParts/v:vector',vt)
        if titles is not None:
            E.SubElement(titles,'{'+vt['v']+'}lpstr').text='보류';titles.set('size',str(len(titles)))
        count=app.find('a:HeadingPairs/v:vector/v:variant/v:i4',vt)
        if count is not None: count.text=str(len(before)+1)
        changes['docProps/app.xml']=app
    candidate=WORK/'hold-final.xlsx'
    with zipfile.ZipFile(candidate,'w') as target:
        for entry in source.infolist():
            target.writestr(entry,E.tostring(changes[entry.filename],encoding='UTF-8',xml_declaration=True,standalone=True) if entry.filename in changes else source.read(entry.filename))
        target.writestr(newpart,E.tostring(hold,encoding='UTF-8',xml_declaration=True,standalone=True))
        oldrel=part.replace('worksheets/','worksheets/_rels/')+'.rels'
        if oldrel in source.namelist(): target.writestr(newpart.replace('worksheets/','worksheets/_rels/')+'.rels',source.read(oldrel))
after=reader.read_book(candidate)
assert list(after)==list(before)+['보류']
for name in before:
    if name!='검토 대기': assert before[name]==after[name],name
for name in ('검토 대기','보류'):
    assert after[name]['values']==authored[name]['values'],(name,'Values differ from artifact-authored edit')
assert not any(c['v']=='모으기' for a,c in after['검토 대기']['values'].items() if a.startswith('B'))
assert after['보류']['values']['B6']['v']=='모으기'
assert DESKTOP.read_bytes()==(WORK/'hold-source.xlsx').read_bytes(),'Desktop changed; preserve the newer user edits.'
if '--install' in sys.argv:
    content=candidate.read_bytes()
    delivered=DESKTOP
    try:
        with DESKTOP.open('r+b') as stream:
            assert stream.read()==(WORK/'hold-source.xlsx').read_bytes()
            stream.seek(0);stream.write(content);stream.truncate()
    except PermissionError:
        delivered=DESKTOP.with_name(DESKTOP.stem+'_보류분리.xlsx')
        if delivered.exists(): assert delivered.read_bytes()==content,'A different delivery copy already exists.'
        else: delivered.write_bytes(content)
    (OUT/DESKTOP.name).write_bytes(content)
    assert delivered.read_bytes()==(OUT/DESKTOP.name).read_bytes()
    print('Desktop delivery: '+str(delivered))
print('Verified: 30 review items, 1 held item, 3 other sheets unchanged.' + (' Installed desktop and repository copies.' if '--install' in sys.argv else ''))
