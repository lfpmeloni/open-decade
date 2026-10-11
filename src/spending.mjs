import {D,sum,warning,assert,hash,days} from './core.mjs';
import {covered,cashflow} from './picture.mjs';
const spendingKinds=['spending','interest'];
function allocated(s,t){
 const factor=s.resolve(t.accountId).ownership;
 if(t.categorySplits)return t.categorySplits.map(x=>({categoryId:s.resolve(x.categoryId).id,amount:new D(x.amount).times(factor)}));
 // A confirmed refund uses the original confirmed proportions if no split is supplied.
 if(t.refundOf){const original=s.resolve(t.refundOf);if(original.categorySplits)return original.categorySplits.map(x=>({categoryId:s.resolve(x.categoryId).id,amount:new D(t.amount).times(new D(x.amount).div(original.amount)).times(factor)}));}
 return [{categoryId:null,amount:new D(t.amount).times(factor)}];
}
export function spending(s,o,warnings){
 const ts=s.active.filter(t=>t.kind==='transaction'&&t.date>=o.from&&t.date<=o.to),categories=new Map(),months=[];
 const flowWarnings=[];cashflow(s,o,flowWarnings);warnings.push(...flowWarnings);
 for(const t of ts.filter(t=>spendingKinds.includes(t.classification))){
  if(new D(t.amount).gt(0)&&!t.refundOf)warnings.push(warning('UNMATCHED_REFUND',t.id));
  for(const x of allocated(s,t)){
   const category=x.categoryId?s.resolve(x.categoryId):null,key=t.currency+'|'+(x.categoryId??'unknown');
   const row=categories.get(key)??{currency:t.currency,categoryId:x.categoryId,name:category?.name??'Unclassified spending',nature:category?.nature??'unknown',netSpending:new D(0),essential:new D(0),discretionary:new D(0),exceptional:new D(0),recurring:new D(0),transactionIds:[]};
   const spend=x.amount.negated();row.netSpending=row.netSpending.plus(spend);if(['essential','discretionary'].includes(row.nature))row[row.nature]=row[row.nature].plus(spend);if(t.exceptional)row.exceptional=row.exceptional.plus(spend);if(t.recurringId)row.recurring=row.recurring.plus(spend);row.transactionIds.push(t.id);categories.set(key,row);
   if(!category||category.nature==='unknown')warnings.push(warning('MISSING_CATEGORY',t.id));
  }
 }
 let month=o.from.slice(0,7);const last=o.to.slice(0,7);
 while(month<=last){
  assert(months.length<1200,'INPUT_LIMIT','Spending window exceeds 100 years.');
  const first=month+'-01',next=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),1)).toISOString().slice(0,10),end=new Date(Date.parse(next)-86400000).toISOString().slice(0,10);
  const fullMonth=o.from<=first&&o.to>=end,accounts=s.active.filter(r=>r.kind==='account'&&r.date<=end),complete=fullMonth&&accounts.length>0&&accounts.every(a=>covered(s,a.id,first,end));
  const current=ts.filter(t=>t.date.slice(0,7)===month),perCurrency={};
  for(const currency of new Set([...current.map(t=>t.currency),...accounts.map(a=>a.currency)])){
   const part=current.filter(t=>t.currency===currency),income=sum(part.filter(t=>t.classification==='income').map(t=>new D(t.amount).times(s.resolve(t.accountId).ownership))),expense=sum(part.filter(t=>spendingKinds.includes(t.classification)).map(t=>new D(t.amount).times(s.resolve(t.accountId).ownership))).negated();
   const unresolved=part.some(t=>t.classification==='unknown'||(t.classification==='spending'&&new D(t.amount).gt(0)&&!t.refundOf))||flowWarnings.some(w=>['UNMATCHED_TRANSFER','UNCLASSIFIED_FLOW'].includes(w.code)&&part.some(t=>t.id===w.recordId));
   const rate=complete&&!unresolved&&income.gt(0)?income.minus(expense).div(income):null;
   perCurrency[currency]={income,netSpending:expense,savingsRate:rate,complete:complete&&!unresolved};
  }
  if(!complete)warnings.push({code:'INCOMPLETE_MONTH',month});months.push({month,perCurrency});month=next.slice(0,7);
 }
 const budgets=s.active.filter(r=>r.kind==='budget'&&r.from>=o.from&&r.through<=o.to).map(b=>{
  const rows=ts.filter(t=>t.currency===b.currency&&spendingKinds.includes(t.classification)&&t.date>=b.from&&t.date<=b.through);
  const spent=sum(rows.flatMap(t=>allocated(s,t).filter(x=>x.categoryId===s.resolve(b.categoryId).id).map(x=>x.amount.negated())));
  const budgetAccounts=s.active.filter(r=>r.kind==='account'&&r.currency===b.currency);
  const complete=budgetAccounts.length>0&&budgetAccounts.every(a=>covered(s,a.id,b.from,b.through))&&!rows.some(t=>allocated(s,t).some(x=>!x.categoryId)||(new D(t.amount).gt(0)&&!t.refundOf))&&!ts.some(t=>t.currency===b.currency&&t.classification==='unknown'&&t.date>=b.from&&t.date<=b.through);
  if(!complete)warnings.push(warning('INCOMPLETE_BUDGET',b.id));return {budgetId:b.id,currency:b.currency,from:b.from,through:b.through,limit:b.amount,recordedSpending:spent,remaining:complete?new D(b.amount).minus(spent):null,complete};
 });
 return {from:o.from,to:o.to,categories:[...categories.values()],months,budgets,definition:'Cash savings rate = (recorded income minus net spending and interest) / recorded income. Principal, investments and transfers excluded; incomplete months unavailable.'};
}
function nextMonth(date,step,anchor){const d=new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7))-1+step,1)),year=d.getUTCFullYear(),month=d.getUTCMonth(),last=new Date(Date.UTC(year,month+1,0)).getUTCDate();return `${year}-${String(month+1).padStart(2,'0')}-${String(Math.min(anchor,last)).padStart(2,'0')}`;}
export function bills(s,o,warnings){
 const rows=[];
 for(const r of s.active.filter(r=>r.kind==='recurring-payment'&&r.active)){
  let date=r.nextDate,iterations=0;const anchor=Number(date.slice(8));
  while(date<=o.to){assert(++iterations<=1200,'INPUT_LIMIT','Bill calendar exceeds 1200 occurrences per record.');if(date>=o.from)rows.push({recurringId:r.id,name:r.name,date,currency:r.currency,amount:r.amount,subscription:r.subscription,accountId:r.accountId,assumption:'Confirmed amount and cadence; actual payment may differ.'});date=nextMonth(date,r.intervalMonths,anchor);}
 }
 if(!rows.length)warnings.push(warning('NO_CONFIRMED_BILLS'));return {from:o.from,to:o.to,rows:rows.sort((a,b)=>a.date.localeCompare(b.date))};
}
export function spendingProposals(s,o,warnings){
 const ts=s.active.filter(t=>t.kind==='transaction'&&t.date>=o.from&&t.date<=o.to),rules=s.active.filter(r=>r.kind==='classification-rule'&&r.enabled),classifications=[],recurring=[],refunds=[];
 for(const t of ts.filter(t=>t.classification==='unknown')){
  const matches=rules.filter(r=>(!r.accountId||s.resolve(r.accountId).id===s.resolve(t.accountId).id)&&(t.description??'').toLowerCase().includes(r.contains.toLowerCase())&&(r.classification==='spending'?new D(t.amount).lt(0):new D(t.amount).gt(0)));
  if(matches.length===1){const r=matches[0];classifications.push({transactionId:t.id,ruleId:r.id,classification:r.classification,categoryId:r.categoryId,reason:'Confirmed literal substring rule matched; review required.'});}
  if(matches.length>1)warnings.push(warning('AMBIGUOUS_CLASSIFICATION_RULE',t.id));
 }
 const groups=new Map();
 for(const t of ts.filter(t=>new D(t.amount).lt(0)&&t.description&&!t.recurringId&&['spending','unknown'].includes(t.classification))){const key=JSON.stringify([s.resolve(t.accountId).id,t.currency,t.description.trim().toLowerCase()]);const group=groups.get(key)??[];group.push(t);groups.set(key,group);}
 for(const group of groups.values()){
  group.sort((a,b)=>a.date.localeCompare(b.date));if(group.length<3)continue;
  const gaps=group.slice(1).map((t,i)=>days(group[i].date,t.date));if(!gaps.every(g=>g>=25&&g<=35))continue;
  const last=group.at(-1);recurring.push({candidateId:hash(group.map(t=>t.id)),transactionIds:group.map(t=>t.id),accountId:last.accountId,currency:last.currency,description:last.description,amounts:group.map(t=>new D(t.amount).abs().toString()),amountChanged:new Set(group.map(t=>new D(t.amount).toString())).size>1,proposedNextDate:nextMonth(last.date,1,Number(last.date.slice(8))),reason:'At least three same-description debits, each 25–35 days apart; not proof of a subscription.'});
 }
 for(const credit of ts.filter(t=>new D(t.amount).gt(0)&&!t.refundOf&&['unknown','spending'].includes(t.classification))){
  const matches=s.active.filter(t=>t.kind==='transaction'&&t.classification==='spending'&&t.currency===credit.currency&&s.resolve(t.accountId).id===s.resolve(credit.accountId).id&&t.date<=credit.date&&days(t.date,credit.date)<=120&&new D(t.amount).eq(new D(credit.amount).negated())&&!s.active.some(r=>r.kind==='transaction'&&r.refundOf&&s.resolve(r.refundOf).id===t.id));
  if(matches.length)refunds.push({transactionId:credit.id,candidateOriginalIds:matches.map(t=>t.id),reason:'Equal opposite amount within 120 days on the same account; confirmation required.'});
 }
 return {from:o.from,to:o.to,classifications,recurring,refunds,status:'proposals-only',limitations:['Matching windows are detection heuristics, not user financial policy. No records were changed.']};
}
