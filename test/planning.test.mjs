import test from 'node:test';
import assert from 'node:assert/strict';
import {replay} from '../src/validate.mjs';
import {report} from '../src/reports.mjs';
import {record,observation} from './helpers.mjs';
const state=records=>replay([{schemaVersion:2,batchId:'planning',records}]);
test('fee drag uses explicit compounded fees and never computes tax savings',()=>{
 const s=state([record('fee-scenario','fee',{currency:'EUR',initial:'1000',annualGrossReturn:'0.1',currentAnnualFee:'0.02',alternativeAnnualFee:'0.01',years:1})]);
 const r=report(s,'fee-drag',{asOf:'2026-01-01',assumptions:'fee'});assert.equal(r.data.currentTerminalValue.toString(),'1078');assert.equal(r.data.alternativeTerminalValue.toString(),'1089');assert.equal(r.data.difference.toString(),'11');assert.equal(r.data.taxSavings,undefined);
});
test('debt paydown independently checks zero-interest principal and non-amortizing cases',()=>{
 const debt=record('liability','debt',{name:'Debt',currency:'EUR',responsibility:'0.5',annualRate:'0',monthlyPayment:'100'}),obs=observation('balance','debt','250');
 const r=report(state([debt,obs]),'debt-paydown',{asOf:'2026-01-01'});assert.equal(r.data.rows[0].monthsToPayoff,3);assert.equal(r.data.rows[0].schedule[2].payment.toString(),'50');assert.equal(r.data.rows[0].totalInterest.toString(),'0');
 const bad=report(state([{...debt,annualRate:'1',monthlyPayment:'1'},obs]),'debt-paydown',{asOf:'2026-01-01'});assert.equal(bad.data.rows[0].monthsToPayoff,null);assert(bad.warnings.some(w=>w.code==='DEBT_NOT_AMORTIZING'));
});
test('profile views preserve dated risk capacity separately from tolerance',()=>{
 const s=state([record('profile','p',{residences:['DE'],riskTolerance:'high',riskCapacity:'low'})]);assert.equal(report(s,'profile',{asOf:'2026-01-01'}).data.records[0].riskCapacity,'low');assert.equal(report(s,'profile',{asOf:'2025-01-01'}).data.records.length,0);
});
