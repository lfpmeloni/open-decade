import test from 'node:test';
import assert from 'node:assert/strict';
import {replay} from '../src/validate.mjs';
import {report} from '../src/reports.mjs';
import {account,observation,record} from './helpers.mjs';
const goal=(id,share)=>record('goal',id,{name:id,currency:'EUR',target:'100',targetDate:'2027-01-01',entityIds:['equity'],...(share===undefined?{}:{allocations:[{entityId:'equity',share}]})});
const base=()=>[account('cash'),observation('cash-value','cash','1000'),record('position','equity',{name:'Equity',currency:'EUR',ownership:'1',assetClass:'equity'}),observation('equity-value','equity','800'),record('position','bonds',{name:'Bonds',currency:'EUR',ownership:'1',assetClass:'bonds'}),observation('bonds-value','bonds','200'),record('investment-policy','policy',{name:'Policy',currency:'EUR',reserveMonths:'3',maxInstitutionWeight:'1',maxIssuerWeight:'1',liquidEntityIds:['cash'],assetBands:[{assetClass:'equity',minimum:'0.4',maximum:'0.6'},{assetClass:'bonds',minimum:'0.4',maximum:'0.6'}],reviewDate:'2027-01-01',rationale:'Synthetic explicit preference'}),record('allocation-plan','plan',{policyId:'policy',currency:'EUR',entityIds:['equity','bonds'],contribution:'200',contributionSource:'external-unallocated',monthlyEssentialSpending:'100',needsReviewed:true,mode:'contribution',targets:[{assetClass:'equity',weight:'0.5'},{assetClass:'bonds',weight:'0.5'}]})];
const state=records=>replay([{schemaVersion:2,batchId:'allocation',records}]);
const run=records=>report(state(records),'allocation-plan',{asOf:'2026-01-01',assumptions:'plan'});
test('explicit goal fractions fund separate goals once and retain unfunded targets',()=>{
 const r=report(state([...base(),goal('g1','0.25'),goal('g2','0.5')]),'goals',{asOf:'2026-01-01'});assert.equal(r.data.rows[0].recordedValue.toString(),'200');assert.equal(r.data.rows[1].recordedValue.toString(),'400');assert.equal(r.data.rows[0].unfunded.toString(),'0');assert.equal(r.data.metadata.method,'goals-v3');
 const conflict=report(state([...base(),goal('g1','0.6'),goal('g2','0.5')]),'goals',{asOf:'2026-01-01'});assert(conflict.data.rows.every(g=>g.recordedValue===null));
 const mixed=report(state([...base(),goal('legacy'),goal('g2','0.1')]),'goals',{asOf:'2026-01-01'});assert(mixed.data.rows.every(g=>g.recordedValue===null));
});
test('contribution-only draft conserves budget without sales; rebalance uses explicit targets',()=>{
 const a=run(base());assert.equal(a.data.status,'draft');assert.deepEqual(a.data.rows.map(r=>r.draftChange.toString()),['0','200']);assert.equal(a.data.netDraftChange.toString(),'200');assert(a.warnings.some(w=>w.code==='CONTRIBUTIONS_CANNOT_RESTORE_BANDS'));
 const records=base();records.at(-1).mode='rebalance';const b=run(records);assert.deepEqual(b.data.rows.map(r=>r.draftChange.toString()),['-200','400']);assert.equal(b.data.netDraftChange.toString(),'200');assert(b.data.rows.every(r=>r.withinBand));assert.equal(b.data.execution,false);
});
test('goal earmarks and liquid reserve are protected and goal deficits remain visible',()=>{
 const g=goal('goal','0.5');g.target='1000';const r=run([...base(),g]);assert.equal(r.data.startingTotal.toString(),'600');assert.equal(r.data.protectedGoals[0].value.toString(),'400');assert.equal(r.data.needs.reserveRequired.toString(),'300');assert.equal(r.data.goalFunding[0].unfunded.toString(),'600');assert(r.warnings.some(w=>w.code==='PLAN_UNFUNDED_GOALS_REVIEW'));
 const expense=record('planned-expense','expense',{name:'Expense',currency:'EUR',amount:'800',dueDate:'2026-02-01',essential:true});const blocked=run([...base(),expense]);assert.equal(blocked.data.status,'incomplete');assert.equal(blocked.data.needs.unfunded.toString(),'100');assert.deepEqual(blocked.data.rows,[]);
 const foreign=run([...base(),{...expense,currency:'USD'}]);assert.equal(foreign.data.status,'incomplete');assert.equal(foreign.data.needs.unfunded,null);
 const cancelled=run([...base(),{...expense,currency:'USD',amount:'0'}]);assert.equal(cancelled.data.status,'draft');
});
test('missing/stale evidence, policy review, reserve overlap and overallocated goals block drafts',()=>{
 const records=base();records.at(-1).entityIds.push('cash');assert.equal(run(records).data.status,'incomplete');
 const missing=base().filter(r=>r.id!=='equity-value');assert.equal(run(missing).data.status,'incomplete');
 const stale=base();stale.find(r=>r.id==='equity-value').date='2025-01-01';assert.equal(run(stale).data.status,'incomplete');
 const policy=base();policy.find(r=>r.id==='policy').reviewDate='2025-01-01';assert.equal(run(policy).data.status,'incomplete');
 assert.equal(run([...base(),goal('g1','0.8'),goal('g2','0.8')]).data.status,'incomplete');
});
test('allocation fields reject aliases, incomplete mappings and targets outside policy',()=>{
 const wrong=base();wrong.at(-1).targets[0].weight='0.9';wrong.at(-1).targets[1].weight='0.1';assert.throws(()=>state(wrong),{code:'INVALID_INPUT'});
 const g=goal('goal','0.5');g.allocations=[];assert.throws(()=>state([...base(),g]),{code:'INVALID_INPUT'});
 const alias={...base()[2],id:'equity-new',supersedes:'equity'};const p=base();p.at(-1).entityIds.push('equity-new');assert.throws(()=>state([...p,alias]),{code:'INVALID_INPUT'});
});

test('fractional goal funding applies ownership and dated FX and detects sub-display overclaims',()=>{
 const records=base();records.find(r=>r.id==='equity').currency='USD';records.find(r=>r.id==='equity').ownership='0.5';records.find(r=>r.id==='equity-value').currency='USD';records.push(record('fx','fx',{from:'USD',to:'EUR',rate:'2'}),goal('g','0.25'));
 const r=report(state(records),'goals',{asOf:'2026-01-01'});assert.equal(r.data.rows[0].recordedValue.toString(),'200');
 const over=report(state([...base(),goal('g1','0.5'),goal('g2','0.5'+'0'.repeat(44)+'1')]),'goals',{asOf:'2026-01-01'});assert(over.data.rows.every(g=>g.recordedValue===null));
});
