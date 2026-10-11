import Ajv from 'ajv';
import {readFileSync} from 'node:fs';
import {D,sum,assert,dateOK,canonical} from './core.mjs';
const ajv=new Ajv({allErrors:true,strict:true});
ajv.addFormat('date',dateOK);
ajv.addFormat('date-time',x=>/^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x)&&dateOK(x.slice(0,10))&&Number.isFinite(Date.parse(x)));
const validators=Object.fromEntries([1,2].map(v=>[v,ajv.compile(JSON.parse(readFileSync(new URL(`../schemas/batch-v${v}.json`,import.meta.url))))]));
export function shape(batch){
 assert([1,2].includes(batch?.schemaVersion),'UNSUPPORTED_SCHEMA','Supported batch schemas are 1 and 2.');
 const validate=validators[batch.schemaVersion];
 if(!validate(batch)){
  // Select the matching record variant, suppressing unrelated oneOf branches.
  const errors=validate.errors.filter(e=>{const m=e.schemaPath.match(/oneOf\/(\d+)\//);if(!m)return e.keyword!=='oneOf';const i=Number(e.instancePath.match(/^\/records\/(\d+)/)?.[1]);return validate.schema.properties.records.items.oneOf[Number(m[1])].properties.kind.const===batch.records?.[i]?.kind;});
  const e=new Error('Batch fields do not match the record schema.');e.code='INVALID_INPUT';
  e.details=(errors.length?errors:validate.errors).slice(0,50).map(x=>({path:x.instancePath,keyword:x.keyword,...(x.keyword==='required'?{field:x.params.missingProperty}:{})}));throw e;
 }
 assert(new Set(batch.records.map(r=>r.id)).size===batch.records.length,'ID_CONFLICT','Duplicate record ID within batch.');
 for(const r of batch.records){
  for(const k of ['ownership','responsibility','ongoingCharge'])if(r[k]!==undefined)assert(new D(r[k]).lte(1),'INVALID_INPUT','Shares and rates must be within [0,1].');
  if(r.settlementDate)assert(r.settlementDate>=r.date,'INVALID_INPUT','Settlement cannot precede the event date.');
  if(r.kind==='trade')assert(new D(r.quantity).gt(0),'INVALID_INPUT','Trade quantity must be positive.');
  if(r.kind==='fund')assert(sum(r.holdings.map(h=>h.weight)).lte(1),'INVALID_INPUT','Constituent weights exceed one.');
  if(r.kind==='fx')assert(new D(r.rate).gt(0)&&r.from!==r.to,'INVALID_INPUT','FX requires a positive rate and different currencies.');
  if(['retirement-scenario','housing-scenario'].includes(r.kind)){
   assert(r.startMonth.endsWith('-01')&&r.startMonth>='1000-01-01'&&r.startMonth<='9899-12-01'&&r.startMonth>=r.date,'INVALID_INPUT','Scenario start must be a first-of-month date, not before its record, within supported years.');
   assert(new Set(['base',...r.variants.map(v=>v.label)]).size===r.variants.length+1,'INVALID_INPUT','Sensitivity labels must be unique and cannot be base.');
   for(const a of [r,...r.variants.map(v=>({...r,...v}))]){
    for(const key of ['annualReturn','annualInflation','annualIncomeGrowth','annualPensionGrowth','annualHouseGrowth','annualRentGrowth'])if(a[key]!==undefined)assert(new D(a[key]).gt(-1)&&new D(a[key]).lte(10),'INVALID_INPUT','Annual scenario growth must exceed -1 and be at most 10.');
    if(r.kind==='retirement-scenario')assert(a.retireAfterMonths<=a.months,'INVALID_INPUT','Retirement timing exceeds the scenario horizon.');
    if(r.kind==='housing-scenario')assert(new D(a.price).gt(0)&&new D(a.downPayment).lte(a.price)&&new D(a.sellingFee).lte(1)&&new D(a.mortgageAnnualRate).lte(1),'INVALID_INPUT','Invalid housing price, down payment, fee or mortgage rate.');
   }
  }
  if(['fee-comparison','fx-comparison'].includes(r.kind)){
   assert(new Set(r.offers.map(x=>x.offerId)).size===r.offers.length,'INVALID_INPUT','Offer identifiers must be unique.');
   assert(r.offers.every(x=>x.sourceDate<=x.reviewDue),'INVALID_INPUT','Offer review date precedes its source date.');
   if(r.kind==='fee-comparison')assert(r.offers.some(x=>x.offerId===r.referenceOfferId),'INVALID_INPUT','Reference offer is missing.');
   else assert(r.sourceCurrency!==r.destinationCurrency&&new D(r.amount).gt(0)&&r.offers.every(x=>new D(x.destinationPerSource).gt(0)),'INVALID_INPUT','FX comparison requires different currencies and positive amount/rates.');
  }
  if(r.kind==='fee-scenario')assert(new D(r.annualGrossReturn).gt(-1),'INVALID_INPUT','Gross return must exceed -1.');
  if(r.kind==='investment-policy'){
   assert(new Set(r.assetBands.map(b=>b.assetClass)).size===r.assetBands.length,'INVALID_INPUT','Policy asset bands must be unique.');
   assert(r.assetBands.every(b=>new D(b.minimum).lte(b.maximum)),'INVALID_INPUT','Policy band minimum exceeds maximum.');
   assert(!r.assetBands.length||(sum(r.assetBands.map(b=>b.minimum)).lte(1)&&sum(r.assetBands.map(b=>b.maximum)).gte(1)),'INVALID_INPUT','Policy bands cannot contain a fully allocated portfolio.');
  }
  if(r.kind==='budget')assert(r.from<=r.through,'INVALID_INPUT','Budget dates are reversed.');
  if(r.kind==='history')assert(r.from<=r.through,'INVALID_INPUT','History dates are reversed.');
  if(r.kind==='assumptions'){
   assert(new D(r.annualReturn).gt(-1)&&new D(r.annualInflation).gt(-1),'INVALID_INPUT','Return and inflation must exceed -1.');
   assert((r.paths??10000)*r.months<=12000000,'INPUT_LIMIT','Simulation exceeds twelve million monthly steps.');
  }
 }
 return batch;
}
export function replay(batches){
 const all=new Map(), superseded=new Map();
 for(const b of batches){shape(b);for(const r of b.records){
  if(all.has(r.id)){assert(canonical(all.get(r.id))===canonical(r),'ID_CONFLICT','Record ID already exists with different content.');continue;}
  if(r.supersedes){const old=all.get(r.supersedes);assert(old&&old.kind===r.kind&&!superseded.has(old.id),'CORRECTION_CONFLICT','Correction target must be active and have the same kind.');superseded.set(old.id,r.id);}
  all.set(r.id,r);
 }}
 const resolve=id=>{const seen=new Set();while(superseded.has(id)){assert(!seen.has(id),'CORRECTION_CONFLICT','Correction cycle.');seen.add(id);id=superseded.get(id);}return all.get(id);};
 const active=[...all.values()].filter(r=>!superseded.has(r.id));
 const ref=(id,kinds)=>{const r=resolve(id);assert(r&&kinds.includes(r.kind),'INVALID_REFERENCE','A referenced record is missing or has the wrong kind.');return r;};
 const same=(r,e)=>assert(r.currency===e.currency,'CURRENCY_MISMATCH','Referenced entity currency differs.');
 for(const r of active){
  if(r.kind==='position'&&r.accountId){const a=ref(r.accountId,['account']);same(r,a);assert(new D(r.ownership).eq(a.ownership),'OWNERSHIP_CONFLICT','Account holdings must use the account ownership share.');}
  if(r.kind==='observation')same(r,ref(r.entityId,['account','position','liability']));
  if(r.kind==='transaction'){
   same(r,ref(r.accountId,['account']));
   assert((r.liabilityId!==undefined)===(r.liabilityDelta!==undefined),'INVALID_INPUT','Liability ID and delta must occur together.');
   assert((r.positionId!==undefined)===(r.positionDelta!==undefined),'INVALID_INPUT','Position ID and delta must occur together.');
   if(r.liabilityId)same(r,ref(r.liabilityId,['liability']));
   if(r.positionId)same(r,ref(r.positionId,['position']));
   if(r.classification==='principal')assert(r.liabilityId&&new D(r.liabilityDelta).eq(r.amount),'INVALID_INPUT','Principal cash and liability deltas must match.');
   assert((r.valueBefore!==undefined)===(r.valueAfter!==undefined),'INVALID_INPUT','Performance boundary values must occur together.');
   if(r.categorySplits){
    assert(['spending','income','interest'].includes(r.classification),'INVALID_INPUT','Only classified cashflows can have category splits.');
    assert(sum(r.categorySplits.map(x=>x.amount)).eq(r.amount),'INVALID_INPUT','Signed category splits must sum exactly to the transaction amount.');
    for(const split of r.categorySplits){ref(split.categoryId,['category']);assert(new D(split.amount).isZero()||new D(split.amount).isNegative()===new D(r.amount).isNegative(),'INVALID_INPUT','Splits must have the transaction sign.');}
   }
   if(r.refundOf){const original=ref(r.refundOf,['transaction']);same(r,original);assert(r.classification==='spending'&&original.classification==='spending'&&new D(r.amount).gt(0)&&new D(original.amount).lt(0)&&r.date>=original.date,'INVALID_INPUT','Refund must be a positive spending reversal of an earlier negative spending transaction.');}
   if(r.recurringId){const recurring=ref(r.recurringId,['recurring-payment']);same(r,recurring);assert(resolve(r.accountId).id===resolve(recurring.accountId).id,'INVALID_REFERENCE','Recurring payment belongs to a different account.');}
   if(r.externalFlow&&r.valueBefore!==undefined)assert(new D(r.valueBefore).plus(r.amount).eq(r.valueAfter),'INVALID_INPUT','Flow boundary values must reconcile to the external flow.');
  }
  if(r.kind==='retirement-scenario'){const ids=r.expenseIds.map(id=>ref(id,['planned-expense']).id);assert(new Set(ids).size===ids.length,'INVALID_INPUT','Scenario expenses cannot repeat through correction aliases.');}
  if(['tax-context','document-reference'].includes(r.kind)&&r.memberId)ref(r.memberId,['household-member']);
  if(r.kind==='household-plan'){
   if(r.scenarioId)ref(r.scenarioId,['retirement-scenario']);
   const members=r.memberIds.map(id=>ref(id,['household-member']).id),entities=[];assert(new Set(members).size===members.length,'INVALID_INPUT','Household members cannot repeat through corrected aliases.');
   const Exact=D.clone({precision:120});
   for(const a of r.allocations){entities.push(ref(a.entityId,['account','position','liability']).id);const ids=a.members.map(m=>ref(m.memberId,['household-member']).id);assert(new Set(ids).size===ids.length&&ids.every(id=>members.includes(id)),'INVALID_INPUT','Household allocations must name distinct listed members.');assert(a.members.reduce((n,m)=>n.plus(m.share),new Exact(0)).lte(1),'INVALID_INPUT','Household shares cannot exceed one.');}
   assert(new Set(entities).size===entities.length,'INVALID_INPUT','Household entities cannot repeat through corrected aliases.');
  }
  if(r.kind==='reminder')for(const id of r.documentIds)ref(id,['document-reference']);
  if(r.kind==='investment-policy'){const liquid=r.liquidEntityIds.map(id=>ref(id,['account','position']).id);assert(new Set(liquid).size===liquid.length,'INVALID_INPUT','Liquid assets cannot repeat through corrected references.');}
  if(r.kind==='classification-rule'){ref(r.categoryId,['category']);if(r.accountId)ref(r.accountId,['account']);}
  if(r.kind==='budget')ref(r.categoryId,['category']);
  if(r.kind==='recurring-payment'){same(r,ref(r.accountId,['account']));if(r.categoryId)ref(r.categoryId,['category']);}
  if(r.kind==='account'&&r.institutionId)ref(r.institutionId,['institution']);
  if(r.kind==='trade'){
   const a=ref(r.accountId,['account']),p=ref(r.positionId,['position']);same(r,a);same(r,p);
   assert(p.accountId&&resolve(p.accountId).id===a.id,'INVALID_REFERENCE','Trade position must belong to the trade account.');
   if(r.transactionId){const t=ref(r.transactionId,['transaction']);same(r,t);assert(resolve(t.accountId).id===a.id,'INVALID_REFERENCE','Trade transaction belongs to a different account.');}
  }
  if(r.kind==='corporate-action'){ref(r.positionId,['position']);if(r.relatedPositionId)ref(r.relatedPositionId,['position']);}
  if(r.kind==='history')ref(r.accountId,['account']);
  if(r.kind==='goal'){
   const ids=r.entityIds.map(id=>ref(id,['account','position','liability']).id);
   if(r.allocations){const allocated=r.allocations.map(a=>ref(a.entityId,['account','position','liability']).id);assert(new Set(allocated).size===allocated.length&&new Set(ids).size===ids.length&&allocated.length===ids.length&&allocated.every(id=>ids.includes(id)),'INVALID_INPUT','Explicit goal allocations must match entity IDs exactly without corrected aliases.');}
  }
  if(r.kind==='allocation-plan'){
   const p=ref(r.policyId,['investment-policy']);same(r,p);const ids=r.entityIds.map(id=>ref(id,['account','position']).id);assert(new Set(ids).size===ids.length,'INVALID_INPUT','Plan entities cannot repeat through corrected aliases.');
   assert(new Set(r.targets.map(t=>t.assetClass)).size===r.targets.length&&sum(r.targets.map(t=>t.weight)).eq(1),'INVALID_INPUT','Unique target weights must sum to one.');
   assert(r.targets.length===p.assetBands.length&&r.targets.every(t=>p.assetBands.some(b=>b.assetClass===t.assetClass&&new D(t.weight).gte(b.minimum)&&new D(t.weight).lte(b.maximum))),'INVALID_INPUT','Explicit targets must cover policy bands and lie inside them.');
  }
  if(r.kind==='assumptions'&&r.goalId)same(r,ref(r.goalId,['goal']));
 }
 const refunds=new Map();
 for(const r of active.filter(r=>r.kind==='transaction'&&r.refundOf)){const id=resolve(r.refundOf).id;refunds.set(id,(refunds.get(id)??new D(0)).plus(r.amount));}
 for(const [id,total]of refunds)assert(total.lte(new D(resolve(id).amount).abs()),'INVALID_INPUT','Confirmed refunds exceed the original payment.');
 const budgetKeys=new Map();
 for(const b of active.filter(r=>r.kind==='budget')){const key=resolve(b.categoryId).id+'|'+b.currency,prior=budgetKeys.get(key)??[];assert(prior.every(x=>b.through<x.from||b.from>x.through),'INVALID_INPUT','Category budgets cannot have overlapping periods.');prior.push(b);budgetKeys.set(key,prior);}
 const identities=new Set();
 for(const r of active){if(r.provenance.sourceId){const key=canonical([r.kind,r.provenance.source,r.provenance.sourceId]);assert(!identities.has(key),'SOURCE_CONFLICT','Stable source identity is already active.');identities.add(key);}}
 const datedKeys=new Set();
 for(const r of active.filter(r=>['fund','fx'].includes(r.kind))){const key=canonical([r.kind,r.date,r.kind==='fund'?r.instrumentId:[r.from,r.to].sort()]);assert(!datedKeys.has(key),'OVERLAPPING_OBSERVATION','Correct the existing same-day fund or FX observation.');datedKeys.add(key);}
 const observations=new Set();
 for(const r of active.filter(r=>r.kind==='observation')){const k=resolve(r.entityId).id+'|'+r.date;assert(!observations.has(k),'OVERLAPPING_OBSERVATION','Correct the existing same-day observation instead.');observations.add(k);}
 return {active,all,resolve};
}
