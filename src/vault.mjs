import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import YAML from 'yaml';
import {D,assert,fail,hash,canonical,warning} from './core.mjs';
import {shape,replay} from './validate.mjs';
export const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const within=(p,root)=>p===root||p.startsWith(root+path.sep);
export async function safePath(p){
 const full=path.resolve(p);let current=path.parse(full).root;
 for(const part of full.slice(current.length).split(path.sep).filter(Boolean)){
  current=path.join(current,part);
  try{const s=await fs.lstat(current);assert(!s.isSymbolicLink(),'UNSAFE_PATH','Symbolic links are not supported in vault paths.');}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 return full;
}
export async function vaultPath(value=process.env.OPEN_DECADE_VAULT){
 const p=await safePath(value?path.resolve(project,value):path.join(os.homedir(),'.open-decade/vaults/default'));
 assert(!within(p,project)&&!within(project,p),'UNSAFE_PATH','Vault and code tree must be separate.');return p;
}
async function child(v,...parts){await safePath(v);return safePath(path.join(v,...parts));}
export async function locked(v,fn){
 const lock=await child(v,'.writer-lock');
 try{await fs.mkdir(lock,{mode:0o700});}catch(e){if(e.code==='EEXIST')fail('VAULT_LOCKED','Another writer or an interrupted writer holds the lock.');throw e;}
 try{return await fn();}finally{await fs.rmdir(lock);}
}
export async function atomic(v,name,content){
 const dest=await child(v,name),tmp=await child(v,`.stage-${process.pid}-${hash(name).slice(0,12)}`);
 let handle;
 try{handle=await fs.open(tmp,'wx',0o600);await handle.writeFile(content);await handle.sync();await handle.close();handle=null;await fs.rename(tmp,dest);const dir=await fs.open(path.dirname(dest),'r');try{await dir.sync();}finally{await dir.close();}}
 finally{if(handle)await handle.close();await fs.rm(tmp,{force:true});}
}
export async function init(v,schemaVersion=1){
 assert([1,2].includes(schemaVersion),'UNSUPPORTED_SCHEMA','New vault schema must be 1 or 2.');
 await fs.mkdir(v,{recursive:true,mode:0o700});
 return locked(v,async()=>{
  const config=await child(v,'profile.yaml');
  try{await fs.access(config);await read(v);return {initialized:true,existing:true};}catch(e){if(e.code!=='ENOENT')throw e;}
  const names=await fs.readdir(v);assert(names.every(n=>n==='.writer-lock'||n==='batches'||n.startsWith('.stage-')),'NOT_EMPTY','Initialize a new empty directory.');
  if(names.includes('batches'))assert((await fs.readdir(await child(v,'batches'))).every(n=>n.startsWith('.stage-')),'NOT_EMPTY','Uninitialized vault contains committed records.');
  await fs.mkdir(await child(v,'batches'),{recursive:true,mode:0o700});
  await atomic(v,'profile.yaml',YAML.stringify({schemaVersion,preferences:{}}));return {initialized:true,existing:false};
 });
}
export async function read(v){
 const profile=YAML.parse(await fs.readFile(await child(v,'profile.yaml'),'utf8'));
 assert([1,2].includes(profile?.schemaVersion),'UNSUPPORTED_SCHEMA','Unsupported vault schema.');
 const dir=await child(v,'batches');const names=(await fs.readdir(dir)).sort();const batches=[];
 for(const name of names){
  if(name.startsWith('.stage-'))continue;
  assert(/^\d{8}-[a-f0-9]{64}\.json$/.test(name),'CORRUPT_VAULT','Unexpected journal entry.');
  const b=JSON.parse(await fs.readFile(await child(v,'batches',name),'utf8'));
  assert(name===`${String(batches.length+1).padStart(8,'0')}-${hash(b)}.json`,'CORRUPT_VAULT','Journal sequence or checksum is invalid.');batches.push(b);
 }
 assert(batches.every(b=>b.schemaVersion<=profile.schemaVersion),'UNSUPPORTED_SCHEMA','Batch schema exceeds the vault schema.');
 return {profile,schemaVersion:profile.schemaVersion,batches,state:hash({profile,batches}),...replay(batches)};
}
export async function doctor(v){
 try{const state=await read(v);return {ready:true,schemaVersion:state.schemaVersion,batches:state.batches.length,records:state.active.length,writerLocked:await fs.stat(await child(v,'.writer-lock')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;})};}
 catch(e){if(e.code==='ENOENT')return {ready:false,reason:'NOT_INITIALIZED'};throw e;}
}
function comparable(r){const {id,capturedAt,provenance,supersedes,...rest}=r;return canonical(rest);}
export function proposal(batch,state){
 shape(batch);
 assert(batch.schemaVersion<=(state.schemaVersion??1),'UNSUPPORTED_SCHEMA','Migrate the vault before importing schema 2 records.');
 const exact=state.batches.find(b=>hash(b)===hash(batch));
 if(exact)return {batch,changes:[],duplicates:batch.records.map(r=>r.id),warnings:[],confirmation:hash({batch,state:state.state}),noop:true};
 assert(!state.batches.some(b=>b.batchId===batch.batchId),'BATCH_CONFLICT','Batch ID already belongs to different content.');
 const candidate=replay([...state.batches,batch]);
 const duplicates=[],changes=[],sourceKeys=new Map();
 for(const r of state.all.values())if(r.provenance.sourceId)sourceKeys.set(`${r.kind}|${r.provenance.source}|${r.provenance.sourceId}`,r);
 const proposedIds=new Set();
 for(const r of batch.records){
  assert(!proposedIds.has(r.id),'ID_CONFLICT','Duplicate record ID within proposal.');proposedIds.add(r.id);
  if(state.all.has(r.id)){assert(canonical(state.all.get(r.id))===canonical(r),'ID_CONFLICT','Existing record IDs cannot change.');duplicates.push(r.id);continue;}
  const key=r.provenance.sourceId?`${r.kind}|${r.provenance.source}|${r.provenance.sourceId}`:null;
  const old=key?sourceKeys.get(key):null;
  if(old&&!r.supersedes){assert(comparable(old)===comparable(r),'SOURCE_CONFLICT','A stable source identity has changed; submit a correction.');assert(canonical(old)===canonical(r),'DUPLICATE_REFERENCE','Reuse the exact existing record for a stable duplicate.');duplicates.push(r.id);continue;}
  if(r.kind==='transaction'&&!r.supersedes){
   const overlaps=[...state.active,...changes].filter(x=>x.kind==='transaction'&&candidate.resolve(x.accountId).id===candidate.resolve(r.accountId).id&&x.date===r.date&&new D(x.amount).eq(r.amount)&&x.currency===r.currency);
   assert(overlaps.every(x=>r.provenance.sourceId&&x.provenance.sourceId),'AMBIGUOUS_OVERLAP','Overlapping payments require distinct stable source IDs or a correction.');
  }
  if(key)sourceKeys.set(key,r);changes.push(r);
 }
 return {batch,changes,duplicates,warnings:[...(duplicates.length?[warning('DUPLICATES')]:[]),...batch.records.filter(r=>r.provenance.uncertainties.length).map(r=>warning('UNRESOLVED_INPUT',r.id))],confirmation:hash({batch,state:state.state}),noop:changes.length===0};
}
export async function preview(v,batch){return proposal(batch,await read(v));}
export async function apply(v,batch,confirmation){
 return locked(v,async()=>{const state=await read(v),p=proposal(batch,state);
  assert(batch.records.every(r=>r.provenance.uncertainties.length===0),'UNRESOLVED_INPUT','Resolve extraction uncertainties and preview again before applying.');
  assert(confirmation===p.confirmation,'CONFIRMATION_CHANGED','Preview and confirm the current proposal and vault state.');
  if(!p.noop){const b=batch;await atomic(v,`batches/${String(state.batches.length+1).padStart(8,'0')}-${hash(b)}.json`,canonical(b)+'\n');}
  return {applied:p.changes.length,duplicates:p.duplicates,noop:p.noop};
 });
}
