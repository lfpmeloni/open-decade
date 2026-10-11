import test from 'node:test';
import assert from 'node:assert/strict';
import {replay} from '../src/validate.mjs';
import {report} from '../src/reports.mjs';
import {record,account,observation} from './helpers.mjs';
const state=records=>replay([{schemaVersion:2,batchId:'household',records}]);
const member=(id,participating=true)=>record('household-member',id,{name:id,participating});
const base=()=>[member('alex'),member('sam'),account('joint',{ownership:'0.25'}),observation('cash','joint','1000'),record('liability','debt',{name:'Debt',currency:'EUR',responsibility:'0.1'}),observation('owed','debt','400'),record('household-plan','household',{name:'Shared planning',memberIds:['alex','sam'],allocations:[{entityId:'joint',members:[{memberId:'alex',share:'0.25'},{memberId:'sam',share:'0.75'}]},{entityId:'debt',members:[{memberId:'alex',share:'0.1'},{memberId:'sam',share:'0.5'}]}]})];
const opts={asOf:'2026-01-01',assumptions:'household',base:'EUR'};
const context=(id,memberId,jurisdiction='DE')=>record('tax-context',id,{memberId,jurisdiction,taxYear:2025,residence:'resident',investmentIncome:'yes',disposals:'no',foreignAccounts:'no',wrappers:'no',retirementIncome:'no',specialCases:[]});
const doc=(id,memberId)=>record('document-reference',id,{memberId,name:id,jurisdiction:'DE',taxYear:2025,documentType:'income',status:'present',reference:id});
test('household gross-value shares do not apply personal ownership twice or alter personal reports',()=>{
 const s=state(base()),r=report(s,'household',opts);assert.equal(r.data.complete,true);assert.equal(r.data.members[0].perCurrency.EUR.netWorth.toString(),'210');assert.equal(r.data.members[1].perCurrency.EUR.netWorth.toString(),'550');assert.equal(r.data.combinedNetWorth.toString(),'760');assert.equal(r.data.unassignedShares[1].unassignedShare.toString(),'0.4');assert.equal(report(s,'net-worth',opts).data.combinedNetWorth.toString(),'210');
});
test('participation is explicit, revocable and dated; missing evidence withholds household totals',()=>{
 const off=base();off[1].participating=false;const r=report(state(off),'household',opts);assert.equal(r.data.perCurrency,null);assert.equal(r.data.members[1].perCurrency,null);assert.equal(r.data.members[1].name,undefined);assert.deepEqual(r.data.members[1].values,[]);assert.equal(r.data.members[0].perCurrency.EUR.netWorth.toString(),'210');
 const missing=base().filter(r=>r.id!=='cash');assert.equal(report(state(missing),'household',opts).data.complete,false);
 const future=base();future[1].date='2027-01-01';assert.equal(report(state(future),'household',opts).data.complete,false);
 const revoked=state([...base(),{...member('sam-off',false),supersedes:'sam'}]);assert.equal(report(revoked,'household',opts).data.combinedNetWorth,null);
});
test('household rejects overclaims, hidden participants and corrected aliases',()=>{
 const over=base();over.at(-1).allocations[0].members[1].share='0.750'+'0'.repeat(44)+'1';assert.throws(()=>state(over),{code:'INVALID_INPUT'});
 const hidden=base();hidden.at(-1).memberIds=['alex'];assert.throws(()=>state(hidden),{code:'INVALID_INPUT'});
 const alias=base();alias.push({...account('joint-new',{ownership:'0.25'}),supersedes:'joint'});alias.at(-2).allocations.push({entityId:'joint-new',members:[{memberId:'alex',share:'1'}]});assert.throws(()=>state(alias),{code:'INVALID_INPUT'});
});
test('account versus holdings coverage cannot double count a household asset',()=>{
 const records=base();records.push(record('position','position',{name:'Holding',accountId:'joint',currency:'EUR',ownership:'0.25'}),observation('holding-value','position','1000'));records.find(r=>r.id==='household').allocations.push({entityId:'position',members:[{memberId:'alex',share:'1'}]});const r=report(state(records),'household',opts);assert.equal(r.data.complete,false);assert(r.warnings.some(w=>w.code==='HOUSEHOLD_ENTITY_COVERAGE'));
});
test('member tax documents and other-country contexts never merge with another member or legacy personal scope',()=>{
 const legacy={...doc('personal-document','alex')};delete legacy.memberId;
 const s=state([...base(),context('alex-de','alex'),context('sam-de','sam'),context('sam-us','sam','US'),doc('alex-document','alex'),doc('sam-document','sam'),legacy]);
 const o={asOf:'2026-10-10',jurisdiction:'DE',year:'2025'};
 const a=report(s,'tax',{...o,member:'alex'});assert.deepEqual(a.data.documents.map(d=>d.id),['alex-document']);assert.deepEqual(a.data.otherCountryContexts,[]);assert(!JSON.stringify(a).includes('sam-document'));assert(!a.data.metadata.inputIds.includes('sam-de'));
 const b=report(s,'tax',{...o,member:'sam'});assert.deepEqual(b.data.otherCountryContexts,['US']);assert.deepEqual(b.data.documents.map(d=>d.id),['sam-document']);
 const personal=report(s,'tax',o);assert.deepEqual(personal.data.documents.map(d=>d.id),['personal-document']);assert(personal.warnings.some(w=>w.code==='MEMBER_CONTEXT_SELECTION_REQUIRED'));
 assert.throws(()=>report(s,'tax',{...o,member:'alex',context:'sam-de'}),{code:'MISSING_INPUT'});
 const revoked=state([...base(),context('sam-de','sam'),{...member('sam-off',false),supersedes:'sam'}]);assert.throws(()=>report(revoked,'tax',{...o,member:'sam'}),{code:'MISSING_INPUT'});
});

test('household cashflow applies gross shares once and excludes personal tax inputs',()=>{
 const rows=[...base(),record('history','history',{accountId:'joint',from:'2026-01-01',through:'2026-01-31',complete:true,externalFlowsComplete:true}),record('transaction','income',{accountId:'joint',currency:'EUR',amount:'1000',classification:'income'}),record('transaction','expense',{accountId:'joint',currency:'EUR',amount:'-200',classification:'spending'}),context('alex-de','alex')];
 const s=state(rows),o={from:'2026-01-01',to:'2026-01-31',assumptions:'household'},r=report(s,'household-cashflow',o);
 assert.equal(r.data.complete,true);assert.equal(r.data.perCurrency.EUR.income.toString(),'1000');assert.equal(r.data.members[0].perCurrency.EUR.spending.toString(),'-50');assert.equal(r.data.members[1].perCurrency.EUR.spending.toString(),'-150');assert(!r.data.metadata.inputIds.includes('alex-de'));assert.equal(report(s,'cashflow',o).data.perCurrency.EUR.income.toString(),'250');
 const missing=report(state(rows.filter(r=>r.kind!=='history')),'household-cashflow',o);assert.equal(missing.data.perCurrency,null);assert(missing.warnings.some(w=>w.code==='INCOMPLETE_HISTORY'));
 const late=rows.map(r=>r.id==='household'?{...r,date:'2026-01-10'}:r);assert.equal(report(state(late),'household-cashflow',o).data.complete,false);
 const revoked=rows.map(r=>r.id==='sam'?{...r,participating:false}:r);assert.equal(report(state(revoked),'household-cashflow',o).data.members[1].perCurrency,null);
});
test('household cashflow does not silently classify transfers outside its declared scope',()=>{
 const rows=[...base(),account('other'),record('transaction','out',{accountId:'joint',currency:'EUR',amount:'-100',classification:'transfer',transferId:'pair'}),record('transaction','in',{accountId:'other',currency:'EUR',amount:'100',classification:'transfer',transferId:'pair'})];
 const r=report(state(rows),'household-cashflow',{from:'2026-01-01',to:'2026-01-31',assumptions:'household'});assert.equal(r.data.complete,false);assert(r.warnings.some(w=>w.code==='UNMATCHED_TRANSFER'));assert.equal(r.data.members[0].perCurrency.EUR.unknown.toString(),'-25');
});

const pooled=()=>record('retirement-scenario','pooled',{currency:'EUR',startMonth:'2026-01-01',months:4,initial:'100',monthlyIncome:'100',monthlySpending:'50',monthlyPension:'20',retireAfterMonths:2,annualReturn:'0',annualInflation:'0',annualIncomeGrowth:'0',annualPensionGrowth:'0',returnsNetOfFees:true,expenseIds:[],variants:[{label:'Earlier',retireAfterMonths:0}]});
const scenarioRows=()=>{const rows=base();rows.find(r=>r.kind==='household-plan').scenarioId='pooled';return [...rows,pooled(),context('alex-de','alex'),context('sam-de','sam')];};
test('household pooled showcase reuses retirement, preserves shortfalls and separate personal contexts',()=>{
 const s=state(scenarioRows()),r=report(s,'household-scenario',opts),personal=report(s,'retirement',{...opts,assumptions:'pooled'});assert.equal(r.data.projectionAvailable,true);assert.deepEqual(r.data.cases,personal.data.cases);assert.equal(r.data.cases[0].terminalNominal.toString(),'140');assert.equal(r.data.cases[1].unfunded.toString(),'20');assert.equal(r.data.cases[1].firstShortfall,'2026-04-30');assert.equal(r.data.metadata.method,'household-scenario-v1');assert.deepEqual(r.data.metadata.inputIds,['alex','household','pooled','sam']);assert(!JSON.stringify(r).includes('alex-de'));assert.equal(report(s,'net-worth',opts).data.combinedNetWorth.toString(),'210');
});
test('household showcase requires effective opt-in and confirmed same-currency expenses',()=>{
 const off=scenarioRows();off.find(r=>r.id==='sam').participating=false;const r=report(state(off),'household-scenario',opts);assert.equal(r.data.projectionAvailable,false);assert.deepEqual(r.data.cases,[]);assert.equal(r.data.members[1].name,undefined);
 const late=scenarioRows();late.find(r=>r.id==='sam').date='2026-01-02';assert.equal(report(state(late),'household-scenario',{...opts,asOf:'2026-01-02'}).data.projectionAvailable,false);
 const expense=record('planned-expense','expense',{name:'Expense',currency:'USD',amount:'10',dueDate:'2026-02-01',essential:true}),rows=scenarioRows();rows.find(r=>r.id==='pooled').expenseIds=['expense'];const missing=report(state([...rows,expense]),'household-scenario',opts);assert.equal(missing.data.projectionAvailable,false);assert(missing.warnings.some(w=>w.code==='SCENARIO_EXPENSE_UNAVAILABLE'));
 const invalid=scenarioRows();invalid.find(r=>r.kind==='household-plan').scenarioId='joint';assert.throws(()=>state(invalid),{code:'INVALID_REFERENCE'});
 assert.throws(()=>report(state(base()),'household-scenario',opts),{code:'MISSING_INPUT'});
});
