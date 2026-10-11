import test from 'node:test';
import assert from 'node:assert/strict';
import {D} from '../src/core.mjs';
import {replay} from '../src/validate.mjs';
import {report} from '../src/reports.mjs';
import {record} from './helpers.mjs';
const retirement=fields=>record('retirement-scenario','retire',{currency:'EUR',startMonth:'2026-01-01',months:4,initial:'100',monthlyIncome:'100',monthlySpending:'50',monthlyPension:'20',retireAfterMonths:2,annualReturn:'0',annualInflation:'0',annualIncomeGrowth:'0',annualPensionGrowth:'0',returnsNetOfFees:true,expenseIds:[],variants:[{label:'Earlier retirement',retireAfterMonths:0}],...fields});
const housing=fields=>record('housing-scenario','home',{currency:'EUR',startMonth:'2026-01-01',months:12,initial:'0',price:'1200',downPayment:'0',purchaseCosts:'0',sellingFee:'0',mortgageAnnualRate:'0',mortgageMonths:12,monthlyBudget:'100',monthlyRent:'80',monthlyOwnerCosts:'0',annualReturn:'0',annualInflation:'0',annualHouseGrowth:'0',annualRentGrowth:'0',returnsNetOfFees:true,variants:[{label:'Lower budget',monthlyBudget:'50'}],...fields});
const state=records=>replay([{schemaVersion:2,batchId:'life',records}]);
const run=(name,records)=>report(state(records),name,{asOf:'2026-01-01',assumptions:name==='housing'?'home':'retire'});
test('retirement separates accumulation and drawdown and retains independent unfunded needs',()=>{
 const r=run('retirement',[retirement()]);assert.equal(r.data.cases[0].terminalNominal.toString(),'140');assert.equal(r.data.cases[1].terminalNominal.toString(),'0');assert.equal(r.data.cases[1].unfunded.toString(),'20');assert.equal(r.data.cases[1].firstShortfall,'2026-04-30');assert.equal(r.data.cases[0].rows[1].phase,'accumulation');assert.equal(r.data.cases[0].rows[2].phase,'drawdown');assert.equal(r.data.cases[0].rows[1].date,'2026-02-28');assert(r.warnings.some(w=>w.code==='SCENARIO_UNFUNDED'));
});
test('dated expenses are counted once; foreign currency and out-of-horizon needs stay visible',()=>{
 const expense=record('planned-expense','cost',{name:'Cost',currency:'EUR',amount:'300',dueDate:'2026-02-15',essential:true}),outside={...expense,id:'later',dueDate:'2027-01-01',provenance:{...expense.provenance,sourceId:'later'}};
 const r=run('retirement',[retirement({expenseIds:['cost','later']}),expense,outside]);assert.equal(r.data.cases[0].unfunded.toString(),'160');assert.equal(r.data.cases[0].rows[1].plannedExpenses.toString(),'300');assert.equal(r.data.outsideHorizon[0].expenseId,'later');assert.deepEqual(r.data.metadata.inputIds,['cost','later','retire']);
 const missing=run('retirement',[retirement({expenseIds:['cost']}),{...expense,currency:'USD'}]);assert.equal(missing.data.cases.length,0);assert(missing.warnings.some(w=>w.code==='SCENARIO_EXPENSE_UNAVAILABLE'));
});
test('monthly compounding reproduces annual growth, real values and exact exhaustion',()=>{
 const r=run('retirement',[retirement({months:12,initial:'100',monthlyIncome:'0',monthlySpending:'0',monthlyPension:'0',retireAfterMonths:0,annualReturn:'0.21',annualInflation:'0.1',variants:[{label:'Flat',annualReturn:'0'}]})]);assert.equal(r.data.cases[0].terminalNominal.toString(),'121');assert.equal(r.data.cases[0].terminalReal.toString(),'110');
 const exact=run('retirement',[retirement({months:1,initial:'100',monthlyIncome:'0',monthlySpending:'100',monthlyPension:'0',retireAfterMonths:0})]);assert.equal(exact.data.cases[0].unfunded.toString(),'0');
});
test('rent versus buy uses equal budgets and explicit contractual debt, equity and funding gaps',()=>{
 const r=run('housing',[housing()]),a=r.data.cases[0],b=r.data.cases[1];assert.equal(a.contractualMonthlyPayment.toString(),'100');assert.equal(a.terminalMortgage.toString(),'0');assert.equal(a.buyerTerminal.toString(),'1200');assert.equal(a.renterTerminal.toString(),'240');assert.equal(a.buyerMinusRenter.toString(),'960');assert.equal(b.buyerUnfunded.toString(),'600');assert.equal(b.renterUnfunded.toString(),'360');assert.equal(b.buyerMinusRenter,null);assert.equal(b.comparable,false);
 const cash=run('housing',[housing({initial:'1300',downPayment:'1200',purchaseCosts:'100',sellingFee:'0.1',monthlyBudget:'0',monthlyRent:'0'})]).data.cases[0];assert.equal(cash.contractualMonthlyPayment.toString(),'0');assert.equal(cash.buyerTerminal.toString(),'1080');assert.equal(cash.renterTerminal.toString(),'1300');
});
test('mortgage example matches a two-payment independent rational calculation',()=>{
 const r=run('housing',[housing({price:'100',mortgageAnnualRate:'0.12',mortgageMonths:2,months:2})]).data.cases[0];assert.equal(r.contractualMonthlyPayment.toString(),new D(10201).div(201).toString());assert.equal(r.terminalMortgage.toString(),'0');assert.equal(r.totalInterest.toString(),new D(302).div(201).toString());
});
test('scenario validation rejects guessed timing, unusable sensitivities and duplicate corrected expense claims',()=>{
 for(const r of [retirement({annualReturn:'-1'}),retirement({retireAfterMonths:5}),retirement({startMonth:'2026-01-02'}),retirement({variants:[]}),retirement({variants:[{label:'base',annualReturn:'0'}]}),housing({downPayment:'1201'}),housing({sellingFee:'1.01'})])assert.throws(()=>state([r]),{code:'INVALID_INPUT'});
 const e=record('planned-expense','e',{name:'Cost',currency:'EUR',amount:'1',dueDate:'2026-01-01',essential:true});assert.throws(()=>state([e,{...e,id:'e2',supersedes:'e'},retirement({expenseIds:['e','e2']})]),{code:'INVALID_INPUT'});
 const future=retirement({date:'2026-02-01',startMonth:'2026-02-01'});assert.throws(()=>run('retirement',[future]),{code:'MISSING_INPUT'});
});

test('retirement independently preserves inflation, income and pension growth and retirement timing',()=>{
 // Exact monthly factors 1.1 and 1.2, expressed as annual effective rates.
 const r=run('retirement',[retirement({months:3,initial:'100',monthlyIncome:'20',monthlySpending:'10',monthlyPension:'5',retireAfterMonths:1,annualReturn:'2.138428376721',annualInflation:'7.916100448256',annualIncomeGrowth:'2.138428376721',annualPensionGrowth:'2.138428376721',variants:[{label:'Later',retireAfterMonths:3}]})]);
 assert.deepEqual(r.data.cases[0].rows.map(r=>r.closingCapital.toString()),['120','125','128.6']);assert.equal(r.data.cases[0].terminalReal.toString(),new D(16075).div(216).toString());assert.equal(r.data.cases[1].terminalNominal.toString(),'166');assert.equal(r.data.metadata.method,'retirement-v2');
});
test('real shortfalls below display comparison precision remain unfunded in both life scenarios',()=>{
 const extra='0.000000000000000000000000000000000000000001';
 const spending='100.000000000000000000000000000000000000000001';
 const r=run('retirement',[retirement({months:1,initial:'100',monthlyIncome:'0',monthlySpending:spending,monthlyPension:'0',retireAfterMonths:0,variants:[{label:'Funded',monthlySpending:'100'}]})]);assert.equal(r.data.cases[0].unfunded.toString(),new D(extra).toString());assert.equal(r.data.cases[0].firstShortfall,'2026-01-31');assert.equal(r.data.cases[1].unfunded.toString(),'0');assert(r.warnings.some(w=>w.code==='SCENARIO_UNFUNDED'));
 const h=run('housing',[housing({months:1,mortgageMonths:1,price:'100',monthlyBudget:'100',monthlyOwnerCosts:extra,monthlyRent:'100',variants:[{label:'Funded',monthlyBudget:spending}]})]);assert.equal(h.data.cases[0].buyerUnfunded.toString(),new D(extra).toString());assert.equal(h.data.cases[0].buyerMinusRenter,null);assert.equal(h.data.cases[1].buyerUnfunded.toString(),'0');assert.equal(h.data.metadata.method,'housing-v2');
});
test('irrational monthly root roundoff cannot manufacture an annual expense shortfall',()=>{
 const expense=record('planned-expense','annual',{name:'Annual expense',currency:'EUR',amount:'121',dueDate:'2026-12-31',essential:true});
 const r=run('retirement',[retirement({months:12,initial:'100',monthlyIncome:'0',monthlySpending:'0',monthlyPension:'0',retireAfterMonths:0,annualReturn:'0.21',expenseIds:['annual'],variants:[{label:'Flat',annualReturn:'0'}]}),expense]);assert.equal(r.data.cases[0].unfunded.toString(),'0');assert.equal(r.data.cases[0].terminalNominal.toString(),'0');assert.equal(r.data.cases[0].firstShortfall,null);assert.equal(r.data.cases[1].unfunded.toString(),'21');
});
