import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const desktop = 'C:/Users/soosa/OneDrive/Desktop/풀로세움_효과와스킬_분류.xlsx';
const work = path.join(repo, 'outputs/01a151d0-9d92-7900-b5be-31a811469c9d/_previews');
const source = path.join(work, 'desktop-source.xlsx');
const revised = path.join(work, 'desktop-revised.xlsx');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const inspecting = process.argv.includes('--inspect');
await fs.mkdir(work, { recursive: true });
if (inspecting) {
  const bytes = await fs.readFile(desktop);
  await fs.writeFile(source, bytes);
  await fs.writeFile(path.join(work, 'desktop-source.sha256'), sha(bytes));
}
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const sheet = workbook.worksheets.getItem('효과 분류');
assert.equal(sheet.getRange('D22').values[0][0], '감전');
assert.equal(sheet.getRange('D23').values[0][0], '빙결');
assert.equal(sheet.getRange('D12').values[0][0], '치명');
assert.equal(sheet.getRange('D13').values[0][0], '집중');
assert.equal(sheet.getRange('D26').values[0][0], '속박');
assert(sheet.getRange('F14:F18').values.every(r => r[0] === '불가'));
if (inspecting) {
  const image = await workbook.render({ sheetName: '효과 분류', range: 'D9:J30', scale: 1.25, format: 'png' });
  await fs.writeFile(path.join(work, 'desktop-before.png'), new Uint8Array(await image.arrayBuffer()));
  console.log((await workbook.inspect({ kind: 'table', range: '효과 분류!C19:J23', tableMaxRows: 5, tableMaxCols: 8, maxChars: 1800 })).ndjson);
  console.log('Source snapshot saved. No workbook edit performed.');
} else {
  const expected = (await fs.readFile(path.join(work, 'desktop-source.sha256'), 'utf8')).trim();
  assert.equal(sha(await fs.readFile(desktop)), expected, 'Desktop workbook changed since inspection. Inspect again before editing.');
  sheet.unmergeCells('C19:C21');
  sheet.unmergeCells('C22:C30');
  sheet.getRange('C23').copyFrom(sheet.getRange('C22'), 'all');
  sheet.getRange('C22').clear({ applyTo: 'contents' });
  sheet.getRange('C23').values = [['비데미지']];
  sheet.mergeCells('C19:C22');
  sheet.mergeCells('C23:C30');
  sheet.getRange('E22').values = [['약한 피해를 주며, 지속 중 확률로 마비를 일으킨다. 마비의 행동 취소는 검토 대기다.']];
  // Restore existing durations; do not turn stack thresholds into fixed lifetimes.
  const durationEdits = {
    H19: 3,
    H20: '고정 없음',
    J20: '최대 5겹. 2턴 동안 재부여가 없으면 매 턴 1겹씩 감소',
    H21: 3,
    H22: 2,
    J22: '걸린 턴 + 이후 2턴. 마비 발동 시 소비하는 기존 안',
    H23: '고정 없음',
    J23: '2턴 동안 재부여가 없으면 매 턴 1겹씩 감소. 불 공격에도 해제',
    H24: 1,
    H25: 2,
    H26: 2,
    H27: 1,
    H28: 2,
    H29: '이번 턴',
    H31: '고정 없음',
    J31: '다음 턴부터 턴 끝마다 1겹 증가. 3겹 도달 시 발동·소모. 불 공격에 제거',
    H32: 3,
    H33: 2,
    H34: 2,
    H35: 3,
    H41: 2,
    H43: 3,
    H44: 3,
    H45: 3,
  };
  for (const [address, value] of Object.entries(durationEdits)) {
    sheet.getRange(address).values = [[value]];
  }
  workbook.recalculate();
  assert.equal(sheet.getRange('C19').values[0][0], '데미지');
  assert.equal(sheet.getRange('C23').values[0][0], '비데미지');
  assert.equal(sheet.getRange('D22').values[0][0], '감전');
  const image = await workbook.render({ sheetName: '효과 분류', range: 'C19:J30', scale: 1.25, format: 'png' });
  await fs.writeFile(path.join(work, 'desktop-after.png'), new Uint8Array(await image.arrayBuffer()));
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(revised);
  console.log((await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?', options: { useRegex: true, maxResults: 20 }, maxChars: 400 })).ndjson);
  console.log(JSON.stringify({ revised, sourceSha256: expected, changedCells: ['C22', 'C23', 'E22', ...Object.keys(durationEdits)].map(a => `효과 분류!${a}`), mergeChange: ['C19:C21 -> C19:C22', 'C22:C30 -> C23:C30'] }));
}
