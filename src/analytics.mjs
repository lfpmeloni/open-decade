import {D,sum,warning,assert,days} from './core.mjs';
import {latest,valuation,covered,convert} from './picture.mjs';
const dimensions=['issuer','country','sector','assetClass','economicCurrency'];
export function portfolio(s,o,warnings){
 const ps=s.active.filter(r=>r.kind==='position'&&r.date<=o.asOf),values=[];
 for(const p of ps){
  const v=valuation(s,p,o.asOf,warnings);if(!v)continue;
  const value=o.base?convert(s,v.ownedValue,p.currency,o.base,o.asOf,warnings):new D(v.ownedValue);
  values.push({p,value:value??new D(v.ownedValue),currency:value===null?p.currency:o.base??p.currency});
 }
 if(!ps.length)warnings.push(warning('MISSING_POSITIONS'));return values;
}
export function exposure(s,o,warnings){
 const values=portfolio(s,o,warnings),groups={};
 const fund=id=>latest(s.active.filter(r=>r.kind==='fund'&&r.instrumentId===id&&r.date<=o.asOf));
 for(const currency of new Set(values.map(v=>v.currency))){
  const group=values.filter(v=>v.currency===currency),total=sum(group.map(v=>v.value)),buckets=Object.fromEntries(dimensions.map(d=>[d,new Map()])),dates=new Map();
  const add=(d,k,v)=>buckets[d].set(k,(buckets[d].get(k)??new D(0)).plus(v));
  let visits=0;
  function walk(node,value,seen){
   if(++visits>10000){warnings.push(warning('EXPOSURE_WORK_LIMIT'));for(const d of dimensions)add(d,'unknown',value);return;}
   const f=fund(node.instrumentId);
   if(f){
    dates.set(f.id,{recordId:f.id,date:f.date,shareClass:f.shareClass});
    if(days(f.date,o.asOf)>90)warnings.push(warning('STALE_FUND_DATA',f.id));
    if(seen.has(f.instrumentId)||seen.size>=64){warnings.push(warning('FUND_CYCLE_OR_DEPTH',f.id));for(const d of dimensions)add(d,'unknown',value);return;}
    const next=new Set([...seen,f.instrumentId]);
    for(const h of f.holdings)walk(h,value.times(h.weight),next);
    const residual=value.times(new D(1).minus(sum(f.holdings.map(h=>h.weight))));for(const d of dimensions)add(d,'unknown',residual);
   }else for(const d of dimensions)add(d,node[d]??'unknown',value);
  }
  for(const {p,value} of group)walk(p,value,new Set());
  const result={};for(const d of dimensions){result[d]=Object.fromEntries([...buckets[d]].map(([k,v])=>[k,{value:v,weight:total.gt(0)?v.div(total):null}]));if((buckets[d].get('unknown')??new D(0)).gt(0))warnings.push(warning('UNKNOWN_EXPOSURE'));}
  groups[currency]={total,dimensions:result,fundCoverage:[...dates.values()]};
 }
 return {asOf:o.asOf,perCurrency:groups,scope:'recorded positions; account aggregates excluded'};
}
export function costs(s,o,warnings){
 const values=portfolio(s,o,warnings),groups={};
 for(const currency of new Set(values.map(v=>v.currency))){
  const group=values.filter(v=>v.currency===currency),total=sum(group.map(v=>v.value));let coveredValue=new D(0),annual=new D(0);const rows=[];
  for(const {p,value} of group){
   const f=latest(s.active.filter(r=>r.kind==='fund'&&r.instrumentId===p.instrumentId&&r.date<=o.asOf));
   if(f?.ongoingCharge!==undefined){coveredValue=coveredValue.plus(value);annual=annual.plus(value.times(f.ongoingCharge));if(days(f.date,o.asOf)>90)warnings.push(warning('STALE_FUND_DATA',f.id));}
   else warnings.push(warning('MISSING_COST',p.id));
   rows.push({positionId:p.id,fundRecordId:f?.id??null,date:f?.date??null,shareClass:f?.shareClass??null,value,ongoingCharge:f?.ongoingCharge??null,otherRecordedCharges:f?.otherCharges??[]});
  }
  groups[currency]={total,coveredValue,coverage:total.gt(0)?coveredValue.div(total):null,weightedDisclosedRate:total.gt(0)?annual.div(total):null,coveredWeightedRate:coveredValue.gt(0)?annual.div(coveredValue):null,constantValueAnnualEstimate:annual,rows};
 }
 return {asOf:o.asOf,perCurrency:groups,scope:'disclosed ongoing charges, not total costs; other charges are unaggregated disclosures'};
}
export function performance(s,o,warnings){
 const a=s.resolve(o.account);assert(a?.kind==='account','MISSING_INPUT','Performance requires --account ACCOUNT_ID.');
 const observations=s.active.filter(r=>r.kind==='observation'&&s.resolve(r.entityId).id===a.id),first=observations.find(r=>r.date===o.from),last=observations.find(r=>r.date===o.to);
 const ts=s.active.filter(r=>r.kind==='transaction'&&s.resolve(r.accountId).id===a.id&&r.date>o.from&&r.date<=o.to).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const result={accountId:a.id,currency:a.currency,from:o.from,to:o.to,cashProfit:null,timeWeightedReturn:null,annualizedReturn:null};
 if(!first||!last){warnings.push(warning('MISSING_ENDPOINTS'));return result;}
 if(!covered(s,a.id,o.from,o.to,true)||ts.some(t=>t.externalFlow===undefined)){warnings.push(warning('INCOMPLETE_EXTERNAL_FLOWS'));return result;}
 const flows=ts.filter(t=>t.externalFlow&&!new D(t.amount).isZero());
 result.cashProfit=new D(last.value).minus(first.value).minus(sum(flows.map(t=>t.amount)));
 if(flows.some(t=>t.valueBefore===undefined)){warnings.push(warning('MISSING_FLOW_VALUATIONS'));return result;}
 if(new Set(flows.map(t=>t.date)).size!==flows.length){warnings.push(warning('AMBIGUOUS_FLOW_ORDER'));return result;}
 let start=new D(first.value),factor=new D(1);
 for(const t of flows){if(start.lte(0)){warnings.push(warning('ZERO_RETURN_DENOMINATOR'));return result;}factor=factor.times(new D(t.valueBefore).div(start));start=new D(t.valueAfter);}
 if(start.lte(0)){warnings.push(warning('ZERO_RETURN_DENOMINATOR'));return result;}
 factor=factor.times(new D(last.value).div(start));result.timeWeightedReturn=factor.minus(1);
 const n=days(o.from,o.to);if(n>=365)result.annualizedReturn=factor.pow(new D(365).div(n)).minus(1);
 return result;
}
