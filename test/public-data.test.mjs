import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {init,read} from '../src/vault.mjs';
import {parseECB,fetchECB,publicDataStatus,publicDataProposal,ECB_URL} from '../src/public-data.mjs';
const xml=(rate='1.25')=>`<?xml version="1.0" encoding="UTF-8"?><gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref"><gesmes:subject>Reference rates</gesmes:subject><gesmes:Sender><gesmes:name>European Central Bank</gesmes:name></gesmes:Sender><Cube><Cube time='2026-01-02'><Cube currency='USD' rate='${rate}'/></Cube></Cube></gesmes:Envelope>`;
test('explicit acquisition caches vintages; offline preview and confirmation preserve revisions',async t=>{
 const v=await fs.mkdtemp(path.join(os.tmpdir(),'od-public-'));t.after(()=>fs.rm(v,{recursive:true,force:true}));await init(v,2);assert.equal((await publicDataStatus(v,'2026-01-02')).status,'missing');let calls=0;
 const fetchImpl=async(url,opts)=>{calls++;assert.equal(url,ECB_URL);assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,undefined);return new Response(xml());};
 const first=await fetchECB(v,{fetchImpl,now:()=> '2026-01-02T17:00:00Z'});assert.equal((await read(v)).active.length,0);
 const proposal=await publicDataProposal(v,first.cacheId);await publicDataProposal(v,first.cacheId,proposal.confirmation);assert.equal((await read(v)).active[0].rate,'1.25');assert.equal(calls,1);
 await publicDataProposal(v,first.cacheId,(await publicDataProposal(v,first.cacheId)).confirmation);assert.equal((await read(v)).active.length,1);
 const next=await fetchECB(v,{fetchImpl:async()=>new Response(xml('1.3')),now:()=> '2026-01-03T17:00:00Z'});assert((await publicDataStatus(v,'2026-02-01')).rows.every(r=>r.revised&&r.status==='stale'));
 const changed=await publicDataProposal(v,next.cacheId);assert.equal(changed.batch.records[0].supersedes,proposal.batch.records[0].id);await publicDataProposal(v,next.cacheId,changed.confirmation);assert.equal((await read(v)).active[0].rate,'1.3');assert.equal((await read(v)).all.size,2);
 const before=await fs.readdir(path.join(v,'public-data'));await assert.rejects(fetchECB(v,{fetchImpl:async()=>{throw new Error('network');}}),{code:'SOURCE_FAILURE'});assert.deepEqual(await fs.readdir(path.join(v,'public-data')),before);
});
test('strict ECB parser rejects malformed rates, external entities, changed layouts and duplicate currencies',()=>{
 assert.equal(parseECB(xml()).date,'2026-01-02');for(const input of [xml('0'),xml('-1'),xml('1e2'),xml().replace('2026-01-02','2026-02-30'),xml().replace('<Cube currency=',"<!DOCTYPE x SYSTEM 'file:///private'><Cube currency="),xml().replace("<Cube currency='USD' rate='1.25'/>","<Cube currency='USD' rate='1.25'/><Cube currency='USD' rate='2'/>")])assert.throws(()=>parseECB(input));
});
