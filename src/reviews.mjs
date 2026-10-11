import fs from 'node:fs/promises';
import path from 'node:path';
import {read,locked,atomic,safePath} from './vault.mjs';
import {report} from './reports.mjs';
import {assert,canonical,hash} from './core.mjs';
export async function saveReview(v,name,o){
 return locked(v,async()=>{
  o=Object.fromEntries(['asOf','from','to','base','account','assumptions','mode','policy','year','jurisdiction','context','member'].filter(k=>o[k]!==undefined).map(k=>[k,o[k]]));
  const s=await read(v),r=report(s,name,o),content={format:'open-decade-review',version:1,report:name,options:o,state:s.state,result:r},digest=hash(content),snapshot={...content,digest};
  await fs.mkdir(await safePath(path.join(v,'reports')),{recursive:true,mode:0o700});
  const file=`reports/${digest}.json`;try{await fs.access(await safePath(path.join(v,file)));return {saved:true,existing:true,reviewId:digest};}catch(e){if(e.code!=='ENOENT')throw e;}
  await atomic(v,file,canonical(snapshot)+'\n');return {saved:true,existing:false,reviewId:digest};
 });
}
async function loadReview(v,id){
 assert(typeof id==='string'&&/^[a-f0-9]{64}$/.test(id),'INVALID_INPUT','Review ID must be a SHA-256 digest.');
 const file=await safePath(path.join(v,'reports',id+'.json'));assert((await fs.stat(file)).size<=20000000,'INPUT_LIMIT','Review exceeds twenty megabytes.');
 const s=JSON.parse(await fs.readFile(file,'utf8')),{digest,...content}=s;assert(s.format==='open-decade-review'&&s.version===1&&digest===id&&hash(content)===digest,'CORRUPT_VAULT','Review checksum differs.');return s;
}
export async function listReviews(v){
 await read(v);const dir=await safePath(path.join(v,'reports'));let names;try{names=await fs.readdir(dir);}catch(e){if(e.code==='ENOENT')return {reviews:[]};throw e;}
 names=names.filter(n=>/^[a-f0-9]{64}\.json$/.test(n));assert(names.length<=1000,'INPUT_LIMIT','Review index exceeds 1000 snapshots.');const reviews=[];
 for(const name of names.sort()){const s=await loadReview(v,name.slice(0,-5));reviews.push({reviewId:s.digest,report:s.report,options:s.options,state:s.state,method:s.result.data.metadata.method,coverage:s.result.data.metadata.coverage});}return {reviews};
}
function leaves(v,p='',out=new Map()){
 if(v!==null&&typeof v==='object'){for(const [k,x]of Object.entries(v))leaves(x,p?`${p}/${k}`:k,out);}else out.set(p,v);return out;
}
export async function compareReviews(v,from,to){
 const a=await loadReview(v,from),b=await loadReview(v,to);assert(a.report===b.report,'INVALID_INPUT','Compare snapshots of the same report.');
 const before=leaves(a.result.data),after=leaves(b.result.data),changes=[];
 for(const key of new Set([...before.keys(),...after.keys()]))if(canonical(before.get(key))!==canonical(after.get(key)))changes.push({path:key,before:before.get(key)??null,after:after.get(key)??null});
 assert(changes.length<=10000,'INPUT_LIMIT','Comparison exceeds 10000 changed fields.');
 return {from,to,report:a.report,methodChanged:a.result.data.metadata.method!==b.result.data.metadata.method,changes,limitations:['Structural field comparison, not investment performance or a causal explanation. Options and input coverage can differ.']};
}
