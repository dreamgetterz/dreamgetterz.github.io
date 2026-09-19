
/* Ericka's tracker: pure, tested calendar and bookkeeping functions. No treatment advice. */
(function(root){
'use strict';
const KEY='jedi-ericka-health-v1', DAY=86400000;
const copy=x=>JSON.parse(JSON.stringify(x,(k,v)=>{if(typeof v==='number'&&!Number.isFinite(v))throw Error('Non-finite numbers are not valid records.');return v;}));
const round=(n,p=1)=>Math.round((n+Number.EPSILON)*10**p)/10**p;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function today(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function ord(day){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Enter a valid date.');
 const [y,m,d]=day.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
 if(y<1900||y>2200||dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw Error('Enter a valid date.');
 return dt.getTime()/DAY;
}
const addDays=(day,n)=>new Date((ord(day)+n)*DAY).toISOString().slice(0,10);
const weekday=day=>new Date(ord(day)*DAY).getUTCDay();
function fmt(day,year=false){if(!day)return 'Not set';ord(day);const [y,m,d]=day.split('-').map(Number);return new Date(y,m-1,d,12).toLocaleDateString('en-US',{month:'short',day:'numeric',...(year?{year:'numeric'}:{})});}
function num(v,label,min=0,max=100000,nullable=false){
 if(v===null||v===undefined||(typeof v==='string'&&!v.trim())){if(nullable)return null;throw Error(`${label} is required.`);}
 if(typeof v==='boolean'||!['number','string'].includes(typeof v))throw Error(`${label} is invalid.`);
 const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error(`${label} must be between ${min} and ${max}.`);return n;
}
function str(v,label,max=160,optional=false){if(v==null&&optional)return '';if(typeof v!=='string'||(!optional&&!v.trim())||v.length>max)throw Error(`${label} is invalid.`);return v.trim();}
function date(v,end=today()){ord(v);if(v>end)throw Error('Future dates cannot be logged as completed.');return v;}
function id(v){if(typeof v!=='string'||!/^[-\w]{1,90}$/.test(v))throw Error('Invalid entry identifier.');return v;}
function defaults(){return {schema:1,owner:'ericka',revision:0,profile:{name:'Ericka',startWeight:155,startDate:'2026-09-10',goalWeight:130,targetDays:143,targetDate:'2027-01-31',planRevision:2,calorieTarget:null,proteinTarget:null},weights:[{date:'2026-09-10',weight:155},{date:'2026-09-19',weight:147}],foods:[],medications:[],doses:[],checkins:[]};}
const NUTRIENTS=['calories','protein','carbs','fat'];
function validate(raw,end=today()){
 if(!raw||raw.schema!==1||raw.owner!=='ericka')throw Error('Choose an Ericka tracker backup. Other profiles are not imported.');
 const s=copy(raw),p=s.profile;if(!p||p.name!=='Ericka')throw Error('This backup does not belong to Ericka.');
 p.startWeight=round(num(p.startWeight,'Starting weight',0.1,1500));p.startDate=date(p.startDate,end);
 p.goalWeight=p.goalWeight==null?null:round(num(p.goalWeight,'Goal weight',0.1,1500));
 if(p.goalWeight!==null&&p.goalWeight>=p.startWeight)throw Error('A weight-loss goal must be below the starting weight.');
 p.targetDays=num(p.targetDays,'Plan days',1,3650,true);if(p.targetDays!==null&&!Number.isInteger(p.targetDays))throw Error('Plan days must be a whole number.');
 if(p.targetDate){ord(p.targetDate);p.targetDays=ord(p.targetDate)-ord(p.startDate);if(p.targetDays<1||p.targetDays>3650)throw Error('Target date must be after the starting date, within 10 years.');}
 else p.targetDate=p.targetDays===null?null:addDays(p.startDate,p.targetDays);
 p.planRevision=Number.isInteger(p.planRevision)?p.planRevision:1;
 p.calorieTarget=num(p.calorieTarget,'Calorie target',1,15000,true);p.proteinTarget=num(p.proteinTarget,'Protein target',0.1,1000,true);
 for(const key of ['weights','foods','medications','doses','checkins'])if(!Array.isArray(s[key])||s[key].length>20000)throw Error(`Invalid ${key} history.`);
 function unique(key,arr){const set=new Set();for(const a of arr){const k=a[key];if(set.has(k))throw Error(`Duplicate ${key} in saved history.`);set.add(k);}}
 s.weights=s.weights.map(w=>({date:date(w.date,end),weight:round(num(w.weight,'Weight',0.1,1500))})).sort((a,b)=>a.date.localeCompare(b.date));unique('date',s.weights);
 if(s.weights.some(w=>w.date<p.startDate))throw Error('A weigh-in is dated before the starting weigh-in.');
 const start=s.weights.find(w=>w.date===p.startDate);if(!start||start.weight!==p.startWeight)throw Error('Starting weight and starting weigh-in must match.');
 s.foods=s.foods.map(f=>{
  const r={id:id(f.id),date:date(f.date,end),meal:str(f.meal,'Meal'),name:str(f.name,'Food name'),serving:str(f.serving,'Serving description',180,true),quantity:num(f.quantity,'Servings eaten',0.01,1000),source:str(f.source,'Nutrition source',400,true)};
  if(!['Breakfast','Lunch','Dinner','Snacks'].includes(r.meal))throw Error('Choose a meal.');
  for(const k of NUTRIENTS)r[k]=num(f[k],k,0,k==='calories'?50000:10000,true);
  return r;
 });unique('id',s.foods);
 s.medications=s.medications.map(m=>{
  const r={id:id(m.id),name:str(m.name,'Medication name'),amount:num(m.amount,'Recorded dose',0.0001,100000),unit:str(m.unit,'Dose unit'),startDate:date(m.startDate,end),days:m.days,active:!!m.active};
  if(!['mg','mcg','mL','units','tablet(s)','capsule(s)'].includes(r.unit))throw Error('Choose a dose unit.');
  if(!Array.isArray(r.days)||!r.days.length||r.days.some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(r.days).size!==r.days.length)throw Error('Choose at least one scheduled day.');
  r.days.sort((a,b)=>a-b);return r;
 });unique('id',s.medications);
 s.doses=s.doses.map(d=>{
  const r={id:id(d.id),medId:id(d.medId),scheduledDate:date(d.scheduledDate,end),actualDate:d.status==='taken'?date(d.actualDate,end):null,status:d.status,name:str(d.name,'Medication name'),amount:num(d.amount,'Recorded dose',0.0001,100000),unit:str(d.unit,'Dose unit')};
  const med=s.medications.find(m=>m.id===r.medId);if(!med)throw Error('Dose refers to a missing medication.');
  if(!['taken','skipped'].includes(r.status))throw Error('Choose taken or skipped.');
  if(r.actualDate&&r.actualDate<r.scheduledDate)throw Error('Use the actual scheduled slot; do not mark a future slot as taken.');
  if(!['mg','mcg','mL','units','tablet(s)','capsule(s)'].includes(r.unit))throw Error('Invalid saved dose unit.');
  // Name, dose, units, and scheduled day are a historical snapshot; edits never rewrite old logs.
  return r;
 });unique('id',s.doses);unique('slot',s.doses.map(d=>({slot:d.medId+'|'+d.scheduledDate})));
 s.checkins=s.checkins.map(c=>{date(c.date,end);if(!['Low','Okay','Good'].includes(c.feeling))throw Error('Invalid check-in.');return {date:c.date,feeling:c.feeling};});unique('date',s.checkins);
 s.revision=Number.isSafeInteger(s.revision)&&s.revision>=0?s.revision:0;
 return s;
}
function metrics(s,end=today()){
 const p=s.profile,pts=[...s.weights].sort((a,b)=>a.date.localeCompare(b.date)),last=pts.at(-1),current=last?.weight??p.startWeight;
 const lost=round(p.startWeight-current),remain=p.goalWeight===null?null:round(Math.max(0,current-p.goalWeight)),total=p.goalWeight===null?null:round(p.startWeight-p.goalWeight);
 const pct=total===null?null:clamp(lost/total*100,0,100),deadline=p.goalWeight!==null&&p.targetDays!==null?addDays(p.startDate,p.targetDays):null;
 const days=ord(end)-ord(p.startDate),remainingDays=deadline?Math.max(0,ord(deadline)-ord(end)):null;
 // Do not project from a single early drop. 3 distinct weigh-ins over 14+ days is a display rule, not clinical validation.
 const recent=pts.filter(w=>ord(last.date)-ord(w.date)<=28);let avg=null,projected=null;
 if(recent.length>=3&&ord(last.date)-ord(recent[0].date)>=14&&ord(end)-ord(last.date)<=14){
  const xs=recent.map(w=>ord(w.date)-ord(recent[0].date)),ys=recent.map(w=>w.weight),mx=xs.reduce((a,b)=>a+b)/xs.length,my=ys.reduce((a,b)=>a+b)/ys.length;
  const denom=xs.reduce((a,x)=>a+(x-mx)**2,0),slope=xs.reduce((a,x,i)=>a+(x-mx)*(ys[i]-my),0)/denom;avg=-slope*7;
  if(avg>0&&remain>0){const n=Math.ceil(remain*7/avg);if(n<=3650){const d=addDays(last.date,n);if(d>=end)projected=d;}}
 }
 const prior=pts.filter(w=>ord(last.date)-ord(w.date)>=7&&ord(last.date)-ord(w.date)<=14).at(-1);
 const planPace=total!==null&&p.targetDays?total*7/p.targetDays:null;
 const remainingPace=remain!==null&&remainingDays>0?remain*7/remainingDays:null;
 const expected=p.goalWeight!==null&&p.targetDays?Math.max(p.goalWeight,p.startWeight-total*clamp(days/p.targetDays,0,1)):null;
 const paceStatus=remain===0?'Goal reached':deadline&&end>deadline?'Target date passed':avg===null?'Building your trend':current<expected-0.5?'Below the planned weight line':current>expected+0.5?'Above the planned weight line':'Near the planned weight line';
 return {current,lastDate:last?.date,lost,remain,total,pct,days,deadline,remainingDays,avg,projected,planPace,remainingPace,expected,paceStatus,weekChange:prior?round(prior.weight-current):null,weekSpan:prior?ord(last.date)-ord(prior.date):null,goalStatus:p.goalWeight===null?'Goal not set':remain===0?'Goal reached':deadline&&end>deadline?'Target date passed':'Your chosen goal',points:pts};
}
function foodTotals(s,day){
 const rows=s.foods.filter(f=>f.date===day),out={count:rows.length};
 for(const k of NUTRIENTS){const known=rows.filter(f=>f[k]!==null);out[k]={value:round(known.reduce((v,f)=>v+f[k]*f.quantity,0)),known:known.length,missing:rows.length-known.length,complete:known.length===rows.length};}
 return out;
}
function totalLabel(t,k){const n=t[k];if(!t.count||!n.known)return '—';return `${n.value}${n.missing?' +':''}`;}
function upsertWeight(s,entry,end=today()){
 date(entry.date,end);const w=round(num(entry.weight,'Weight',0.1,1500));if(entry.date<s.profile.startDate)throw Error('Date is before the starting weigh-in.');
 s.weights=s.weights.filter(x=>x.date!==entry.date);s.weights.push({date:entry.date,weight:w});s.weights.sort((a,b)=>a.date.localeCompare(b.date));if(entry.date===s.profile.startDate)s.profile.startWeight=w;
}
function dueDate(m,end=today()){
 for(let i=0;i<7;i++){const d=addDays(end,-i);if(d>=m.startDate&&m.days.includes(weekday(d)))return d;}return null;
}
function nextDate(m,s,end=today()){
 for(let i=0;i<14;i++){const d=addDays(end,i);if(d>=m.startDate&&m.days.includes(weekday(d))&&!s.doses.some(r=>r.medId===m.id&&r.scheduledDate===d))return d;}return null;
}
function upsertDose(s,d,end=today()){
 const old=d.id?s.doses.find(x=>x.id===d.id):null,med=s.medications.find(m=>m.id===d.medId);
 if(!med)throw Error('Choose a medication.');date(d.scheduledDate,end);
 if(!old||old.scheduledDate!==d.scheduledDate||old.medId!==d.medId){if(d.scheduledDate<med.startDate||!med.days.includes(weekday(d.scheduledDate)))throw Error('Choose a date on this medication’s recorded schedule.');}
 const conflict=s.doses.find(x=>x.medId===d.medId&&x.scheduledDate===d.scheduledDate&&x.id!==d.id);if(conflict)throw Error('That scheduled dose is already logged. Edit the existing record instead.');
 const row={...d,...(old?{name:old.name,amount:old.amount,unit:old.unit}:{name:med.name,amount:med.amount,unit:med.unit})};
 s.doses=s.doses.filter(x=>x.id!==d.id);s.doses.push(row);
}
const api={KEY,DAY,copy,round,clamp,today,ord,addDays,weekday,fmt,num,str,date,defaults,validate,metrics,foodTotals,totalLabel,upsertWeight,dueDate,nextDate,upsertDose,NUTRIENTS};
root.ErickaCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
