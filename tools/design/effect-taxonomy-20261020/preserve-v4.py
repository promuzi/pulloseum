"""Keep native source formatting around the explicitly artifact-authored v4 edits."""
import copy, hashlib, importlib.util, json, sys, zipfile
from pathlib import Path
from lxml import etree as E
sys.stdout.reconfigure(encoding='utf-8')
HERE=Path(__file__).resolve().parent
OUT=HERE.parents[2]/'outputs/01a151d0-9d92-7900-b5be-31a811469c9d'
WORK=OUT/'_previews'
spec=importlib.util.spec_from_file_location('reader',HERE/'inspect-source.py')
reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
NS=reader.NS; S=NS['s']
plan=json.loads((HERE/'v4-plan.json').read_text(encoding='utf-8'))
before=reader.read_book(WORK/'v4-source.xlsx')
authored=reader.read_book(WORK/'v4-authored.xlsx')

def set_value(cell,text):
    for child in list(cell):
        if child.tag.rsplit('}',1)[-1] in ('v','is','f'): cell.remove(child)
    cell.attrib.pop('t',None)
    if text!='':
        cell.set('t','inlineStr')
        E.SubElement(E.SubElement(cell,f'{{{S}}}is'),f'{{{S}}}t').text=str(text)

modified={}; extra={}
with zipfile.ZipFile(WORK/'v4-source.xlsx') as source:
    book=E.fromstring(source.read('xl/workbook.xml'))
    rels=E.fromstring(source.read('xl/_rels/workbook.xml.rels'))
    types=E.fromstring(source.read('[Content_Types].xml'))
    for name,section in plan['sheets'].items():
        template=section['template']; part=before[template]['part']
        root=E.fromstring(source.read(part)); data=root.find('s:sheetData',NS)
        oldrows={int(r.get('r')):copy.deepcopy(r) for r in data}
        for r in list(data):
            if int(r.get('r'))>=section['start']: data.remove(r)
        for i,item in enumerate(section['rows']):
            dest=section['start']+i; src=item['src']; row=copy.deepcopy(oldrows[src]); row.set('r',str(dest))
            have={}
            for cell in row:
                if cell.tag!=f'{{{S}}}c': continue
                col=''.join(c for c in cell.get('r') if c.isalpha());cell.set('r',f'{col}{dest}');have[col]=cell
            for c,text in enumerate(item['v']):
                col=chr(65+c); cell=have.get(col)
                if cell is None: cell=E.SubElement(row,f'{{{S}}}c',r=f'{col}{dest}')
                old=before[template]['values'].get(f'{col}{src}',{}).get('v','')
                if old!=str(text): set_value(cell,text)
            if str(dest) in section['heights']:
                row.set('ht',str(section['heights'][str(dest)]));row.set('customHeight','1')
            data.append(row)
        for address,text in section['edits'].items():
            cell=root.find(f"s:sheetData/s:row/s:c[@r='{address}']",NS)
            assert cell is not None,address
            set_value(cell,text)
        merges=root.find('s:mergeCells',NS)
        for merge in list(merges):
            if int(''.join(c for c in merge.get('ref').split(':')[0] if c.isdigit()))>=section['start']: merges.remove(merge)
        for ref in section['merges']: E.SubElement(merges,f'{{{S}}}mergeCell',ref=ref)
        merges.set('count',str(len(merges)))
        last=section['start']+len(section['rows'])-1
        root.find('s:dimension',NS).set('ref',f'A1:{chr(64+section["cols"])}{last}')
        if section.get('validation'):
            for node in root.findall('s:dataValidations/s:dataValidation',NS):
                node.set('sqref',section['validation'])
                formula=node.find('s:formula1',NS)
                if name=='검토 대기' and formula is not None and formula.text and formula.text.startswith('"') and '미결' not in formula.text:
                    formula.text=formula.text[:-1]+',미결"'
        if section.get('new'):
            validations=root.find('s:dataValidations',NS)
            if validations is not None: root.remove(validations)
            for col,width in zip(root.findall('s:cols/s:col',NS),section['widths']): col.set('width',str(width));col.set('customWidth','1')
            for node in root.findall('s:sheetViews/s:sheetView',NS): node.attrib.pop('tabSelected',None)
            # The scrollable pane must start beyond the frozen columns/rows.
            # A6 with two frozen columns is rejected by native Excel.
            pane=root.find('s:sheetViews/s:sheetView/s:pane',NS)
            right=chr(65+int(float(pane.get('xSplit','0'))))
            bottom=1+int(float(pane.get('ySplit','0')))
            pane.set('topLeftCell',f'{right}{bottom}')
            for node in root.findall('s:sheetViews/s:sheetView/s:selection',NS):
                position={'topRight':f'{right}1','bottomLeft':f'A{bottom}','bottomRight':f'{right}{bottom}'}.get(node.get('pane'),'A1')
                node.set('activeCell',position);node.set('sqref',position)
            sid=max(int(x.get('sheetId')) for x in book.find('s:sheets',NS))+1
            rid='rId'+str(max(int(x.get('Id')[3:]) for x in rels)+1)
            newpart=f'xl/worksheets/sheet{sid}.xml'
            E.SubElement(book.find('s:sheets',NS),f'{{{S}}}sheet',name=name,sheetId=str(sid),attrib={'{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id':rid})
            E.SubElement(rels,'{http://schemas.openxmlformats.org/package/2006/relationships}Relationship',Id=rid,Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet',Target=f'worksheets/sheet{sid}.xml')
            E.SubElement(types,'{http://schemas.openxmlformats.org/package/2006/content-types}Override',PartName='/'+newpart,ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')
            extra[newpart]=E.tostring(root,encoding='UTF-8',xml_declaration=True,standalone=True)
            oldrel=part.replace('worksheets/','worksheets/_rels/')+'.rels'
            if oldrel in source.namelist(): extra[newpart.replace('worksheets/','worksheets/_rels/')+'.rels']=source.read(oldrel)
        else: modified[part]=E.tostring(root,encoding='UTF-8',xml_declaration=True,standalone=True)
    for key,root in [('xl/workbook.xml',book),('xl/_rels/workbook.xml.rels',rels),('[Content_Types].xml',types)]:
        modified[key]=E.tostring(root,encoding='UTF-8',xml_declaration=True,standalone=True)
    if 'docProps/app.xml' in source.namelist():
        app=E.fromstring(source.read('docProps/app.xml')); ns={'a':'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties','v':'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes'}
        vector=app.find('a:TitlesOfParts/v:vector',ns)
        if vector is not None: E.SubElement(vector,'{'+ns['v']+'}lpstr').text='공통 처리';vector.set('size',str(len(vector)))
        count=app.find('a:HeadingPairs/v:vector/v:variant/v:i4',ns)
        if count is not None: count.text=str(len(before)+1)
        modified['docProps/app.xml']=E.tostring(app,encoding='UTF-8',xml_declaration=True,standalone=True)
    final=WORK/'v4-final.xlsx'
    with zipfile.ZipFile(final,'w') as target:
        for entry in source.infolist(): target.writestr(entry,modified.get(entry.filename,source.read(entry.filename)))
        for part,content in extra.items(): target.writestr(part,content)
after=reader.read_book(final)
assert list(after)==list(before)+['공통 처리']
assert after['보류']==before['보류'],'Held item changed'
for name,section in plan['sheets'].items():
    expected={a:c for a,c in before[section['template']]['values'].items() if int(''.join(x for x in a if x.isdigit()))<section['start']}
    for i,item in enumerate(section['rows']):
        expected.update({f'{chr(65+c)}{section["start"]+i}':{'v':str(v),'f':''} for c,v in enumerate(item['v']) if v!=''})
    for address,v in section['edits'].items(): expected[address]={'v':v,'f':''}
    assert after[name]['values']==expected,(name,'Unexpected final cells')
    assert authored[name]['values']==expected,(name,'Different from artifact-authored values')
with zipfile.ZipFile(WORK/'v4-source.xlsx') as src,zipfile.ZipFile(final) as dst:
    assert all(src.read(p)==dst.read(p) for p in src.namelist() if p not in modified)
    assert src.read(before['보류']['part'])==dst.read(after['보류']['part'])
assert after['검토 대기']['values']['B6']['v']=='기절'
assert all(after['효과 분류']['values'][f'F{r}']['v']=='정화·회수' for r in range(19,34))
assert all(after['효과 분류']['values'][f'F{r}']['v']=='불가' for r in range(9,19))
report={'sheetRows':{name:len(s['rows']) for name,s in plan['sheets'].items()},'heldRows':1,'nextQuestion':'기절','sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'sourceSha256':plan['sourceSha256'],'unrelatedPackagePartsUnchanged':True}
(HERE/'v4-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
if '--install' in sys.argv:
    assert hashlib.sha256(Path(plan['source']).read_bytes()).hexdigest()==plan['sourceSha256'],'Source edited during preparation'
    content=final.read_bytes()
    destinations=[OUT/'풀로세움_효과와스킬_분류_v4.xlsx',Path('C:/Users/soosa/OneDrive/Desktop/풀로세움_효과와스킬_분류_v4.xlsx')]
    for dest in destinations:
        if dest.exists(): assert dest.read_bytes()==content,'A different v4 already exists; preserve it'
        else: dest.write_bytes(content)
    assert all(dest.read_bytes()==content for dest in destinations)
print(json.dumps(report,ensure_ascii=False))
