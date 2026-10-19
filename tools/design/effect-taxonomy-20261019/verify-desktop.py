"""Check the targeted workbook edit, then optionally copy the verified bytes."""
import argparse
import hashlib
import json
import posixpath
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "outputs/01a151d0-9d92-7900-b5be-31a811469c9d"
WORK = OUT / "_previews"
DESKTOP = Path("C:/Users/soosa/OneDrive/Desktop/풀로세움_효과와스킬_분류.xlsx")
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
ALLOWED = set("C22 C23 E22 H19 H20 J20 H21 H22 J22 H23 J23 H24 H25 H26 H27 H28 H29 H31 J31 H32 H33 H34 H35 H41 H43 H44 H45".split())


def canonical(element):
    if element is None:
        return None
    return (element.tag, tuple(sorted(element.attrib.items())), element.text or "", tuple(canonical(x) for x in element))


def read_book(path):
    with zipfile.ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(t.text or "" for t in item.iterfind(".//s:t", NS)) for item in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        styles = ET.fromstring(archive.read("xl/styles.xml"))
        groups = {key: list(styles.find(f"s:{key}", NS)) for key in ("fonts", "fills", "borders", "cellXfs")}
        number_formats = {int(x.get("numFmtId")): x.get("formatCode") for x in styles.findall("s:numFmts/s:numFmt", NS)}

        def style_of(style_id):
            xf = groups["cellXfs"][style_id]
            attrs = {k: v for k, v in xf.attrib.items() if k not in ("fontId", "fillId", "borderId", "numFmtId", "xfId") and v != "0"}
            nf = int(xf.get("numFmtId", "0"))
            return (tuple(sorted(attrs.items())), number_formats.get(nf, nf), *(canonical(groups[g][int(xf.get(k, "0"))]) for k, g in (("fontId", "fonts"), ("fillId", "fills"), ("borderId", "borders"))), tuple(canonical(x) for x in xf))

        relationships = {x.get("Id"): x.get("Target") for x in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
        result = {}
        for item in ET.fromstring(archive.read("xl/workbook.xml")).find("s:sheets", NS):
            target = relationships[item.get(f"{{{REL}}}id")]
            part = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
            root = ET.fromstring(archive.read(part))
            values, cell_styles = {}, {}
            for cell in root.findall("s:sheetData/s:row/s:c", NS):
                value = cell.findtext("s:v", "", NS)
                if cell.get("t") == "s":
                    value = strings[int(value)]
                elif cell.get("t") == "inlineStr":
                    value = "".join(t.text or "" for t in cell.iterfind(".//s:t", NS))
                formula = cell.findtext("s:f", "", NS)
                if value or formula:
                    values[cell.get("r")] = (value, formula)
                cell_styles[cell.get("r")] = style_of(int(cell.get("s", "0")))
            result[item.get("name")] = {
                "values": values,
                "styles": cell_styles,
                "merges": {x.get("ref") for x in root.findall("s:mergeCells/s:mergeCell", NS)},
                "rows": {x.get("r"): tuple(sorted((k, v) for k, v in x.attrib.items() if k not in ("spans",)) ) for x in root.findall("s:sheetData/s:row", NS)},
                "columns": canonical(root.find("s:cols", NS)),
                "views": canonical(root.find("s:sheetViews", NS)),
                "validations": canonical(root.find("s:dataValidations", NS)),
            }
        return result


parser = argparse.ArgumentParser()
parser.add_argument("--finalize", action="store_true", help="Preserve unsupported source formatting/view metadata around artifact-authored edits.")
parser.add_argument("--install", action="store_true")
args = parser.parse_args()
if args.finalize:
    # Artifact import/export changes scroll/zoom metadata and blank rows. Retain
    # the original package and transplant only the already-authored cell values
    # and two merge ranges. No other worksheet or package part is rewritten.
    from lxml import etree

    authored = read_book(WORK / "desktop-revised.xlsx")["효과 분류"]["values"]
    with zipfile.ZipFile(WORK / "desktop-source.xlsx") as source_zip:
        root = etree.fromstring(source_zip.read("xl/worksheets/sheet1.xml"))
        cells = {c.get("r"): c for c in root.findall("s:sheetData/s:row/s:c", NS)}
        cells["C23"].set("s", cells["C22"].get("s", "0"))
        for address in ALLOWED:
            cell = cells[address]
            value, formula = authored.get(address, ("", ""))
            assert not formula
            for child in list(cell):
                if child.tag.rsplit("}", 1)[-1] in ("v", "is", "f"):
                    cell.remove(child)
            cell.attrib.pop("t", None)
            if not value:
                continue
            if address.startswith("H") and value.isdecimal():
                etree.SubElement(cell, f"{{{NS['s']}}}v").text = value
            else:
                cell.set("t", "inlineStr")
                inline = etree.SubElement(cell, f"{{{NS['s']}}}is")
                etree.SubElement(inline, f"{{{NS['s']}}}t").text = value
        replacements = {"C19:C21": "C19:C22", "C22:C30": "C23:C30"}
        for merge in root.findall("s:mergeCells/s:mergeCell", NS):
            if merge.get("ref") in replacements:
                merge.set("ref", replacements[merge.get("ref")])
        xml = etree.tostring(root, encoding="UTF-8", xml_declaration=True, standalone=True)
        target = WORK / "desktop-preserved.xlsx"
        with zipfile.ZipFile(target, "w") as final_zip:
            for entry in source_zip.infolist():
                final_zip.writestr(entry, xml if entry.filename == "xl/worksheets/sheet1.xml" else source_zip.read(entry.filename))
    target.replace(WORK / "desktop-revised.xlsx")

before = read_book(WORK / "desktop-source.xlsx")
after = read_book(WORK / "desktop-revised.xlsx")
assert list(before) == list(after) == ["효과 분류", "스킬 분류", "검토 대기", "미분류·잔여"]
report = {}
for name, original in before.items():
    revised = after[name]
    changed = {key for key in original["values"].keys() | revised["values"].keys() if original["values"].get(key) != revised["values"].get(key)}
    assert changed == (ALLOWED if name == "효과 분류" else set()), (name, "unexpected values", changed ^ ALLOWED)
    removed = original["merges"] - revised["merges"]
    added = revised["merges"] - original["merges"]
    assert removed == ({"C19:C21", "C22:C30"} if name == "효과 분류" else set()), (name, removed)
    assert added == ({"C19:C22", "C23:C30"} if name == "효과 분류" else set()), (name, added)
    assert original["rows"] == revised["rows"], (name, "row settings changed")
    assert original["columns"] == revised["columns"], (name, "column settings changed")
    assert original["validations"] == revised["validations"], (name, "validations changed")
    assert original["views"] == revised["views"], (name, "view settings changed")
    report[name] = {"changed_cells": sorted(changed), "style_differences": [key for key in original["styles"].keys() & revised["styles"].keys() if original["styles"][key] != revised["styles"][key]], "view_equal": original["views"] == revised["views"], "merged_groups": len(revised["merges"])}
    assert set(report[name]["style_differences"]) <= ({"C23"} if name == "효과 분류" else set()), (name, "unexpected style changes")

with zipfile.ZipFile(WORK / "desktop-source.xlsx") as original_zip, zipfile.ZipFile(WORK / "desktop-revised.xlsx") as final_zip:
    assert original_zip.namelist() == final_zip.namelist()
    assert [part for part in original_zip.namelist() if original_zip.read(part) != final_zip.read(part)] == ["xl/worksheets/sheet1.xml"]

effects = after["효과 분류"]["values"]
assert [effects[f"D{r}"][0] for r in (12, 13, 26)] == ["치명", "집중", "속박"]
assert all(effects[f"F{r}"][0] == "불가" for r in range(14, 19))
assert effects["H37"][0] == "미정"
assert not [key for key in effects if key.startswith("H") and effects[key][0] == "미정" and key != "H37"]
print(json.dumps(report, ensure_ascii=False, indent=2))

if args.install:
    expected = (WORK / "desktop-source.sha256").read_text(encoding="utf-8").strip()
    assert hashlib.sha256(DESKTOP.read_bytes()).hexdigest() == expected, "Desktop changed; inspect the latest user edits before saving."
    content = (WORK / "desktop-revised.xlsx").read_bytes()
    with DESKTOP.open("r+b") as stream:
        assert hashlib.sha256(stream.read()).hexdigest() == expected, "Desktop changed just before saving."
        stream.seek(0)
        stream.write(content)
        stream.truncate()
    canonical_path = OUT / DESKTOP.name
    canonical_path.write_bytes(content)
    assert DESKTOP.read_bytes() == canonical_path.read_bytes() == content
    print(json.dumps({"installed": [str(DESKTOP), str(canonical_path)], "sha256": hashlib.sha256(content).hexdigest()}, ensure_ascii=False))
