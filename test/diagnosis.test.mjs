import test from 'node:test';
import assert from 'node:assert/strict';
import {replay} from '../src/validate.mjs';
import {report} from '../src/reports.mjs';
import {account,observation,record,tx,history} from './helpers.mjs';
const policy=(fields={})=>record('investment-policy','policy',{name:'Synthetic policy',currency:'EUR',reserveMonths:'3',maxInstitutionWeight:'0.6',maxIssuerWeight:'0.7',liquidEntityIds:['a'],assetBands:[],reviewDate:'2027-01-01',rationale:'Explicit synthetic user choices',...fields});
const state=records=>replay([{schemaVersion:2,batchId:'diagnosis',records}]);
const options={from:'2026-01-01',asOf:'2026-01-31'};
const base=()=>[record('institution','bank',{name:'Synthetic bank'}),account('a',{institutionId:'bank'}),observation('cash','a','1000',{date:'2026-01-31'}),history('h','a'),record('category','food',{name:'Food',nature:'essential'}),tx('food-pay','a','-100',{classification:'spending',categorySplits:[{categoryId:'food',amount:'-100'}]}),policy()];
test('diagnosis uses explicit policy reserve and institution thresholds with references',()=>{
 const r=report(state(base()),'diagnosis',options);assert.equal(r.data.reserveMonths.toString(),'10');
 const concentration=r.data.findings.find(f=>f.code==='INSTITUTION_EXPOSURE');assert.equal(concentration.severity,'attention');assert.equal(concentration.observed.weight.toString(),'1');assert.equal(concentration.threshold,'0.6');assert.equal(concentration.policyId,'policy');for(const id of ['cash','a','bank','policy'])assert(concentration.inputIds.includes(id));assert.equal(r.data.verdict,'incomplete'); // issuer/costs unresolved
 assert(r.data.findings.every(f=>f.method&&f.remedy&&Array.isArray(f.inputIds)&&Array.isArray(f.limitations)));
});
test('missing history and missing policy cannot produce a reassuring review',()=>{
 const noPolicy=report(state(base().filter(r=>r.kind!=='investment-policy')),'diagnosis',options);assert.equal(noPolicy.data.verdict,'incomplete');
 const noHistory=report(state(base().filter(r=>r.kind!=='history')),'diagnosis',options);assert.equal(noHistory.data.reserveMonths,null);assert.equal(noHistory.data.findings.find(f=>f.code==='RESERVE_COVERAGE').severity,'unknown');
});
test('future liabilities preserve explicit currency gaps and unfunded needs',()=>{
 const expenses=[record('planned-expense','rent',{name:'Rent',currency:'EUR',amount:'1200',dueDate:'2026-02-01',essential:true}),record('planned-expense','travel',{name:'Travel',currency:'USD',amount:'500',dueDate:'2026-03-01',essential:false})];
 const r=report(state([...base(),...expenses]),'diagnosis',options);assert.equal(r.data.timeline[0].unfunded.toString(),'200');assert.equal(r.data.timeline[1].remainingRecordedLiquidity,null);assert(r.warnings.some(w=>w.code==='MISSING_FX'));
});
test('invalid policy bands and unresolved liquid references reject the whole batch',()=>{
 assert.throws(()=>state([...base().filter(r=>r.kind!=='investment-policy'),policy({assetBands:[{assetClass:'equity',minimum:'0.8',maximum:'0.5'}]})]),{code:'INVALID_INPUT'});
 assert.throws(()=>state([...base().filter(r=>r.kind!=='investment-policy'),policy({liquidEntityIds:['missing']})]),{code:'INVALID_REFERENCE'});
});

test('policy liquidity cannot count original and corrected aliases twice',()=>{
 const a=account('a'),updated={...a,id:'updated',supersedes:'a'};
 const p=record('investment-policy','policy',{name:'Policy',currency:'EUR',reserveMonths:'3',maxInstitutionWeight:'1',maxIssuerWeight:'1',liquidEntityIds:['a','updated'],assetBands:[],reviewDate:'2027-01-01',rationale:'Synthetic'});
 assert.throws(()=>replay([{schemaVersion:2,batchId:'alias-policy',records:[a,updated,p]}]),e=>e.code==='INVALID_INPUT');
});


test('diagnosis protects goal earmarks, reports funding and retains overdue obligations',()=>{
 const rows=[...base(),record('goal','reserve-goal',{name:'Goal',currency:'EUR',target:'800',targetDate:'2027-01-01',entityIds:['a'],allocations:[{entityId:'a',share:'0.5'}]}),record('planned-expense','overdue',{name:'Unresolved bill',currency:'EUR',amount:'600',dueDate:'2026-01-15',essential:true})];
 const r=report(state(rows),'diagnosis',options);assert.equal(r.data.reserveMonths.toString(),'5');assert.equal(r.data.unallocatedLiquidValue.toString(),'500');assert.equal(r.data.timeline[0].overdue,true);assert.equal(r.data.timeline[0].unfunded.toString(),'100');
 const funding=r.data.findings.find(f=>f.code==='GOAL_FUNDING');assert.equal(funding.observed.unfunded.toString(),'300');assert.equal(funding.severity,'attention');assert(funding.inputIds.includes('reserve-goal'));assert.equal(r.data.metadata.method,'diagnosis-v2');
 rows.push(record('goal','competing',{name:'Conflict',currency:'EUR',target:'500',targetDate:'2027-01-01',entityIds:['a']}));const conflict=report(state(rows),'diagnosis',options);assert.equal(conflict.data.reserveMonths,null);assert.equal(conflict.data.unallocatedLiquidValue,null);assert(conflict.data.findings.filter(f=>f.code==='GOAL_FUNDING').every(f=>f.severity==='unknown'));
});
test('stale obligation FX cannot produce reassurance',()=>{
 const rows=[...base(),record('planned-expense','foreign',{name:'Cost',currency:'USD',amount:'100',dueDate:'2026-02-01',essential:true}),record('fx','old-rate',{date:'2025-01-01',from:'USD',to:'EUR',rate:'1'})];const r=report(state(rows),'diagnosis',options);assert.equal(r.data.timeline[0].remainingRecordedLiquidity,null);assert.equal(r.data.findings.find(f=>f.code==='OBLIGATION_TIMELINE').severity,'unknown');assert.equal(r.data.verdict,'incomplete');
});

const complete=()=>[
 record('institution','bank',{name:'Synthetic custodian'}),account('a',{institutionId:'bank',coverage:'holdings'}),
 record('position','holding',{name:'Synthetic holding',accountId:'a',currency:'EUR',ownership:'1',instrumentId:'SYNTHETIC',issuer:'Synthetic issuer',assetClass:'cash'}),
 observation('value','holding','1000',{date:'2026-01-31'}),history('h','a'),
 record('fund','disclosure',{instrumentId:'SYNTHETIC',shareClass:'Synthetic only',holdings:[],ongoingCharge:'0.01'}),
 record('category','food',{name:'Food',nature:'essential'}),tx('food-pay','a','-100',{classification:'spending',categorySplits:[{categoryId:'food',amount:'-100'}]}),
 policy({liquidEntityIds:['holding'],maxInstitutionWeight:'1',maxIssuerWeight:'1',assetBands:[{assetClass:'cash',minimum:'1',maximum:'1'}]}),
 record('goal','goal',{name:'Goal',currency:'EUR',target:'200',targetDate:'2027-01-01',entityIds:['holding'],allocations:[{entityId:'holding',share:'0.2'}]})
];
test('complete recorded review has independently calculated funding, reserve, costs and traceable findings',()=>{
 const rows=complete(),r=report(state(rows),'diagnosis',options);assert.deepEqual(r.warnings,[]);assert.equal(r.data.verdict,'review-recorded-findings');
 assert.equal(r.data.reserveMonths.toString(),'8');assert.equal(r.data.goalFunding[0].recordedValue.toString(),'200');assert.equal(r.data.goalFunding[0].unfunded.toString(),'0');assert.equal(r.data.bands[0].weight.toString(),'1');
 const costs=r.data.findings.find(f=>f.code==='DISCLOSED_COSTS');assert.equal(costs.observed.perCurrency.EUR.constantValueAnnualEstimate.toString(),'10');for(const id of ['holding','value','disclosure','policy'])assert(costs.inputIds.includes(id));
 for(const f of r.data.findings){assert.equal(f.method,'diagnosis-v2');assert(f.inputIds.includes('policy'));assert(f.inputIds.every(id=>rows.some(r=>r.id===id)));assert('threshold' in f);assert(f.remedy);assert(Array.isArray(f.limitations));}
 const shortfall=complete();shortfall.find(r=>r.id==='goal').target='300';assert.equal(report(state(shortfall),'diagnosis',options).data.verdict,'attention-required');
 for(const kind of ['history','fund','category']){const missing=complete().filter(r=>r.kind!==kind);if(kind==='category')delete missing.find(r=>r.id==='food-pay').categorySplits;assert.equal(report(state(missing),'diagnosis',options).data.verdict,'incomplete');}
});
test('unsupported instrument activity cannot be hidden by otherwise complete diagnosis',()=>{
 const rows=complete();rows.find(r=>r.id==='holding').instrumentType='unknown';const r=report(state(rows),'diagnosis',options);assert.equal(r.data.verdict,'incomplete');const unresolved=r.data.findings.find(f=>f.code==='UNRESOLVED_REVIEW_INPUTS');assert.equal(unresolved.severity,'unknown');assert(unresolved.inputIds.includes('holding'));
});
