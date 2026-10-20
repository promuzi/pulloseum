import json, math, sys

sys.stdout.reconfigure(encoding="utf-8")
res = json.load(open(sys.argv[1], encoding="utf-8-sig"))
jobs = {(j["sheet"], j["coord"]): j for j in json.load(open(sys.argv[2], encoding="utf-8"))}
need = {}
for r in res:
    key = (r["sheet"], r["row"])
    need[key] = max(need.get(key, 0), float(r["need"]))
heights = {}
for (sheet, row), h in sorted(need.items()):
    orig = next(j["orig"] for j in jobs.values() if j["sheet"] == sheet and j["row"] == row) or 0
    worst = max((r for r in res if r["sheet"] == sheet and r["row"] == row), key=lambda r: float(r["need"]))
    flag = ""
    if h + 2 > orig:
        new = math.ceil(h + 2)
        heights.setdefault(f"xl/worksheets/sheet{sheet}.xml", {})[str(row)] = new
        flag = f"-> {new}"
    print(f"sheet{sheet} row {row}: orig={orig} need={h} ({worst['coord']}) {flag}")
json.dump(heights, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
