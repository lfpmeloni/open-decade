import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {init,read} from '../src/vault.mjs';
import {parseEconomic,fetchEconomic,economicData,economicSeries} from '../src/economic-data.mjs';
const rate=await fs.readFile(new URL('../fixtures/public-data/deposit-rate.csv',import.meta.url),'utf8'),inflation=await fs.readFile(new URL('../fixtures/public-data/inflation.csv',import.meta.url),'utf8');
test('economic evidence keeps units, negative rates, missing observations and preliminary inflation explicit',()=>{
 assert.equal(parseEconomic(rate,'ecb-deposit-rate').observations[0].value,'-0.5');assert.equal(parseEconomic(inflation,'euro-area-inflation').observations[1].quality,'estimated-or-provisional');assert.equal(parseEconomic(rate.replace('0.25,A',',M'),'ecb-deposit-rate').observations[1].value,null);
 for(const text of [rate.replace('PCPA','PCCH'),rate.replace('0.25','NaN'),rate.replace('2026-01-02','2026-01-01'),rate.replace('2026-01-02','2026-02-30'),rate.replace('KEY,','Series,'),rate.replace('PCPA,0','PCPA,2')])assert.throws(()=>parseEconomic(text,'ecb-deposit-rate'));
});
test('economic acquisition is explicit and bounded; cached vintage replay distinguishes revisions, stale and future data',async t=>{
 const v=await fs.mkdtemp(path.join(os.tmpdir(),'od-economics-'));t.after(()=>fs.rm(v,{recursive:true,force:true}));await init(v,2);assert.equal((await economicData(v,{series:'ecb-deposit-rate',asOf:'2026-01-02'})).status,'missing');
 let calls=0;const first=await fetchEconomic(v,'ecb-deposit-rate',{fetchImpl:async(url,options)=>{calls++;assert.equal(url,economicSeries[0].url);assert.equal(options.redirect,'error');return new Response(rate);},now:()=> '2026-01-02T12:00:00Z'});
 await fetchEconomic(v,'ecb-deposit-rate',{fetchImpl:async()=>new Response(rate.replace('0.25','0.5')),now:()=> '2026-01-03T12:00:00Z'});
 const current=await economicData(v,{series:'ecb-deposit-rate',asOf:'2026-02-01'});assert.equal(current.selected.observations[1].revised,true);assert.equal(current.selected.observations[1].status,'stale');assert.equal(current.selected.observations[1].value,'0.5');
 const original=await economicData(v,{series:'ecb-deposit-rate',asOf:'2026-02-01',cache:first.cacheId});assert.equal(original.selected.observations[1].value,'0.25');
 const earlier=await economicData(v,{series:'ecb-deposit-rate',asOf:'2026-01-02'});assert.equal(earlier.selected.observations[1].revised,false);assert.equal(earlier.selected.cacheId,first.cacheId);assert.equal((await economicData(v,{series:'ecb-deposit-rate',asOf:'2025-01-01'})).status,'future-only');
 await assert.rejects(fetchEconomic(v,'ecb-deposit-rate',{fetchImpl:async()=>{throw Error('secret path');}}),e=>e.code==='SOURCE_FAILURE'&&!e.message.includes('secret'));
 assert.equal((await read(v)).active.length,0);assert.equal(calls,1);assert.equal((await economicData(v,{series:'ecb-deposit-rate',asOf:'2026-02-01'})).vintages.length,2);
});
