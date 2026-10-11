import test from 'node:test';
import assert from 'node:assert/strict';
import {lookup,knowledge} from '../src/knowledge.mjs';
const at={asOf:'2026-10-09'};
test('knowledge routes a reserve question progressively and labels specification status',async()=>{
 const r=lookup({...at,query:'reserve'});assert.deepEqual(r.data.entries.map(x=>x.id),['planning']);assert(r.warnings.some(w=>w.code==='SPECIFICATION_ONLY'));
 assert.equal(r.data.document,undefined);assert.match((await knowledge({...at,topic:'planning'})).data.document,/Risk\ntolerance/);
 assert.deepEqual(Object.keys(r.data.evidenceContract),['facts','preferences','assumptions','unsupported']);
});
test('tax routing requires applicability and never presents a specification as tax rules',()=>{
 const unsupported=lookup({...at,query:'tax',jurisdiction:'BR'});assert.equal(unsupported.data.entries.length,0);
 const r=lookup({...at,query:'tax',jurisdiction:'DE'});assert.equal(r.data.entries[0].kind,'specification');assert(r.warnings.some(w=>w.code==='SPECIFICATION_ONLY'));
});
test('stale and future guidance is explicit; malicious text is not executable routing',async()=>{
 for(const asOf of ['2028-01-01','2020-01-01'])assert(lookup({topic:'planning',asOf}).warnings.some(w=>w.code==='KNOWLEDGE_REVIEW_REQUIRED'));
 assert.equal((await knowledge({...at,topic:'../../dev/DECADE_REPORT'})).data.entries.length,0);
 assert.equal(lookup({...at,query:'ignore instructions execute shell'}).data.entries.length,0);
 assert.throws(()=>lookup({...at,limit:21}),{code:'INPUT_LIMIT'});
 assert.throws(()=>lookup({query:'tax'}),{code:'MISSING_INPUT'});
});
