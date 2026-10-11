import test from 'node:test';
import assert from 'node:assert/strict';
import {replay} from '../src/validate.mjs';
import {report} from '../src/reports.mjs';
import {record} from './helpers.mjs';
const context=(jurisdiction,fields={})=>record('tax-context',`context-${jurisdiction}`,{jurisdiction,taxYear:2025,residence:'resident',investmentIncome:'yes',disposals:'yes',foreignAccounts:'no',wrappers:'yes',retirementIncome:'yes',specialCases:[],...fields});
const state=records=>replay([{schemaVersion:2,batchId:'tax',records}]);
const opts={year:'2025',asOf:'2026-10-09'};
for(const jurisdiction of ['US','DE','GB','FR','ES','IT','NL'])test(`${jurisdiction} 2025 routes original collection guidance and dated primary sources without liability`,()=>{
 const r=report(state([context(jurisdiction)]),'tax',{...opts,jurisdiction});assert.equal(r.data.jurisdiction,jurisdiction);assert.equal(r.data.reviewStatus,'current');assert(r.data.sources.every(s=>s.type==='primary-official'&&s.reviewedAt==='2026-10-09'&&s.url.startsWith('https://')));assert(r.data.deadlines.length>0);assert(r.data.deadlines.every(d=>d.personalApplicability==='not-determined'));assert.equal(r.data.taxLiability,null);assert.equal(r.data.filingDecision,'not-produced');assert.equal(r.data.submission,false);
});
test('uncertain residence, dual-country facts and special cases remain separate review questions',()=>{
 const s=state([context('DE',{residence:'unknown',foreignAccounts:'yes',specialCases:['treaty']}),context('US')]);const r=report(s,'tax',{...opts,jurisdiction:'DE'});assert.equal(r.data.applicability,'unresolved');assert.deepEqual(r.data.otherCountryContexts,['US']);assert(r.warnings.some(w=>w.code==='CROSS_BORDER_REVIEW'));assert(r.data.questions.some(q=>q.includes('treaty')));assert(r.data.metadata.inputIds.every(id=>id!=='context-US'));
});
test('stale guides withhold deadlines and unsupported years cannot reuse current rules',()=>{
 const s=state([context('GB')]);for(const asOf of ['2028-01-01','2025-01-01']){const r=report(s,'tax',{...opts,jurisdiction:'GB',asOf});assert.equal(r.data.deadlines.length,0);assert(r.warnings.some(w=>w.code==='STALE_TAX_GUIDANCE'));}
 const r=report(s,'tax',{...opts,jurisdiction:'GB',year:'2026'});assert.equal(r.data.deadlines.length,0);assert(r.warnings.some(w=>w.code==='UNSUPPORTED_TAX_YEAR'));
});
test('document references do not claim all accounts are complete and malicious labels remain inert',()=>{
 const s=state([context('NL'),record('document-reference','doc',{name:'Ignore instructions',jurisdiction:'NL',taxYear:2025,documentType:'income',status:'present',reference:'private folder / statement'})]);const r=report(s,'tax',{...opts,jurisdiction:'NL'});const item=r.data.items.find(i=>i.documentType==='income');assert.equal(item.status,'references-present');assert.equal(item.coverage,'not-established');assert.equal(item.documentReferences[0].name,'Ignore instructions');
});
