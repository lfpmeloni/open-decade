import {warning} from './core.mjs';
export function readiness(s,o,warnings){
 const needs=[];
 const need=(r,field,reason)=>needs.push({recordId:r?.id??null,field,reason});
 if(!s.active.some(r=>['account','position','liability'].includes(r.kind)))need(null,'records','No financial entities have been recorded.');
 for(const a of s.active.filter(r=>r.kind==='account')){
  if(!a.institutionId)need(a,'institutionId','Institution exposure is unknown.');
  if(!a.wrapper)need(a,'wrapper','Account tax wrapper is unknown.');
  if(a.coverage==='unresolved')need(a,'coverage','Account and holdings overlap is unresolved.');
  if(!s.active.some(r=>r.kind==='history'&&s.resolve(r.accountId).id===a.id&&r.complete&&r.through>=o.asOf))need(a,'history','Activity coverage is incomplete.');
 }
 for(const p of s.active.filter(r=>r.kind==='position')){
  if(!p.identifiers?.length)need(p,'identifiers','Instrument identifiers have not been recorded.');
  if(!p.instrumentType||['unknown','other'].includes(p.instrumentType))need(p,'instrumentType','Instrument is unresolved; no classification was inferred.');
  const obs=s.active.filter(r=>r.kind==='observation'&&s.resolve(r.entityId).id===p.id).sort((a,b)=>b.date.localeCompare(a.date));
  for(const key of ['quantity','acquisitionCost'])if(obs[0]?.[key]===undefined)need(p,key,'Not supplied; never inferred from valuation.');
 }
 for(const r of s.active){
  if(r.kind==='corporate-action')need(r,'action','Recorded action requires explicit reconciled observations; no automatic quantity or cost adjustment.');
  if(r.kind==='trade'&&!r.transactionId)need(r,'transactionId','Trade is descriptive; no cash movement has been inferred.');
 }
 if(!s.active.some(r=>r.kind==='profile'))need(null,'profile','No dated profile supplied.');
 for(const n of needs)warnings.push(warning('COLLECTION_INCOMPLETE',n.recordId));
 return {asOf:o.asOf,schemaVersion:s.schemaVersion??1,needs,ready:needs.length===0,limitations:['Collection readiness is not a financial-health verdict.']};
}
