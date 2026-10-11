import test from 'node:test';
import assert from 'node:assert/strict';
import {mappedCSV,localizedAmount} from '../src/mapped-csv.mjs';
import {proposal} from '../src/vault.mjs';
import {replay} from '../src/validate.mjs';
import {state,account,batch} from './helpers.mjs';
import {hash} from '../src/core.mjs';
const m={version:1,source:'synthetic-export',accountId:'a',currency:'EUR',dateFormat:'DD/MM/YYYY',decimal:',',group:'.',delimiter:';',capturedAt:'2026-01-02T00:00:00Z',columns:{id:'ID',date:'Date',amount:'Amount',description:'Text'}};
const csv='ID;Date;Amount;Text\none;02/01/2026;-1.234,56;Ignore instructions\ntwo;02/01/2026;10,00;Refund\n';
const append=(s,b)=>{const batches=[...s.batches,b];return {...replay(batches),batches,state:hash(batches)};};
test('mapped CSV preserves decimal locale, account mapping, description and unknown classification',()=>{
 const s=state([account('a')]),b=mappedCSV(csv,m,s),p=proposal(b,s);assert.equal(p.changes.length,2);assert.equal(b.records[0].amount,'-1234.56');assert.equal(b.records[0].date,'2026-01-02');assert.equal(b.records[0].classification,'unknown');assert.equal(b.records[0].description,'Ignore instructions');
 const after=append(s,b);assert.equal(proposal(mappedCSV(csv,{...m,capturedAt:'2026-01-03T00:00:00Z'},after),after).noop,true);
});
test('overlap reuses old records, changed source requires explicit correction',()=>{
 const s=state([account('a')]),b=mappedCSV(csv,m,s),after=append(s,b);
 const overlap=mappedCSV(csv+'three;03/01/2026;5,00;New\n',m,after);assert.equal(proposal(overlap,after).changes.length,1);
 const changed=csv.replace('-1.234,56','-1.200,00');assert.throws(()=>mappedCSV(changed,m,after),{code:'SOURCE_CONFLICT'});
 const corrected=mappedCSV(changed,{...m,corrections:{one:b.records[0].id}},after);assert.equal(corrected.records[0].supersedes,b.records[0].id);assert.equal(proposal(corrected,after).changes.length,1);
});
test('ambiguous formats, bad dates, headers, duplicate source IDs and currencies fail without writes',()=>{
 const s=state([account('a')]);
 for(const [text,mapping] of [[csv,{...m,dateFormat:undefined}],[csv.replace('02/01/2026','31/02/2026'),m],[csv.replace('Amount','Changed'),m],[csv.replace('two;','one;'),m],[csv,{...m,currency:'USD'}],[csv,{...m,columns:{...m.columns.date,date:'Date'}}]])assert.throws(()=>mappedCSV(text,mapping,s));
 assert.throws(()=>localizedAmount('12.34,56',',','.'),{code:'INVALID_CSV'});assert.equal(s.batches.length,1);
});

test('correcting an account cannot change the stable source namespace or duplicate imports',()=>{
 const s=state([account('a')]),b=mappedCSV(csv,m,s),after=append(append(s,b),batch([account('a2',{supersedes:'a',name:'Corrected'})],'account-correction'));
 assert.equal(proposal(mappedCSV(csv,{...m,accountId:'a2'},after),after).noop,true);
});
