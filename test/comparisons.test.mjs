import test from 'node:test';
import assert from 'node:assert/strict';
import {record} from './helpers.mjs';
import {replay} from '../src/validate.mjs';
import {report} from '../src/reports.mjs';
const offer=(id,fields={})=>({offerId:id,name:id,sourceUrl:'https://example.com/synthetic-only',sourceDate:'2026-01-01',reviewDue:'2026-12-31',eligibility:'eligible',eligibilityNotes:'Synthetic eligibility only',...fields});
const fee=fields=>record('fee-comparison','comparison',{currency:'EUR',annualUsage:'10000',referenceOfferId:'basic',product:'card',offers:[offer('basic',{annualFixedFee:'0',variableFeeRate:'0',rewardRate:'0.01',annualRewardCap:null,rewardValueConfirmed:true}),offer('paid',{annualFixedFee:'100',variableFeeRate:'0',rewardRate:'0.02',annualRewardCap:'300',rewardValueConfirmed:true})],...fields});
const state=r=>replay([{schemaVersion:2,batchId:'comparison',records:[r]}]);
const opts={asOf:'2026-01-01',assumptions:'comparison'};
test('annual fees and capped rewards produce both independent break-even points',()=>{
 const r=report(state(fee()),'fee-comparison',opts);assert.equal(r.data.rows[0].annualNetCost.toString(),'-100');assert.equal(r.data.rows[1].annualNetCost.toString(),'-100');assert.deepEqual(r.data.rows[1].breakEvenWithReference.annualUsagePoints.map(String),['10000','20000']);assert.equal(r.data.rows[1].differenceFromReference.toString(),'0');
 const capped=report(state(fee({annualUsage:'30000'})),'fee-comparison',opts);assert.equal(capped.data.rows[1].annualNetCost.toString(),'-200');assert.equal(capped.data.rows[1].differenceFromReference.toString(),'100');
});
test('identical fee schedules yield equality intervals rather than an invented unique threshold',()=>{
 const f=fee();f.offers[1]={...f.offers[0],offerId:'paid'};const r=report(state(f),'fee-comparison',opts);assert.deepEqual(r.data.rows[1].breakEvenWithReference.annualUsagePoints,[]);assert.equal(r.data.rows[1].breakEvenWithReference.equalCostIntervals[0].from.toString(),'0');assert.equal(r.data.rows[1].breakEvenWithReference.equalCostIntervals[0].through,null);
});
test('stale, future, uncertain and ineligible offers cannot produce comparable conclusions',()=>{
 for(const override of [{eligibility:'unknown'},{eligibility:'ineligible'},{sourceDate:'2026-02-01'},{reviewDue:'2025-12-31',sourceDate:'2025-12-01'},{rewardValueConfirmed:false}]){const f=fee();Object.assign(f.offers[1],override);const r=report(state(f),'fee-comparison',opts);assert.equal(r.data.rows[1].annualNetCost,null);assert.equal(r.data.rows[1].breakEvenWithReference,null);assert(r.warnings.some(w=>w.code==='OFFER_UNAVAILABLE'));}
});
test('FX route amounts deduct explicit source fees before conversion and keep input order',()=>{
 const f=record('fx-comparison','comparison',{sourceCurrency:'EUR',destinationCurrency:'USD',amount:'1000',offers:[offer('first',{fixedSourceFee:'5',sourceFeeRate:'0.01',destinationPerSource:'1.1'}),offer('second',{fixedSourceFee:'0',sourceFeeRate:'0',destinationPerSource:'1.08'})]});
 const r=report(state(f),'fx-comparison',opts);assert.deepEqual(r.data.rows.map(r=>r.offerId),['first','second']);assert.equal(r.data.rows[0].totalSourceFees.toString(),'15');assert.equal(r.data.rows[0].destinationAmount.toString(),'1083.5');assert.equal(r.data.rows[1].destinationAmount.toString(),'1080');
 f.offers[0].fixedSourceFee='1001';assert.equal(report(state(f),'fx-comparison',opts).data.rows[0].destinationAmount,null);
});
test('comparison schema rejects duplicate offers and invalid reference or source dates',()=>{
 const f=fee();f.offers[1].offerId='basic';assert.throws(()=>state(f),{code:'INVALID_INPUT'});assert.throws(()=>state(fee({referenceOfferId:'missing'})),{code:'INVALID_INPUT'});
 const dates=fee();dates.offers[0].reviewDue='2025-01-01';assert.throws(()=>state(dates),{code:'INVALID_INPUT'});
});

test('fee and reward boundaries agree with independent integer arithmetic',()=>{
 // Integer cents and basis points provide an independent oracle, including caps.
 const schedules=[{fixed:0,fee:0,reward:100,cap:null},{fixed:100,fee:50,reward:200,cap:300},{fixed:40,fee:200,reward:100,cap:60},{fixed:0,fee:100,reward:0,cap:0}];
 for(const usage of [0,1,2999,3000,5999,6000,9999,10000,14999,15000,20000,30000]){
  const quotes=schedules.map((q,i)=>offer(String(i),{annualFixedFee:String(q.fixed),variableFeeRate:String(q.fee/10000),rewardRate:String(q.reward/10000),annualRewardCap:q.cap===null?null:String(q.cap),rewardValueConfirmed:true}));
  const r=report(state(fee({annualUsage:String(usage),offers:quotes,referenceOfferId:'0'})),'fee-comparison',opts);
  const expected=schedules.map(q=>{const earned=BigInt(usage)*BigInt(q.reward),cap=q.cap===null?earned:BigInt(q.cap)*10000n;return BigInt(q.fixed)*10000n+BigInt(usage)*BigInt(q.fee)-(earned<cap?earned:cap);});
  for(let i=0;i<r.data.rows.length;i++){assert.equal(r.data.rows[i].annualNetCost.times(10000).toString(),expected[i].toString());assert.equal(r.data.rows[i].differenceFromReference.times(10000).toString(),(expected[i]-expected[0]).toString());}
 }
});
test('FX fee boundary, quote metadata and immutable corrections preserve date routing',()=>{
 const first=record('fx-comparison','comparison',{sourceCurrency:'EUR',destinationCurrency:'USD',amount:'100',offers:[offer('route',{fixedSourceFee:'75',sourceFeeRate:'0.25',destinationPerSource:'2'}),offer('alternative',{fixedSourceFee:'0',sourceFeeRate:'0',destinationPerSource:'1'})]});
 const zero=report(state(first),'fx-comparison',opts);assert.equal(zero.data.rows[0].destinationAmount.toString(),'0');assert.equal(zero.data.rows[0].totalSourceFees.toString(),'100');assert.equal(zero.data.rows[0].sourceUrl,first.offers[0].sourceUrl);assert.equal(zero.data.rows[0].eligibilityNotes,first.offers[0].eligibilityNotes);
 const revised={...first,id:'corrected',supersedes:'comparison',date:'2026-02-01',provenance:{...first.provenance,sourceId:'corrected'},offers:[{...first.offers[0],fixedSourceFee:'76',sourceDate:'2026-02-01'},first.offers[1]]};
 const s=replay([{schemaVersion:2,batchId:'quotes',records:[first,revised]}]);assert.throws(()=>report(s,'fx-comparison',opts),{code:'MISSING_INPUT'});
 const unavailable=report(s,'fx-comparison',{...opts,asOf:'2026-02-01'});assert.equal(unavailable.data.assumptionsId,'corrected');assert.equal(unavailable.data.rows[0].destinationAmount,null);assert.equal(unavailable.warnings[0].reason,'fees-exceed-amount');assert.deepEqual(unavailable.data.metadata.inputIds,['corrected']);
});
