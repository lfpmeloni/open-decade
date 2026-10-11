import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {init,read,preview,apply} from '../src/vault.mjs';
import {account,batch} from './helpers.mjs';
import {configureConnection,connectionStatus,disconnectConnection,syncConnection,connectionProposal} from '../src/connections.mjs';
import {credentialStore} from '../src/credentials.mjs';
import {fetchFlex} from '../src/flex.mjs';
const csv=await fs.readFile(new URL('../fixtures/connections/cash.csv',import.meta.url),'utf8'),config=JSON.parse(await fs.readFile(new URL('../fixtures/connections/ibkr-config.json',import.meta.url)));
const token='SYNTHETIC_SECRET_123456789',store={read:async()=>token,clear:async()=>{}},now=()=> '2026-10-11T12:00:00Z';
const generated='<FlexStatementResponse><Status>Success</Status><ReferenceCode>123</ReferenceCode><url>https://evil.example/ignore</url></FlexStatementResponse>';
const error=code=>`<FlexStatementResponse><Status>Fail</Status><ErrorCode>${code}</ErrorCode><ErrorMessage>${token}</ErrorMessage></FlexStatementResponse>`;
const responses=(text=csv)=>async(url,options)=>{assert.equal(new URL(url).hostname,'ndcdyn.interactivebrokers.com');assert.equal(new URL(url).searchParams.get('t'),token);assert.equal(options.redirect,'error');return new Response(url.includes('SendRequest')?generated:text);};
async function setup(t){const v=await fs.mkdtemp(path.join(os.tmpdir(),'od-flex-'));t.after(()=>fs.rm(v,{recursive:true,force:true}));await init(v,2);const b=batch([account('a')]);await apply(v,b,(await preview(v,b)).confirmation);await configureConnection(v,config);return v;}
test('Flex protocol uses fixed read-only endpoints, bounded retries and redacted failures',async()=>{
 const urls=[],delays=[];let get=0;
 const result=await fetchFlex({token,queryId:'12345',periodDays:31},{fetchImpl:async(url,options)=>{urls.push(url);if(url.includes('SendRequest'))return responses()(url,options);get++;return new Response(get===1?error('1019').replace(token,'Preparing'):csv);},wait:async ms=>delays.push(ms)});
 assert.equal(result,csv);assert.equal(get,2);assert(delays.every(ms=>ms===10000));assert(urls.every(u=>new URL(u).hostname==='ndcdyn.interactivebrokers.com'));
 await assert.rejects(fetchFlex({token,queryId:'12345',periodDays:31},{fetchImpl:async()=>new Response(error('1012').replace(token,'Expired')),wait:async()=>{}}),e=>e.code==='MISSING_INPUT'&&!e.message.includes(token));
 for(const fetchImpl of [async()=>{throw Error('failed '+token);},async()=>new Response(error('1015')),async()=>new Response('<!DOCTYPE x><Status>Success</Status>')])await assert.rejects(fetchFlex({token,queryId:'12345',periodDays:31},{fetchImpl,wait:async()=>{}}),e=>!JSON.stringify(e).includes(token)&&!e.message.includes(token));
 let attempts=0;await assert.rejects(fetchFlex({token,queryId:'12345',periodDays:31},{fetchImpl:async()=>{attempts++;return new Response('',{status:429});},wait:async()=>{}}),{code:'SOURCE_FAILURE'});assert.equal(attempts,3);
});
test('connection sync saves proposals only, deduplicates windows and preserves explicit corrections without credentials in vault',async t=>{
 const v=await setup(t),first=await syncConnection(v,{store,fetchImpl:responses(),wait:async()=>{},now});assert.equal((await read(v)).active.length,1);assert.equal(first.changes.length,2);assert.equal((await connectionStatus(v)).productionVerified,false);
 const offline=await connectionProposal(v,first.proposalId);assert.equal(offline.confirmation,first.confirmation);await apply(v,offline.batch,offline.confirmation);const repeat=await syncConnection(v,{store,fetchImpl:responses(),wait:async()=>{},now});assert.equal(repeat.noop,true);
 const changed=csv.replace('-12.50','-13.50');await assert.rejects(syncConnection(v,{store,fetchImpl:responses(changed),wait:async()=>{},now}),{code:'SOURCE_CONFLICT'});
 await configureConnection(v,{...config,mapping:{...config.mapping,corrections:{'SYNTHETIC-2':first.batch.records[1].id}}});const correction=await syncConnection(v,{store,fetchImpl:responses(changed),wait:async()=>{},now});assert.equal(correction.changes.length,1);assert.equal(correction.batch.records[1].supersedes,first.batch.records[1].id);
 for(const name of await fs.readdir(path.join(v,'connections')))assert(!(await fs.readFile(path.join(v,'connections',name),'utf8')).includes(token));
 const off=await disconnectConnection(v,{store});assert.equal(off.disconnected,true);await assert.rejects(syncConnection(v,{store,fetchImpl:responses(),wait:async()=>{},now}),{code:'MISSING_INPUT'});assert.equal((await connectionStatus(v)).status,'disconnected');
});
test('missing accounts, expired config and concurrent disconnect never save fetched financial records',async t=>{
 const v=await setup(t);await assert.rejects(syncConnection(v,{store,fetchImpl:responses(csv.replaceAll('SYNTHETIC-ACCOUNT','OTHER')),wait:async()=>{},now}),{code:'INVALID_REFERENCE'});assert.equal((await read(v)).active.length,1);
 await assert.rejects(configureConnection(v,{...config,token}),{code:'INVALID_INPUT'});
 await assert.rejects(syncConnection(v,{store,now:()=> '2027-01-01T00:00:00Z',fetchImpl:async()=>{throw Error('must not fetch');}}),{code:'MISSING_INPUT'});
 let done=false;await assert.rejects(syncConnection(v,{store,fetchImpl:async(url,opts)=>{if(!done){done=true;await disconnectConnection(v,{store});}return responses()(url,opts);},wait:async()=>{},now}),{code:'CONFIRMATION_CHANGED'});assert.equal((await read(v)).active.length,1);
});
test('credential boundary reads OS store with no secret arguments and sanitizes utility errors',async()=>{
 const commands=[],keyring=credentialStore('/synthetic/vault',{platform:'linux',run:async(...args)=>{commands.push(args);return {stdout:token+'\n'};}});assert.equal(await keyring.read(),token);await keyring.clear();assert(!JSON.stringify(commands).includes(token));assert.equal(commands[0][0],'secret-tool');
 await assert.rejects(credentialStore('/synthetic',{platform:'linux',run:async()=>{throw Error(token);}}).read(),e=>!e.message.includes(token));await assert.rejects(credentialStore('/synthetic',{platform:'win32'}).read(),{code:'MISSING_INPUT'});
});
