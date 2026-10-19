"""Read workbook values and compare saved user changes without rewriting XLSX."""
import json
import posixpath
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def read_book(path):
    with zipfile.ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(x.text or '' for x in item.iterfind('.//s:t', NS))
                       for item in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
        relations = {x.get('Id'): x.get('Target') for x in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        result = {}
        for sheet in ET.fromstring(archive.read('xl/workbook.xml')).find('s:sheets', NS):
            target = relations[sheet.get(f'{{{REL}}}id')]
            part = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl', target))
            root = ET.fromstring(archive.read(part))
            values = {}
            for cell in root.findall('s:sheetData/s:row/s:c', NS):
                value = cell.findtext('s:v', '', NS)
                if cell.get('t') == 's':
                    value = strings[int(value)]
                elif cell.get('t') == 'inlineStr':
                    value = ''.join(t.text or '' for t in cell.iterfind('.//s:t', NS))
                formula = cell.findtext('s:f', '', NS)
                if value or formula:
                    values[cell.get('r')] = {'v': value, 'f': formula}
            result[sheet.get('name')] = {'values': values, 'part': part,
                'merges': [x.get('ref') for x in root.findall('s:mergeCells/s:mergeCell', NS)],
                'rows': {r.get('r'): dict(r.attrib) for r in root.findall('s:sheetData/s:row', NS)}}
        return result


if __name__ == '__main__':
    source = read_book(sys.argv[1])
    baseline = read_book(sys.argv[2]) if len(sys.argv) > 2 else None
    for name, sheet in source.items():
        print('\nSHEET ' + name + ' MERGES ' + ', '.join(sheet['merges']))
        rows = {}
        for address, cell in sheet['values'].items():
            row = int(''.join(c for c in address if c.isdigit()))
            rows.setdefault(row, []).append(address + '=' + (cell['f'] or cell['v']).replace('\n', ' / '))
        for row in sorted(rows):
            print(' | '.join(rows[row]))
    if baseline:
        changes = []
        for name, sheet in source.items():
            old = baseline.get(name, {}).get('values', {})
            for address in sorted(old.keys() | sheet['values'].keys()):
                before = old.get(address, {}).get('v', '')
                after = sheet['values'].get(address, {}).get('v', '')
                if before != after:
                    changes.append({'sheet': name, 'cell': address, 'before': before, 'after': after})
        print('\nUSER_CHANGES\n' + json.dumps(changes, ensure_ascii=False, indent=2))
