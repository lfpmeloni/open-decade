import test from 'node:test';
import assert from 'node:assert/strict';
import {replay} from '../src/validate.mjs';
import {report} from '../src/reports.mjs';
import {hash} from '../src/core.mjs';
import {account,record,tx,history} from './helpers.mjs';
const category=(id,nature='essential')=>record('category',id,{name:id,nature});
const state=records=>{const batches=[{schemaVersion:2,batchId:'spending',records}];return {...replay(batches),batches,state:hash(batches),schemaVersion:2};};
const opts={from:'2026-01-01',to:'2026-01-31'};
const plain=x=>JSON.parse(JSON.stringify(x));
test('split spending, partial refund and confirmed categories produce independent totals and cash savings',()=>{
 const s=state([account('a'),history('h','a'),category('food'),category('fun','discretionary'),tx('salary','a','1000',{classification:'income'}),tx('payment','a','-100',{classification:'spending',categorySplits:[{categoryId:'food',amount:'-60'},{categoryId:'fun',amount:'-40'}]}),tx('refund','a','25',{date:'2026-01-03',classification:'spending',refundOf:'payment'}),record('budget','b',{name:'Food January',categoryId:'food',currency:'EUR',amount:'50',...opts,through:opts.to})].map(r=>{if(r.kind==='budget'){delete r.to;}return r;}));
 const r=plain(report(s,'spending',opts));assert.equal(r.data.categories.find(x=>x.categoryId==='food').netSpending,'45');assert.equal(r.data.categories.find(x=>x.categoryId==='fun').netSpending,'30');assert.equal(r.data.months[0].perCurrency.EUR.savingsRate,'0.925');assert.equal(r.data.budgets[0].remaining,'5');
});
test('bad splits, excessive refunds and overlapping budgets fail as one batch',()=>{
 const base=[account('a'),category('food'),tx('payment','a','-100',{classification:'spending'})];
 assert.throws(()=>state([...base,tx('bad','a','-5',{classification:'spending',categorySplits:[{categoryId:'food',amount:'-4'}]})]),{code:'INVALID_INPUT'});
 assert.throws(()=>state([...base,tx('r1','a','60',{classification:'spending',refundOf:'payment'}),tx('r2','a','50',{classification:'spending',refundOf:'payment'})]),{code:'INVALID_INPUT'});
 const budget=id=>record('budget',id,{name:id,categoryId:'food',currency:'EUR',amount:'50',from:'2026-01-01',through:'2026-01-31'});assert.throws(()=>state([...base,budget('b1'),budget('b2')]),{code:'INVALID_INPUT'});
});
test('missing months, irregular income, unmatched transfers and unknown flows cannot imply a savings rate',()=>{
 const s=state([account('a'),tx('salary','a','1000',{classification:'income'}),tx('unknown','a','-100')]);const r=plain(report(s,'spending',{from:'2026-01-01',to:'2026-03-31'}));assert.equal(r.data.months.length,3);assert(r.data.months.every(m=>m.perCurrency.EUR.savingsRate===null));
 const unmatched=state([account('a'),history('h','a'),tx('salary','a','1000',{classification:'income'}),tx('transfer','a','-200',{classification:'transfer',transferId:'missing'})]);assert.equal(plain(report(unmatched,'spending',opts)).data.months[0].perCurrency.EUR.savingsRate,null);
});
test('rules, changing subscription amounts and refund matches remain proposals',()=>{
 const s=state([account('a'),category('fun','discretionary'),record('classification-rule','rule',{name:'Media',contains:'Stream',categoryId:'fun',classification:'spending',enabled:true}),...['01','02','03'].map((m,i)=>tx('p'+m,'a',i===2?'-12':'-10',{date:`2026-${m}-10`,description:'Stream service'})),tx('buy','a','-30',{classification:'spending',date:'2026-01-12'}),tx('credit','a','30',{date:'2026-03-01'})]);
 const before=s.state,r=report(s,'spending-proposals',{from:'2026-01-01',to:'2026-03-31'});assert.equal(r.data.classifications.length,3);assert.equal(r.data.recurring[0].amountChanged,true);assert.deepEqual(r.data.refunds[0].candidateOriginalIds,['buy']);assert.equal(r.data.status,'proposals-only');assert.equal(s.state,before);assert.equal(s.active.find(r=>r.id==='p01').classification,'unknown');
});
test('same-day duplicate-like debits are not silently treated as recurring; bill dates preserve month-end anchor',()=>{
 const s=state([account('a'),category('fun'),...['x','y','z'].map(id=>tx(id,'a','-10',{description:'Repeated'})),record('recurring-payment','bill',{name:'Confirmed subscription',accountId:'a',currency:'EUR',amount:'10',nextDate:'2026-01-31',intervalMonths:1,active:true,subscription:true})]);
 assert.equal(report(s,'spending-proposals',opts).data.recurring.length,0);assert.deepEqual(report(s,'bills',{from:'2026-01-01',to:'2026-03-31'}).data.rows.map(x=>x.date),['2026-01-31','2026-02-28','2026-03-31']);
});
