import {D,sum,assert,warning,days} from './core.mjs';
export const latest=rs=>[...rs].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))[0];
export function covered(s,id,from,to,external=false){return s.active.some(r=>r.kind==='history'&&s.resolve(r.accountId).id===id&&r.from<=from&&r.through>=to&&r.complete&&(!external||r.externalFlowsComplete));}
export function delta(s,t,e){
 if(e.kind==='account')return s.resolve(t.accountId).id===e.id?new D(t.amount):new D(0);
 if(e.kind==='position')return t.positionId&&s.resolve(t.positionId).id===e.id?new D(t.positionDelta):new D(0);
 return t.liabilityId&&s.resolve(t.liabilityId).id===e.id?new D(t.liabilityDelta):new D(0);
}
export function valuation(s,e,date,warnings,staleDays=90){
 const o=latest(s.active.filter(r=>r.kind==='observation'&&s.resolve(r.entityId).id===e.id&&r.date<=date));
 if(!o){warnings.push(warning('MISSING_VALUE',e.id));return null;}
 if(days(o.date,date)>staleDays)warnings.push(warning('STALE_VALUE',o.id));
 const ts=s.active.filter(t=>t.kind==='transaction'&&t.date>o.date&&t.date<=date);
 const account=e.kind==='account'?e:e.accountId?s.resolve(e.accountId):null;
 if(o.date<date&&(!account||!covered(s,account.id,o.date,date)))warnings.push(warning('INCOMPLETE_HISTORY',e.id));
 if(e.kind==='position'&&o.date<date)warnings.push(warning('UNOBSERVED_PRICE_CHANGE',e.id));
 const value=new D(o.value).plus(sum(ts.map(t=>delta(s,t,e))));
 if(value.lt(0)){warnings.push(warning('NEGATIVE_DERIVED_VALUE',e.id));return null;}
 return {entityId:e.id,kind:e.kind,currency:e.currency,observationId:o.id,observationDate:o.date,value:value.toString(),share:e.kind==='liability'?e.responsibility:e.ownership,ownedValue:value.times(e.kind==='liability'?e.responsibility:e.ownership).toString()};
}
export function selected(s,warnings){
 const entities=s.active.filter(r=>['account','position','liability'].includes(r.kind));
 return entities.filter(e=>{
  if(e.kind==='account'){
   if(e.coverage==='unresolved'){warnings.push(warning('UNRESOLVED_OVERLAP',e.id));return false;}
   if(e.coverage==='holdings'){if(!entities.some(p=>p.kind==='position'&&p.accountId&&s.resolve(p.accountId).id===e.id))warnings.push(warning('MISSING_HOLDINGS',e.id));return false;}return true;
  }
  if(e.kind==='position'&&e.accountId)return s.resolve(e.accountId).coverage==='holdings';return true;
 });
}
export function convert(s,value,currency,base,date,warnings){
 if(currency===base)return new D(value);
 const f=latest(s.active.filter(r=>r.kind==='fx'&&r.date<=date&&((r.from===currency&&r.to===base)||(r.to===currency&&r.from===base))));
 if(!f){warnings.push(warning('MISSING_FX'));return null;}
 if(days(f.date,date)>90)warnings.push(warning('STALE_FX',f.id));
 return f.from===currency?new D(value).times(f.rate):new D(value).div(f.rate);
}
export function picture(s,o,warnings){
 const entities=selected(s,warnings),values=entities.map(e=>valuation(s,e,o.asOf,warnings)).filter(Boolean),currencies={};
 for(const v of values){const bucket=currencies[v.currency]??={assets:new D(0),liabilities:new D(0)};bucket[v.kind==='liability'?'liabilities':'assets']=bucket[v.kind==='liability'?'liabilities':'assets'].plus(v.ownedValue);}
 for(const b of Object.values(currencies))b.netWorth=b.assets.minus(b.liabilities);
 let total=null;
 if(o.base){const converted=values.map(v=>convert(s,new D(v.ownedValue).times(v.kind==='liability'?-1:1),v.currency,o.base,o.asOf,warnings));if(values.length>0&&values.length===entities.length&&converted.every(x=>x!==null)&&!warnings.some(w=>['UNRESOLVED_OVERLAP','MISSING_HOLDINGS'].includes(w.code)))total=sum(converted);}
 if(!entities.length)warnings.push(warning('MISSING_DATA'));
 return {asOf:o.asOf,values,perCurrency:currencies,baseCurrency:o.base??null,combinedNetWorth:total,complete:warnings.length===0};
}
export function cashflow(s,o,warnings){
 const ts=s.active.filter(t=>t.kind==='transaction'&&t.date>=o.from&&t.date<=o.to),perCurrency={};
 const accounts=s.active.filter(r=>r.kind==='account');
 for(const a of accounts)if(!covered(s,a.id,o.from,o.to))warnings.push(warning('INCOMPLETE_HISTORY',a.id));
 for(const t of ts){
  let classification=t.classification;
  if(classification==='transfer'){
   const pair=ts.filter(x=>x.classification==='transfer'&&x.transferId&&x.transferId===t.transferId);
   const match=t.transferId&&pair.length===2&&pair[0].currency===pair[1].currency&&s.resolve(pair[0].accountId).id!==s.resolve(pair[1].accountId).id&&sum(pair.map(x=>new D(x.amount).times(s.resolve(x.accountId).ownership))).isZero();
   if(!match){classification='unknown';warnings.push(warning('UNMATCHED_TRANSFER',t.id));}
  }
  if(classification==='unknown')warnings.push(warning('UNCLASSIFIED_FLOW',t.id));
  const b=perCurrency[t.currency]??={};b[classification]=(b[classification]??new D(0)).plus(new D(t.amount).times(s.resolve(t.accountId).ownership));
 }
 if(!ts.length)warnings.push(warning('MISSING_DATA'));
 return {from:o.from,to:o.to,perCurrency,transactionIds:ts.map(t=>t.id)};
}
export function reconciliation(s,o,warnings){
 const rows=[];
 for(const e of s.active.filter(r=>['account','position','liability'].includes(r.kind))){
  const obs=s.active.filter(r=>r.kind==='observation'&&s.resolve(r.entityId).id===e.id&&r.date<=o.asOf).sort((a,b)=>a.date.localeCompare(b.date));
  if(obs.length<2)warnings.push(warning('MISSING_ENDPOINTS',e.id));
  for(let i=1;i<obs.length;i++){
   const a=obs[i-1],b=obs[i],events=s.active.filter(t=>t.kind==='transaction'&&t.date>a.date&&t.date<=b.date);
   const expected=new D(a.value).plus(sum(events.map(t=>delta(s,t,e)))),discrepancy=new D(b.value).minus(expected);
   if(!discrepancy.isZero())warnings.push(warning('RECONCILIATION_DIFFERENCE',b.id));
   const account=e.kind==='account'?e:e.accountId?s.resolve(e.accountId):null;
   if(!account||!covered(s,account.id,a.date,b.date))warnings.push(warning('INCOMPLETE_HISTORY',e.id));
   rows.push({entityId:e.id,currency:e.currency,from:a.date,to:b.date,openingId:a.id,closingId:b.id,expected,observed:b.value,discrepancy});
  }
 }
 if(!rows.length)warnings.push(warning('MISSING_ENDPOINTS'));
 return {asOf:o.asOf,rows};
}
const ClaimDecimal=D.clone({precision:120});
export const goalClaimShare=claims=>new D(claims.reduce((n,c)=>n.plus(c.share.toString()),new ClaimDecimal(0)).toString());
export function goalClaims(s){
 const claims=new Map();
 for(const g of s.active.filter(r=>r.kind==='goal')){
  const allocations=g.allocations??[...new Set(g.entityIds.map(id=>s.resolve(id).id))].map(entityId=>({entityId,share:'1'}));
  for(const a of allocations){const id=s.resolve(a.entityId).id,rows=claims.get(id)??[];rows.push({goalId:g.id,share:new D(a.share)});claims.set(id,rows);}
 }
 return claims;
}
export function goals(s,o,warnings){
 const p=picture(s,o,warnings),claims=goalClaims(s);
 const activeGoals=s.active.filter(r=>r.kind==='goal'&&r.date<=o.asOf);
 const rows=activeGoals.map(g=>{
  const ids=[...new Set(g.entityIds.map(id=>s.resolve(id).id))],allocations=ids.map(id=>({entityId:id,share:claims.get(id).find(c=>c.goalId===g.id).share})),vs=p.values.filter(v=>ids.includes(v.entityId));
  const conflicts=[...new Set(ids.filter(id=>goalClaimShare(claims.get(id)).gt(1)).flatMap(id=>claims.get(id).filter(c=>c.goalId!==g.id&&c.share.gt(0)).map(c=>c.goalId)))];
  if(conflicts.length)warnings.push(warning('GOAL_ALLOCATION_OVERLAP',g.id));
  const missing=ids.filter(id=>!vs.some(v=>v.entityId===id));if(missing.length)warnings.push(warning('GOAL_COVERAGE',g.id));
  const converted=vs.map(v=>convert(s,new D(v.ownedValue).times(allocations.find(a=>a.entityId===v.entityId).share).times(v.kind==='liability'?-1:1),v.currency,g.currency,o.asOf,warnings));
  const value=!conflicts.length&&!missing.length&&converted.every(v=>v!==null)?sum(converted):null;
  return {goalId:g.id,allocations,conflictingGoalIds:conflicts,name:g.name,currency:g.currency,target:g.target,targetDate:g.targetDate,recordedValue:value,unfunded:value===null?null:D.max(0,new D(g.target).minus(value)),progress:value!==null&&new D(g.target).gt(0)?value.div(g.target):null};
 });
 if(!rows.length)warnings.push(warning('MISSING_GOALS'));return {asOf:o.asOf,rows};
}
