import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import {assert,hash,canonical} from './core.mjs';
import {read,locked,safePath,vaultPath} from './vault.mjs';
const LIMIT=100_000_000;
const inside=(a,b)=>a===b||a.startsWith(b+path.sep);
async function separate(source,destination){
 assert(typeof destination==='string'&&destination.length>0,'MISSING_INPUT','Provide an explicit destination.');
 const dest=await vaultPath(destination);
 assert(!inside(dest,source)&&!inside(source,dest),'UNSAFE_PATH','Source and destination must be separate.');return dest;
}
async function snapshot(v){
 const state=await read(v),files=[];let size=0;
 async function walk(dir){
  for(const name of (await fs.readdir(await safePath(dir))).sort()){
   if(name==='.writer-lock'||name.startsWith('.stage-'))continue;
   const full=await safePath(path.join(dir,name)),stat=await fs.lstat(full);
   if(stat.isDirectory()){await walk(full);continue;}
   assert(stat.isFile(),'UNSAFE_PATH','Backups accept regular files only.');
   size+=stat.size;assert(size<=LIMIT&&files.length<10000,'INPUT_LIMIT','Backup exceeds local archive limits.');
   const bytes=await fs.readFile(full),data=bytes.toString('base64');
   files.push({path:path.relative(v,full).split(path.sep).join('/'),data,sha256:hash(data)});
  }
 }
 await walk(v);
 return {format:'open-decade-backup',version:1,schemaVersion:state.schemaVersion,state:state.state,files};
}
function validateArchive(a){
 assert(a?.format==='open-decade-backup'&&a.version===1&&[1,2].includes(a.schemaVersion)&&Array.isArray(a.files)&&a.files.length<=10000,'INVALID_BACKUP','Unsupported backup format.');
 assert(a.digest===hash({format:a.format,version:a.version,schemaVersion:a.schemaVersion,state:a.state,files:a.files}),'INVALID_BACKUP','Backup checksum differs.');
 const seen=new Set();let size=0;
 for(const f of a.files){
  assert(typeof f.path==='string'&&f.path.length<=1024&&f.path.split('/').every(p=>p&&!['.','..','.writer-lock'].includes(p)&&!p.startsWith('.stage-')&&!/[\\:\x00-\x1f]/.test(p))&&!seen.has(f.path),'INVALID_BACKUP','Unsafe or repeated backup entry.');
  seen.add(f.path);
  assert(typeof f.data==='string'&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f.data)&&hash(f.data)===f.sha256,'INVALID_BACKUP','Backup entry checksum differs.');
  size+=Buffer.byteLength(f.data,'base64');assert(size<=LIMIT,'INPUT_LIMIT','Backup exceeds local archive limits.');
 }
 assert(seen.has('profile.yaml'),'INVALID_BACKUP','Backup has no profile.');return a;
}
async function archive(file){
 assert(typeof file==='string','MISSING_INPUT','Provide a backup file.');await safePath(file);
 assert((await fs.stat(file)).size<=LIMIT*1.5,'INPUT_LIMIT','Backup exceeds local archive limits.');
 let a;try{a=JSON.parse(await fs.readFile(file,'utf8'));}catch{assert(false,'INVALID_BACKUP','Backup is not JSON.');}return validateArchive(a);
}
async function absent(dest){try{await fs.lstat(dest);assert(false,'NOT_EMPTY','Destination must not exist.');}catch(e){if(e.code!=='ENOENT')throw e;}}
// Reserve a sibling lock and build a complete verified vault before publishing it.
async function materialize(a,dest,transform=async()=>{}){
 await safePath(dest);await absent(dest);await fs.mkdir(path.dirname(dest),{recursive:true,mode:0o700});
 const guard=dest+'.restore-lock';await safePath(guard);
 try{await fs.mkdir(guard,{mode:0o700});}catch(e){if(e.code==='EEXIST')assert(false,'VAULT_LOCKED','A restore already reserves this destination.');throw e;}
 let stage;
 try{
  await absent(dest);stage=await fs.mkdtemp(path.join(path.dirname(dest),'.stage-restore-'));await fs.chmod(stage,0o700);
  await fs.mkdir(path.join(stage,'batches'),{mode:0o700});
  for(const f of a.files){const target=path.join(stage,...f.path.split('/'));await fs.mkdir(path.dirname(target),{recursive:true,mode:0o700});const h=await fs.open(target,'wx',0o600);try{await h.writeFile(Buffer.from(f.data,'base64'));await h.sync();}finally{await h.close();}}
  const restored=await read(stage);assert(restored.state===a.state&&restored.schemaVersion===a.schemaVersion,'INVALID_BACKUP','Restored journal does not match backup state.');
  await transform(stage,restored);await read(stage);await absent(dest);await fs.rename(stage,dest);stage=null;
 }finally{if(stage)await fs.rm(stage,{recursive:true,force:true});await fs.rmdir(guard);}
}
export async function backup(v,file){
 const dest=await separate(v,file);
 return locked(v,async()=>{
  const content=await snapshot(v),a={...content,digest:hash(content)};validateArchive(a);
  // Check decoding and replay before writing the portable archive.
  const check=dest+'.verify-vault';await absent(check);await materialize(a,check);
  try{await fs.writeFile(dest,canonical(a)+'\n',{flag:'wx',mode:0o600});}finally{await fs.rm(check,{recursive:true,force:true});}
  return {verified:true,digest:a.digest,schemaVersion:a.schemaVersion,files:a.files.length,state:a.state};
 });
}
export async function restore(file,destination){
 const a=await archive(file),dest=await separate(path.resolve(file),destination);await materialize(a,dest);
 return {restored:true,verified:true,schemaVersion:a.schemaVersion,state:a.state};
}
export async function migration(v,file,destination,confirmation){
 const dest=await separate(v,destination);
 return locked(v,async()=>{
  const a=await archive(file),current=await snapshot(v);assert(current.schemaVersion===1,'UNSUPPORTED_SCHEMA','Migration requires a schema 1 vault.');
  assert(hash(current)===a.digest,'BACKUP_CHANGED','Create a verified backup of the current complete vault.');await absent(dest);
  const token=hash({operation:'migrate-1-to-2',backup:a.digest,destination:dest});
  if(confirmation===undefined)return {from:1,to:2,backupDigest:a.digest,confirmation:token,preserves:'Original batch bytes, IDs, sources and financial values',limitations:['No quantities, costs or ownership are inferred.']};
  assert(confirmation===token,'CONFIRMATION_CHANGED','Preview migration again with this source, backup and destination.');
  await materialize(a,dest,async(stage,state)=>{
   await fs.writeFile(path.join(stage,'profile.yaml'),YAML.stringify({...state.profile,schemaVersion:2}),{mode:0o600});
   await fs.writeFile(path.join(stage,'migration-v1-v2.json'),canonical({method:'migration-1-to-2-v1',backupDigest:a.digest,sourceState:a.state})+'\n',{flag:'wx',mode:0o600});
  });
  return {migrated:true,from:1,to:2,backupDigest:a.digest,sourceUnchanged:true};
 });
}
