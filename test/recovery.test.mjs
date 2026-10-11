import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {init,read,preview,apply,doctor} from '../src/vault.mjs';
import {backup,restore,migration} from '../src/recovery.mjs';
import {shape} from '../src/validate.mjs';
import {report} from '../src/reports.mjs';
import {hash,canonical} from '../src/core.mjs';
import {account,observation,batch,record} from './helpers.mjs';
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'od-recovery-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const v=path.join(root,'source');await init(v);const b=batch([account('a'),observation('o','a','123.45')]);await apply(v,b,(await preview(v,b)).confirmation);return {root,v,b,file:path.join(root,'backup.json'),dest:path.join(root,'destination')};}
test('verified backup restores full files and migration preserves source journal and totals',async t=>{
 const {root,v,file,dest}=await fixture(t);await fs.mkdir(path.join(v,'sources'));await fs.writeFile(path.join(v,'sources','binary'),Buffer.from([0,128,255]));
 const original=await read(v);const names=await fs.readdir(path.join(v,'batches'));const bytes=await fs.readFile(path.join(v,'batches',names[0]));
 assert.equal((await backup(v,file)).verified,true);await restore(file,path.join(root,'restored'));assert.deepEqual(await fs.readFile(path.join(root,'restored/sources/binary')),Buffer.from([0,128,255]));
 assert.equal((await read(path.join(root,'restored'))).state,original.state);
 const p=await migration(v,file,dest);await migration(v,file,dest,p.confirmation);
 assert.equal((await doctor(dest)).schemaVersion,2);assert.equal((await read(v)).state,original.state);
 assert.deepEqual(await fs.readFile(path.join(dest,'batches',names[0])),bytes);
 assert.equal(canonical(report(await read(dest),'net-worth',{asOf:'2026-01-01',base:'EUR'})),canonical(report(original,'net-worth',{asOf:'2026-01-01',base:'EUR'})));
});
test('stale backups, confirmation changes, existing destinations and corrupt archives fail safely',async t=>{
 const {root,v,file,dest}=await fixture(t);await backup(v,file);const p=await migration(v,file,dest);
 await assert.rejects(migration(v,file,dest,'wrong'),{code:'CONFIRMATION_CHANGED'});
 await fs.mkdir(dest);await assert.rejects(restore(file,dest),{code:'NOT_EMPTY'});await fs.rmdir(dest);
 await fs.writeFile(path.join(v,'new-document.txt'),'synthetic');await assert.rejects(migration(v,file,dest,p.confirmation),{code:'BACKUP_CHANGED'});
 const a=JSON.parse(await fs.readFile(file));a.files[0].data='YmFk';await fs.writeFile(path.join(root,'bad.json'),JSON.stringify(a));await assert.rejects(restore(path.join(root,'bad.json'),dest),{code:'INVALID_BACKUP'});
 assert.equal((await doctor(v)).ready,true);await assert.rejects(fs.stat(dest),{code:'ENOENT'});
});
test('hostile archive paths, symlinks, locks and replay failures do not publish a destination',async t=>{
 const {root,v,file,dest}=await fixture(t);await backup(v,file);
 const a=JSON.parse(await fs.readFile(file));a.files.push({path:'../escape',data:'',sha256:hash('')});delete a.digest;a.digest=hash(a);await fs.writeFile(path.join(root,'hostile.json'),canonical(a));
 await assert.rejects(restore(path.join(root,'hostile.json'),dest),{code:'INVALID_BACKUP'});
 await fs.symlink(file,path.join(v,'link'));await assert.rejects(backup(v,path.join(root,'linked.json')),{code:'UNSAFE_PATH'});await fs.unlink(path.join(v,'link'));
 await fs.mkdir(path.join(v,'.writer-lock'));await assert.rejects(backup(v,path.join(root,'locked.json')),{code:'VAULT_LOCKED'});await fs.rmdir(path.join(v,'.writer-lock'));
 const corrupt=JSON.parse(await fs.readFile(file));const entry=corrupt.files.find(f=>f.path.startsWith('batches/'));entry.data=Buffer.from('{}').toString('base64');entry.sha256=hash(entry.data);delete corrupt.digest;corrupt.digest=hash(corrupt);await fs.writeFile(path.join(root,'corrupt.json'),canonical(corrupt));
 await assert.rejects(restore(path.join(root,'corrupt.json'),dest),{code:'CORRUPT_VAULT'});await assert.rejects(fs.stat(dest),{code:'ENOENT'});
 assert.equal((await fs.readdir(root)).some(n=>n.startsWith('.stage-')),false);
});
test('schema 2 records require migration; unresolved instruments stay visible; field errors omit values',async t=>{
 const {v,file,dest}=await fixture(t);await backup(v,file);await migration(v,file,dest,(await migration(v,file,dest)).confirmation);
 const b={schemaVersion:2,batchId:'richer',records:[record('position','p',{name:'Unknown',currency:'EUR',ownership:'1',accountId:'a',instrumentType:'unknown',identifiers:[{scheme:'provider',value:'synthetic-contract'}]}),record('trade','tr',{accountId:'a',positionId:'p',side:'buy',currency:'EUR',quantity:'2',unitPrice:'4'}),record('corporate-action','ca',{positionId:'p',action:'unknown',description:'Needs review'}),record('profile','person',{residences:['DE'],riskTolerance:'high',riskCapacity:'low'})]};
 await assert.rejects(preview(v,b),{code:'UNSUPPORTED_SCHEMA'});await apply(dest,b,(await preview(dest,b)).confirmation);
 const r=report(await read(dest),'readiness',{asOf:'2026-01-01'});assert(r.data.needs.some(n=>n.recordId==='p'&&n.field==='instrumentType'));assert(r.data.needs.some(n=>n.recordId==='tr'));
 const invalid=structuredClone(b);invalid.records[1].quantity='SECRET';assert.throws(()=>shape(invalid),e=>e.code==='INVALID_INPUT'&&e.details.some(x=>x.path==='/records/1/quantity')&&!JSON.stringify(e.details).includes('SECRET'));
});

test('collection readiness cannot be satisfied by a profile alone',()=>{
 const s={active:[record('profile','person',{residences:['DE']})]};
 const r=report(s,'readiness',{asOf:'2026-01-01'});assert.equal(r.data.ready,false);assert(r.data.needs.some(n=>n.field==='records'));
});
