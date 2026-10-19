"""Preserve source package and native formatting around artifact-authored values."""
import copy
import hashlib
import importlib.util
import json
import sys
import zipfile
from pathlib import Path
from lxml import etree as ET

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'outputs/01a151d0-9d92-7900-b5be-31a811469c9d'
WORK = OUT / '_previews'
spec = importlib.util.spec_from_file_location('source_reader', HERE / 'inspect-source.py')
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
NS = reader.NS
S = NS['s']
plan = json.loads((HERE / 'v3-plan.json').read_text(encoding='utf-8'))
before = reader.read_book(WORK / 'v3-source.xlsx')
authored = reader.read_book(WORK / 'v3-authored.xlsx')
assert list(before) == list(authored)
assert not any(c['f'] for sh in before.values() for c in sh['values'].values()), 'Unexpected formulas require reference-preserving edits'


def set_value(cell, value):
    for child in list(cell):
        if child.tag.rsplit('}',1)[-1] in ('v','is','f'):
            cell.remove(child)
    cell.attrib.pop('t',None)
    if value is None or value == '':
        return
    if isinstance(value,(int,float)):
        ET.SubElement(cell,f'{{{S}}}v').text=str(value)
    else:
        cell.set('t','inlineStr')
        text=ET.SubElement(ET.SubElement(cell,f'{{{S}}}is'),f'{{{S}}}t')
        text.text=str(value)
        if value[:1].isspace() or value[-1:].isspace():
            text.set('{http://www.w3.org/XML/1998/namespace}space','preserve')


modified={}
with zipfile.ZipFile(WORK / 'v3-source.xlsx') as archive:
    for name,section,columns in [('효과 분류',plan['effects'],10),('스킬 분류',plan['skills'],8),('검토 대기',plan['review'],7)]:
        part=before[name]['part']
        root=ET.fromstring(archive.read(part))
        data=root.find('s:sheetData',NS)
        original_rows={int(r.get('r')):copy.deepcopy(r) for r in data}
        row_map={int(r.get('r')):r for r in data}
        if name=='효과 분류':
            for r in list(data):
                if int(r.get('r'))>=9:
                    data.remove(r)
            pairs=[(9+i,old) for i,old in enumerate(section['sources'])]
            expected={(f'{chr(65+c)}{9+i}'):v for i,row in enumerate(section['rows']) for c,v in enumerate(row)}
        else:
            pairs=[(section['extraStart']+i,18 if name=='스킬 분류' else 24) for i in range(len(section['extraRows']))]
            expected={**section['edits'],**{f'{chr(65+c)}{section["extraStart"]+i}':v for i,row in enumerate(section['extraRows']) for c,v in enumerate(row)}}
        for dest,src in pairs:
            new=copy.deepcopy(original_rows[src])
            new.set('r',str(dest))
            for cell in list(new):
                if cell.tag!=f'{{{S}}}c':
                    continue
                col=''.join(c for c in cell.get('r') if c.isalpha())
                cell.set('r',f'{col}{dest}')
                if col and ord(col[0])-65<columns:
                    set_value(cell,expected.get(f'{col}{dest}',''))
            have={c.get('r'):c for c in new if c.tag==f'{{{S}}}c'}
            for col in range(columns):
                address=f'{chr(65+col)}{dest}'
                if address not in have:
                    cell=ET.SubElement(new,f'{{{S}}}c',r=address)
                    set_value(cell,expected.get(address,''))
            data.append(new)
            row_map[dest]=new
        for address,v in section.get('edits',{}).items():
            r=int(''.join(c for c in address if c.isdigit()))
            cell=next((c for c in row_map[r] if c.get('r')==address),None)
            if cell is None:
                cell=ET.SubElement(row_map[r],f'{{{S}}}c',r=address)
            set_value(cell,v)
        for row,height in section['rowHeights'].items():
            row_map[int(row)].set('ht',str(height))
            row_map[int(row)].set('customHeight','1')
        merges=root.find('s:mergeCells',NS)
        for merge in list(merges):
            if merge.get('ref') in section.get('removeMerges',[]):
                merges.remove(merge)
        for merge in section['addMerges']:
            ET.SubElement(merges,f'{{{S}}}mergeCell',ref=merge)
        merges.set('count',str(len(merges)))
        last=49 if name=='효과 분류' else section['extraStart']+len(section['extraRows'])-1
        root.find('s:dimension',NS).set('ref',f'A1:{chr(64+columns)}{last}')
        # Verify the final values are exactly the artifact-authored cells.
        for address,v in expected.items():
            actual=authored[name]['values'].get(address,{}).get('v','')
            assert str(v) == actual, (name,address,v,actual)
        modified[part]=ET.tostring(root,encoding='UTF-8',xml_declaration=True,standalone=True)
    final=OUT / '풀로세움_효과와스킬_분류_v3.xlsx'
    with zipfile.ZipFile(final,'w') as target:
        for entry in archive.infolist():
            target.writestr(entry,modified.get(entry.filename,archive.read(entry.filename)))

after=reader.read_book(final)
assert list(after)==list(before)==['효과 분류','스킬 분류','검토 대기','미분류·잔여']
assert after['미분류·잔여']==before['미분류·잔여']
for name in after:
    if name=='효과 분류':
        expected={k:v for k,v in before[name]['values'].items() if int(''.join(c for c in k if c.isdigit()))<9}
        for i,row in enumerate(plan['effects']['rows']):
            expected.update({f'{chr(65+c)}{9+i}':{'v':str(v),'f':''} for c,v in enumerate(row) if v!=''})
    else:
        expected=copy.deepcopy(before[name]['values'])
        section=plan['skills'] if name=='스킬 분류' else plan['review'] if name=='검토 대기' else None
        if section:
            for address,v in section['edits'].items():
                expected[address]={'v':str(v),'f':''}
            for i,row in enumerate(section['extraRows']):
                expected.update({f'{chr(65+c)}{section["extraStart"]+i}':{'v':str(v),'f':''} for c,v in enumerate(row) if v!=''})
    assert expected==after[name]['values'], (name,'Unexpected values outside edit plan')
with zipfile.ZipFile(WORK/'v3-source.xlsx') as src,zipfile.ZipFile(final) as dst:
    assert src.namelist()==dst.namelist()
    changed_parts=[p for p in src.namelist() if src.read(p)!=dst.read(p)]
    assert set(changed_parts)==set(modified)
    for name in list(before)[:3]:
        a,b=ET.fromstring(src.read(before[name]['part'])),ET.fromstring(dst.read(before[name]['part']))
        for key in ('sheetViews','cols','dataValidations','conditionalFormatting','sheetProtection','pageMargins','pageSetup'):
            left=a.find(f's:{key}',NS);right=b.find(f's:{key}',NS)
            assert (None if left is None else ET.tostring(left))==(None if right is None else ET.tostring(right)), (name,key)
report={'changedParts':changed_parts,'userChangedCells':len(plan['userChanges']),'effectRows':41,'skillRows':23,'reviewRows':31,'residualRows':8,'sourceSha256':hashlib.sha256((WORK/'v3-source.xlsx').read_bytes()).hexdigest(),'v3Sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'unrelatedPackagePartsUnchanged':True,'unclassifiedSheetUnchanged':True}
(HERE/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
