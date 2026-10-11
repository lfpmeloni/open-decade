import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {serve} from '../src/server.mjs';
import {operation} from '../src/operations.mjs';
import {read} from '../src/vault.mjs';
import {report} from '../src/reports.mjs';
import {rpc} from '../src/mcp.mjs';
import {account,observation,batch} from './helpers.mjs';
const plain=x=>JSON.parse(JSON.stringify(x));
async function setup(t){const v=await fs.mkdtemp(path.join(os.tmpdir(),'od-interface-'));t.after(()=>fs.rm(v,{recursive:true,force:true}));return v;}
test('loopback service requires session, exact host and origin; same financial result and confirmation pipeline',async t=>{
 const v=await setup(t),{server,origin,token}=await serve(v);t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 assert.equal(server.address().address,'127.0.0.1');
 const headers={'Content-Type':'application/json',Origin:origin,Authorization:`Bearer ${token}`};
 const post=(body,h=headers)=>fetch(origin+'/api',{method:'POST',headers:h,body:JSON.stringify(body)});
 assert.equal((await post({command:'doctor'},{...headers,Authorization:''})).status,401);
 assert.equal((await post({command:'init'},{...headers,Origin:'https://evil.example'})).status,403);
 const badHost=await new Promise((resolve,reject)=>{const q=http.request(origin+'/api',{method:'POST',headers:{...headers,Host:'evil.example'}},r=>{r.resume();resolve(r.statusCode);});q.on('error',reject);q.end(JSON.stringify({command:'doctor'}));});assert.equal(badHost,403);
 assert.equal((await post({command:'doctor'})).status,200);
 await post({command:'init'});const b=batch([account('a'),observation('o','a','123.45')]);
 const p=await (await post({command:'import preview',args:{batch:b}})).json();assert.equal((await read(v)).active.length,0);
 const rejected=await (await post({command:'import apply',args:{batch:b,confirmation:'wrong'}})).json();assert.equal(rejected.outcome,'failure');
 await post({command:'import apply',args:{batch:b,confirmation:p.data.confirmation}});
 const args={name:'net-worth',asOf:'2026-01-01',base:'EUR'},r=await (await post({command:'report',args})).json();assert.deepEqual(r.data,plain(report(await read(v),'net-worth',args).data));
 assert.equal((await fetch(origin+'/../package.json')).status,404);
});
test('MCP initialized session, bounded reads, preview/apply and report parity',async t=>{
 const v=await setup(t),session={};const call=(method,params,id=1)=>rpc(v,{jsonrpc:'2.0',id,method,params},session);
 assert.equal((await call('tools/list')).error.code,-32000);
 assert.equal((await call('initialize',{protocolVersion:'2025-03-26'})).result.protocolVersion,'2025-03-26');await rpc(v,{jsonrpc:'2.0',method:'notifications/initialized'},session);
 assert((await call('tools/list')).result.tools.some(x=>x.name==='import_preview'));await operation(v,'init');
 const b=batch([account('a'),observation('o','a','42')]);const p=JSON.parse((await call('tools/call',{name:'import_preview',arguments:{batch:b}})).result.content[0].text);
 const applied=await call('tools/call',{name:'import_apply',arguments:{batch:b,confirmation:p.data.confirmation}});assert.equal(applied.result.isError,false);
 const args={name:'net-worth',asOf:'2026-01-01',base:'EUR'},r=await call('tools/call',{name:'report',arguments:args});assert.deepEqual(JSON.parse(r.result.content[0].text),plain(await operation(v,'report',args)));
 assert.equal((await call('tools/call',{name:'records',arguments:{limit:501}})).result.isError,true);
 assert.equal((await call('tools/call',{name:'records',arguments:{vault:'/etc'}})).error.code,-32602);
});
test('stdio subprocess emits only JSON-RPC lines and no secrets or paths',async t=>{
 const v=await setup(t);const child=spawn(process.execPath,['bin/od-mcp.mjs','--vault',v]);let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);
 const done=new Promise(resolve=>child.on('close',resolve));child.stdin.end('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26"}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"doctor","arguments":{}}}\n');
 assert.equal(await done,0);assert.equal(err,'');const lines=out.trim().split('\n').map(JSON.parse);assert.equal(lines.length,2);assert.equal(lines[1].result.isError,false);assert(!out.includes(v));
});

test('record form schemas match the installed vault version and cannot select filesystem paths',async t=>{
 const v=await setup(t);await operation(v,'init',{schemaVersion:2});const r=await operation(v,'record schemas');assert.equal(r.data.schemaVersion,2);assert.equal(r.data.records.length,31);assert(r.data.records.some(s=>s.properties.kind.const==='household-plan'));
 const v1=await setup(t);await operation(v1,'init');const old=await operation(v1,'record schemas',{schemaVersion:2,file:'/etc/passwd'});assert.equal(old.data.schemaVersion,1);assert(!old.data.records.some(s=>s.properties.kind.const==='household-plan'));
});
