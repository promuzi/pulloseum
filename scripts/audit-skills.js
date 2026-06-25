/* ind.* 개체 고유 스킬 밸런스 감사 — 이상치/논리오류 탐지(읽기 전용). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const SKILL_LIB = eval('(' + html.match(/const SKILL_LIB = (\{[\s\S]*?\n\});/)[1] + ')');

const ind = Object.keys(SKILL_LIB).filter(k => /^ind\.[a-z_]+\.[gme]$/.test(k))
  .map(k => Object.assign({ id:k, stage:k.slice(-1) }, SKILL_LIB[k]));
console.log('ind 스킬:', ind.length);

function stat(arr){ const a=arr.slice().sort((x,y)=>x-y); const m=a.reduce((s,v)=>s+v,0)/a.length;
  const sd=Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/a.length); return {n:a.length,min:a[0],max:a[a.length-1],mean:+m.toFixed(1),sd:+sd.toFixed(1)}; }

// 단계별 power 분포(공격/흡혈만)
['g','m','e'].forEach(st=>{
  const p = ind.filter(s=>s.stage===st && s.power>0).map(s=>s.power);
  console.log(`[${st}] power`, JSON.stringify(stat(p)));
});

const flags = { degenerate:[], costHigh:[], costLow:[], powerOutlierHi:[], powerOutlierLo:[], logic:[], gradeOdd:[] };
const pstat = {}; ['g','m','e'].forEach(st=>{ const p=ind.filter(s=>s.stage===st&&s.power>0).map(s=>s.power); pstat[st]=stat(p); });

ind.forEach(s=>{
  const hasEff = s.power>0||s.heal>0||s.guardMult!=null||s.selfBuff||s.enemyDebuff||s.dot||s.cleanse||s.energyGain;
  // 논리오류
  if(s.power>0 && !(s.kind==='attack'||s.kind==='drain'||s.kind==='elemental')) flags.logic.push(s.id+' power+'+s.kind);
  if(s.power!=null && s.power<=0) flags.logic.push(s.id+' power<=0');
  if(s.selfBuff && !(s.selfBuff.pct>0&&s.selfBuff.turns>0)) flags.logic.push(s.id+' badSelfBuff');
  if(s.enemyDebuff && !(s.enemyDebuff.pct>0&&s.enemyDebuff.turns>0)) flags.logic.push(s.id+' badEnemyDebuff');
  if(s.heal!=null && !(s.heal>0)) flags.logic.push(s.id+' heal<=0');
  if(!hasEff) flags.logic.push(s.id+' NO-EFFECT');
  // degenerate: 공격 없음 + 단일 약버프만(heal/guard/cleanse/energy/debuff 전무)
  if(!s.power && !s.heal && s.guardMult==null && !s.enemyDebuff && !s.dot && !s.cleanse && !s.energyGain && s.selfBuff)
    flags.degenerate.push(s.id+' ('+s.selfBuff.stat+'+'+Math.round(s.selfBuff.pct*100)+'% only)');
  // cost vs power
  if(s.power>=150 && s.cost<3) flags.costLow.push(s.id+' p'+s.power+' c'+s.cost);
  if(s.power>0 && s.power<=90 && s.cost>=3) flags.costHigh.push(s.id+' p'+s.power+' c'+s.cost);
  // power outlier (단계 평균±2sd)
  if(s.power>0){ const st=pstat[s.stage]; if(s.power>st.mean+2*st.sd) flags.powerOutlierHi.push(s.id+' p'+s.power+' (μ'+st.mean+')');
    if(s.power<st.mean-2*st.sd) flags.powerOutlierLo.push(s.id+' p'+s.power+' (μ'+st.mean+')'); }
  // grade 이상: e인데 power<140 + S/A, 또는 g/m인데 S
  if((s.stage==='g'||s.stage==='m') && s.grade==='S') flags.gradeOdd.push(s.id+' '+s.grade);
});

Object.keys(flags).forEach(k=>{
  console.log(`\n## ${k} (${flags[k].length})`);
  flags[k].slice(0,40).forEach(x=>console.log('  '+x));
});
