import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const work = path.join(root, 'outputs/01a151d0-9d92-7900-b5be-31a811469c9d/_previews');
const validating=process.argv.includes('--validate');
const source = validating ? path.join(work,'../풀로세움_효과와스킬_분류_v3.xlsx') : path.join(work, 'v3-source.xlsx');
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
if (validating) {
  for (const [sheetName,range,label] of [
    ['효과 분류','A19:J33','states'],
    ['효과 분류','A34:J49','other-effects'],
    ['스킬 분류','A13:H19','skill-updates'],
    ['스킬 분류','A27:H28','skill-additions'],
    ['검토 대기','A25:G30','review-a'],
    ['검토 대기','A31:G36','review-b'],
  ]) {
    const only=process.argv.find(x=>x.startsWith('--only='))?.slice(7);
    if (only && label!==only) continue;
    const image=await workbook.render({sheetName,range,scale:1,format:'png'});
    await fs.writeFile(path.join(work,`v3-${label}.png`),new Uint8Array(await image.arrayBuffer()));
  }
  console.log((await workbook.inspect({kind:'table',range:'효과 분류!C25:H33',tableMaxRows:9,tableMaxCols:6,maxChars:2300})).ndjson);
  console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:20},maxChars:500})).ndjson);
  console.log('Final preserved v3 rendered and inspected; no workbook mutation.');
} else if (process.argv.includes('--inspect')) {
  console.log((await workbook.inspect({kind:'sheet',include:'id,name',maxChars:1200})).ndjson);
  const image = await workbook.render({sheetName:'효과 분류',range:'C19:J37',scale:1,format:'png'});
  await fs.writeFile(path.join(work,'v3-before.png'),new Uint8Array(await image.arrayBuffer()));
  console.log('Source rendered; workbook unchanged.');
} else {
  const plan = JSON.parse(await fs.readFile(path.join(here,'v3-plan.json'),'utf8'));
  const sheet = workbook.worksheets.getItem('효과 분류');
  for (const merge of plan.effects.removeMerges) sheet.unmergeCells(merge);
  sheet.getRange('A9:J52').clear({applyTo:'contents'});
  sheet.getRange(`A9:J${plan.effects.lastRow}`).values = plan.effects.rows;
  for (const merge of plan.effects.addMerges) sheet.mergeCells(merge);
  for (const [row,height] of Object.entries(plan.effects.rowHeights)) sheet.getRange(`A${row}:J${row}`).format.rowHeight = height;
  for (const [name, section, cols] of [['스킬 분류',plan.skills,'H'],['검토 대기',plan.review,'G']]) {
    const target=workbook.worksheets.getItem(name);
    for (const [address,value] of Object.entries(section.edits)) target.getRange(address).values=[[value]];
    for (let i=0;i<section.extraRows.length;i++) {
      const r=section.extraStart+i;
      target.getRange(`A${r}:${cols}${r}`).copyFrom(target.getRange(name==='스킬 분류'?'A18:H18':'A24:G24'),'all');
      target.getRange(`A${r}:${cols}${r}`).values=[section.extraRows[i]];
    }
    for (const merge of section.addMerges) target.mergeCells(merge);
    for (const [row,height] of Object.entries(section.rowHeights)) target.getRange(`A${row}:${cols}${row}`).format.rowHeight=height;
  }
  workbook.recalculate();
  console.log((await workbook.inspect({kind:'table',range:'효과 분류!C25:H28',tableMaxRows:4,tableMaxCols:6,maxChars:1500})).ndjson);
  console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:20},maxChars:500})).ndjson);
  const output=await SpreadsheetFile.exportXlsx(workbook);
  await output.save(path.join(work,'v3-authored.xlsx'));
  console.log('Artifact-authored edits exported; source package preservation follows.');
}
