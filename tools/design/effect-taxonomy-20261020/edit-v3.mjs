import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const work = path.join(root, 'outputs/01a151d0-9d92-7900-b5be-31a811469c9d/_previews');
const validating=process.argv.includes('--validate');
const holdInspect=process.argv.includes('--hold-inspect');
const holding=process.argv.includes('--hold');
const v4=process.argv.includes('--v4');
const v4Inspect=process.argv.includes('--v4-inspect');
const source = v4||v4Inspect ? path.join(work,'v4-source.xlsx') : holdInspect ? 'C:/Users/soosa/OneDrive/Desktop/풀로세움_효과와스킬_분류_v3.xlsx' : holding ? path.join(work,'hold-source.xlsx') : validating ? path.join(work,'../풀로세움_효과와스킬_분류_v3.xlsx') : path.join(work, 'v3-source.xlsx');
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
if (v4Inspect) {
  for (const [name,range,label] of [['효과 분류','D29:J36','effects'],['스킬 분류','B8:H14','skills']]) {
    const image=await workbook.render({sheetName:name,range,scale:1,format:'png'});
    await fs.writeFile(path.join(work,`v4-before-${label}.png`),new Uint8Array(await image.arrayBuffer()));
  }
  console.log('Affected source areas rendered; no workbook mutation.');
} else if (v4) {
  const plan=JSON.parse(await fs.readFile(path.join(here,'v4-plan.json'),'utf8'));
  for (const [name,section] of Object.entries(plan.sheets)) {
    const target=section.new ? workbook.worksheets.add(name) : workbook.worksheets.getItem(name);
    const template=workbook.worksheets.getItem(section.template);
    const col=String.fromCharCode(64+section.cols);
    if (section.new) {
      target.getRange(`A1:${col}5`).copyFrom(template.getRange(`A1:${col}5`),'all');
      target.mergeCells(`A2:${col}2`);
      target.getRange(`A6:${col}${5+section.rows.length}`).format.wrapText=true;
      target.getRange(`A6:${col}${5+section.rows.length}`).format.font={name:'Malgun Gothic',size:11};
    } else {
      const sourceMerges=plan.sourceMerges[name];
      for (const merge of sourceMerges) if (parseInt(merge.split(':')[0].replace(/[A-Z]/g,''),10)>=section.start) target.unmergeCells(merge);
      target.getRange(`A${section.start}:${col}60`).clear({applyTo:'contents'});
    }
    target.getRange(`A${section.start}:${col}${section.start+section.rows.length-1}`).values=section.rows.map(r=>r.v);
    for (const merge of section.merges) target.mergeCells(merge);
    for (const [address,value] of Object.entries(section.edits)) target.getRange(address).values=[[value]];
    for (const [r,h] of Object.entries(section.heights)) target.getRange(`A${r}:${col}${r}`).format.rowHeight=h;
  }
  workbook.recalculate();
  console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:10},maxChars:300})).ndjson);
  await (await SpreadsheetFile.exportXlsx(workbook)).save(path.join(work,'v4-authored.xlsx'));
  console.log('v4 artifact-authored changes saved.');
} else if (holdInspect) {
  await fs.copyFile(source,path.join(work,'hold-source.xlsx'));
  const image=await workbook.render({sheetName:'검토 대기',range:'B5:G12',scale:1,format:'png'});
  await fs.writeFile(path.join(work,'hold-before.png'),new Uint8Array(await image.arrayBuffer()));
  console.log('Source snapshot and affected-area preview saved. No edit.');
} else if (holding) {
  const review=workbook.worksheets.getItem('검토 대기');
  const moved=review.getRange('A10:G10').values[0];
  if (moved[1]!=='모으기') throw new Error('Source row changed; inspect the latest source.');
  for (const ref of ['A6:A12','A13:A16','A17:A24','A25:A36']) review.unmergeCells(ref);
  review.getRange('A10:G35').values=review.getRange('A11:G36').values;
  review.getRange('A36:G36').clear({applyTo:'contents'});
  for (const ref of ['A6:A11','A12:A15','A16:A23','A24:A35']) review.mergeCells(ref);
  const hold=workbook.worksheets.add('보류');
  hold.getRange('A2').copyFrom(review.getRange('A2'),'all');
  hold.mergeCells('A2:G2');
  hold.getRange('A2').values=[['보류한 처리와 스킬']];
  hold.getRange('A5:G5').copyFrom(review.getRange('A5:G5'),'all');
  hold.getRange('A6:G6').copyFrom(review.getRange('A10:G10'),'all');
  moved[0]='처리 용어';
  moved[5]='확정 고유스킬에 필요할 때 재검토';
  moved[6]='보류';
  hold.getRange('A6:G6').values=[moved];
  workbook.recalculate();
  await (await SpreadsheetFile.exportXlsx(workbook)).save(path.join(work,'hold-authored.xlsx'));
  console.log('One review item moved to the separate hold sheet; original-package preservation follows.');
} else if (validating) {
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
