import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const outputDir = path.join(repo, 'outputs/01a151d0-9d92-7900-b5be-31a811469c9d');
const previews = path.join(outputDir, '_previews');
const data = JSON.parse(await fs.readFile(path.join(here, 'data.json'), 'utf8'));
const outputPath = path.join(outputDir, '풀로세움_효과와스킬_분류.xlsx');
const wb = Workbook.create();
const mergeLog = [];
const shades = ['#E6F0E7', '#F4E5E5', '#E8EAF4', '#F5EDD9', '#E1EEEF', '#EEE7DE', '#EBE3F1'];
const col = n => String.fromCharCode(65 + n);
const displayUnits = text => [...String(text ?? '')].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0);

function repeated(sheet, rows, start, columns) {
  for (const c of columns) {
    let i = 0;
    while (i < rows.length) {
      let j = i + 1;
      const key = JSON.stringify(rows[i].slice(0, c + 1));
      while (j < rows.length && JSON.stringify(rows[j].slice(0, c + 1)) === key) j++;
      if (j - i > 1) {
        sheet.getRange(`${col(c)}${start + i + 1}:${col(c)}${start + j - 1}`).clear({ applyTo: 'contents' });
        const address = `${col(c)}${start + i}:${col(c)}${start + j - 1}`;
        sheet.mergeCells(address);
        sheet.getRange(address).format.verticalAlignment = 'center';
        sheet.getRange(address).format.horizontalAlignment = 'center';
        mergeLog.push({ sheet: sheet.name, address });
      }
      i = j;
    }
  }
}

function makeSheet(name, title, headers, rows, widths, opts = {}) {
  const sheet = wb.worksheets.add(name);
  const header = opts.rules ? 8 : 5;
  const start = header + 1;
  const last = start + rows.length - 1;
  const endCol = col(headers.length - 1);
  const area = sheet.getRange(`A1:${endCol}${last}`);
  area.format.font = { name: 'Malgun Gothic', size: 11, color: '#25333D' };
  area.format.verticalAlignment = 'center';
  area.format.wrapText = true;
  sheet.showGridLines = false;
  sheet.tabColor = opts.color || '#355A70';
  sheet.getRange(`A2:${endCol}2`).merge();
  sheet.getRange('A2').values = [[title]];
  sheet.getRange(`A2:${endCol}2`).format.font = { name: 'Malgun Gothic', size: 16, bold: true, color: '#193849' };
  sheet.getRange(`A2:${endCol}2`).format.rowHeight = 30;
  sheet.getRange(`A3:${endCol}3`).format.borders = { bottom: { style: 'thin', color: '#547787' } };
  if (opts.rules) {
    const rules = [
      ['버프·디버프', '각 중첩 5턴. 중첩별 독립 만료. 교체 중에도 시간 진행'],
      ['상태이상', '교체 후 유지. 대기 중에도 시간 진행'],
      ['준비 효과', '교체 시 제거. 보호막은 한 번 방어 후 잔량과 무관하게 제거']
    ];
    rules.forEach(([label, text], i) => {
      sheet.getRange(`A${i + 4}:C${i + 4}`).merge();
      sheet.getRange(`D${i + 4}:${endCol}${i + 4}`).merge();
      sheet.getRange(`A${i + 4}`).values = [[label]];
      sheet.getRange(`D${i + 4}`).values = [[text]];
      sheet.getRange(`A${i + 4}:C${i + 4}`).format.font.bold = true;
      sheet.getRange(`A${i + 4}:${endCol}${i + 4}`).format.rowHeight = 23;
    });
  }
  sheet.getRange(`A${header}:${endCol}${header}`).values = [headers];
  sheet.getRange(`A${header}:${endCol}${header}`).format = {
    fill: '#244B61',
    font: { name: 'Malgun Gothic', size: 11, bold: true, color: '#FFFFFF' },
    horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true,
    rowHeight: 30,
    borders: { insideVertical: { style: 'thin', color: '#FFFFFF' } }
  };
  sheet.getRange(`A${start}:${endCol}${last}`).values = rows;
  widths.forEach((width, c) => { sheet.getRange(`${col(c)}1:${col(c)}${last}`).format.columnWidth = width; });
  let group = -1, previous;
  rows.forEach((row, i) => {
    if (row[0] !== previous) { previous = row[0]; group++; }
    const r = start + i;
    sheet.getRange(`A${r}:C${r}`).format.fill = shades[group % shades.length];
    sheet.getRange(`A${r}:C${r}`).format.font.bold = true;
    if (i === 0 || row[0] !== rows[i - 1][0]) {
      sheet.getRange(`A${r}:${endCol}${r}`).format.borders = { top: { style: 'thin', color: '#9BAFB8' } };
    }
    const lines = Math.max(...row.map((v, c) => Math.ceil(displayUnits(v) / Math.max(widths[c] - 3, 6))));
    sheet.getRange(`A${r}:${endCol}${r}`).format.rowHeight = Math.max(34, Math.min(110, lines * 16 + 10));
  });
  if (opts.merges) repeated(sheet, rows, start, opts.merges);
  sheet.freezePanes.freezeRows(header);
  sheet.freezePanes.freezeColumns(opts.frozenColumns || 2);
  if (opts.decisionColumn !== undefined) {
    const letter = col(opts.decisionColumn);
    sheet.getRange(`${letter}${start}:${letter}${last}`).format.fill = '#FFF2CC';
    sheet.getRange(`${letter}${start}:${letter}${last}`).dataValidation = { rule: { type: 'list', values: ['보류', '유지', '통합', '삭제'] } };
  }
  return { sheet, start, last, endCol };
}

const effects = makeSheet('효과 분류', '풀로세움 효과 분류',
  ['대분류', '중분류', '소분류', '효과명', '설명', '정화 해제', '지속 방식', '기간(턴)', '교체 시', '소모·비고'],
  data.effects, [11, 16, 14, 18, 49, 12, 13, 10, 21, 37],
  { rules: true, merges: [0, 1, 2], frozenColumns: 4, color: '#244B61' });
effects.sheet.getRange(`H${effects.start}:H${effects.last}`).setNumberFormat('0');
effects.sheet.getRange(`F${effects.start}:I${effects.last}`).format.horizontalAlignment = 'center';
effects.sheet.getRange(`D${effects.start}:D${effects.last}`).format.font.bold = true;

const skills = makeSheet('스킬 분류', '풀로세움 스킬 분류',
  ['대표 분류', '세부 분류', '스킬·처리', '설명', '지속·혼합 효과', '표시', '예시', '검토 사항'],
  data.skills, [17, 18, 20, 52, 42, 26, 35, 40],
  { merges: [0], frozenColumns: 3, color: '#4D7188' });

const review = makeSheet('검토 대기', '검토할 용어와 행동 취소',
  ['구분', '항목', '뜻', '기존 예시', '분류 후보', '정할 내용', '내 결정'],
  data.review, [16, 23, 59, 51, 31, 55, 12],
  { merges: [0], decisionColumn: 6, frozenColumns: 2, color: '#B58B37' });

const remaining = makeSheet('미분류·잔여', '분류 밖에 남은 항목',
  ['구분', '항목', '설명', '남는 이유', '정리 후보', '내 결정'],
  data.remaining, [19, 27, 58, 61, 55, 12],
  { merges: [0], decisionColumn: 5, frozenColumns: 2, color: '#8A737C' });

const buffs = data.effects.filter(r => ['버프', '디버프'].includes(r[0]));
assert.equal(buffs.length, 10);
assert(buffs.every(r => r[7] === 5 && r[8] === '유지·턴 진행'));
assert(data.effects.filter(r => r[0] === '상태이상').every(r => r[8].includes('유지') && r[8].includes('턴 진행')));
assert(data.effects.filter(r => r[0] === '준비 효과').every(r => r[8] === '제거'));
assert(!data.effects.some(r => r[3] === '반사'));
assert(!data.effects.some(r => ['기절', '마비', '얼음', '매혹'].includes(r[3])));
assert.equal(data.effects.filter(r => r[1] === '개인 환경').length, 5);
for (const term of ['전환', '제거', '복사', '소비', '모으기', '지연 공격', '그 턴 버티기', '기절', '마비', '얼음', '매혹']) {
  assert(data.review.some(r => r[1] === term), `Missing review item: ${term}`);
}
assert(!mergeLog.some(m => m.sheet === '효과 분류' && !/^[ABC]/.test(m.address)));
assert(mergeLog.length > 15);
const exportedValues = effects.sheet.getRange(`D${effects.start}:E${effects.last}`).values;
assert(exportedValues.every((r, i) => r[0] === data.effects[i][3] && r[1] === data.effects[i][4]));

wb.recalculate();
console.log((await wb.inspect({ kind: 'table', range: `효과 분류!D${effects.start}:J${effects.start + 2}`, include: 'values', tableMaxRows: 3, tableMaxCols: 7, maxChars: 1000 })).ndjson);
console.log((await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#SPILL!', options: { useRegex: true, maxResults: 20 }, maxChars: 700 })).ndjson);
await fs.mkdir(previews, { recursive: true });
const renderRanges = [
  ['효과 분류', `A1:J24`, 'effects-1'],
  ['효과 분류', `A25:J42`, 'effects-2'],
  ['효과 분류', `A43:J${effects.last}`, 'effects-3'],
  ['스킬 분류', `A1:H16`, 'skills-1'],
  ['스킬 분류', `A17:H${skills.last}`, 'skills-2'],
  ['검토 대기', `A1:G15`, 'review-1'],
  ['검토 대기', `A16:G${review.last}`, 'review-2'],
  ['미분류·잔여', `A1:F${remaining.last}`, 'remaining']
];
for (const [sheetName, range, name] of renderRanges) {
  const blob = await wb.render({ sheetName, range, scale: 1.25, format: 'png' });
  await fs.writeFile(path.join(previews, `${name}.png`), new Uint8Array(await blob.arrayBuffer()));
}
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputPath);
await fs.writeFile(path.join(previews, 'validation.json'), JSON.stringify({
  sheets: ['효과 분류', '스킬 분류', '검토 대기', '미분류·잔여'],
  rows: { effects: data.effects.length, skills: data.skills.length, review: data.review.length, remaining: data.remaining.length },
  mergedGroups: mergeLog, outputPath
}, null, 2));
console.log(JSON.stringify({ outputPath, effects: data.effects.length, skills: data.skills.length, review: data.review.length, remaining: data.remaining.length, mergedGroups: mergeLog.length }));
