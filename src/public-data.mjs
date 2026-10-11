import fs from 'node:fs/promises';
import path from 'node:path';
import {assert,hash,canonical,dateOK,days,D} from './core.mjs';
import {read,locked,safePath,atomic,preview,apply} from './vault.mjs';
export const ECB_URL='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const LIMIT=200000;
export function parseECB(text){
 assert(typeof text==='string'&&Buffer.byteLength(text)<=LIMIT,'INPUT_LIMIT','ECB response exceeds 200 kilobytes.');
 // This deliberately accepts only the documented daily envelope, not arbitrary XML.
 const m=text.trim().match(/^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<gesmes:Envelope xmlns:gesmes="http:\/\/www\.gesmes\.org\/xml\/2002-08-01" xmlns="http:\/\/www\.ecb\.int\/vocabulary\/2002-08-01\/eurofxref">\s*<gesmes:subject>Reference rates<\/gesmes:subject>\s*<gesmes:Sender>\s*<gesmes:name>European Central Bank<\/gesmes:name>\s*<\/gesmes:Sender>\s*<Cube>\s*<Cube time=(?<quote>['"])(?<date>\d{4}-\d{2}-\d{2})\k<quote>>(?<body>[\s\S]*?)<\/Cube>\s*<\/Cube>\s*<\/gesmes:Envelope>$/);
 assert(m&&dateOK(m.groups.date),'INVALID_INPUT','Unsupported ECB daily XML layout.');
 const rates=[],seen=new Set();let remainder=m.groups.body;
 while(remainder.trim()){
  const r=remainder.match(/^\s*<Cube currency=(?<cq>['"])(?<currency>[A-Z]{3})\k<cq> rate=(?<rq>['"])(?<rate>(?:0|[1-9][0-9]*)(?:\.[0-9]+)?)\k<rq>\s*\/>/);
  assert(r&&r.groups.rate.length<=80&&new D(r.groups.rate).gt(0)&&r.groups.currency!=='EUR'&&!seen.has(r.groups.currency),'INVALID_INPUT','Invalid or repeated ECB currency rate.');
  seen.add(r.groups.currency);rates.push({currency:r.groups.currency,rate:r.groups.rate});remainder=remainder.slice(r[0].length);
 }
 assert(rates.length>0&&rates.length<=200,'INVALID_INPUT','ECB response must contain 1–200 currencies.');return {date:m.groups.date,rates:rates.sort((a,b)=>a.currency.localeCompare(b.currency))};
}
export async function fetchECB(v,{fetchImpl=globalThis.fetch,now=()=>new Date().toISOString()}={}){
 await read(v);let response,text='';
 try{
  response=await fetchImpl(ECB_URL,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/xml, text/xml'}});
  assert(response.ok&&response.body,'SOURCE_FAILURE','ECB data is unavailable.');let size=0;const chunks=[];
  for await(const chunk of response.body){size+=chunk.length;assert(size<=LIMIT,'INPUT_LIMIT','ECB response exceeds 200 kilobytes.');chunks.push(chunk);}
  text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
 }catch(e){if(e.code==='INPUT_LIMIT')throw e;assert(false,'SOURCE_FAILURE','ECB fetch failed; previously cached data remains unchanged.');}
 const parsed=parseECB(text),fetchedAt=now();assert(dateOK(fetchedAt.slice(0,10))&&parsed.date<=fetchedAt.slice(0,10),'INVALID_INPUT','ECB observation cannot be future dated.');
 const content={format:'open-decade-public-data',version:1,provider:'ecb-fx',url:ECB_URL,fetchedAt,observationDate:parsed.date,raw:text,rawHash:hash(text),adjustments:'None; currencies per one EUR.',license:{url:'https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html',reviewedAt:'2026-10-09',note:'Attribute ECB; identify transformations; consult source terms before redistribution.'}},cacheId=hash(content);
 await locked(v,async()=>{await fs.mkdir(await safePath(path.join(v,'public-data')),{recursive:true,mode:0o700});const file=`public-data/${cacheId}.json`;try{await fs.access(await safePath(path.join(v,file)));}catch(e){if(e.code!=='ENOENT')throw e;await atomic(v,file,canonical({...content,cacheId})+'\n');}});
 return {cacheId,provider:'ecb-fx',fetchedAt,observationDate:parsed.date,currencies:parsed.rates.map(r=>r.currency),applied:false};
}
async function cache(v,id){
 assert(typeof id==='string'&&/^[a-f0-9]{64}$/.test(id),'INVALID_INPUT','Provide a cache digest.');const file=await safePath(path.join(v,'public-data',id+'.json'));assert((await fs.stat(file)).size<=LIMIT*2,'INPUT_LIMIT','Public-data cache exceeds bounds.');
 const c=JSON.parse(await fs.readFile(file,'utf8')),{cacheId,...content}=c;assert(c.format==='open-decade-public-data'&&c.version===1&&c.provider==='ecb-fx'&&cacheId===id&&hash(content)===id&&hash(c.raw)===c.rawHash,'CORRUPT_VAULT','Public-data checksum differs.');return {...c,parsed:parseECB(c.raw)};
}
export async function publicDataStatus(v,asOf){
 await read(v);assert(dateOK(asOf),'MISSING_INPUT','Provide an explicit --as-of date.');let names;try{names=await fs.readdir(await safePath(path.join(v,'public-data')));}catch(e){if(e.code==='ENOENT')return {status:'missing',rows:[]};throw e;}
 names=names.filter(n=>/^[a-f0-9]{64}\.json$/.test(n));assert(names.length<=1000,'INPUT_LIMIT','Public-data index exceeds 1000 vintages.');const rows=[],vintages=new Map();
 for(const name of names.sort()){const c=await cache(v,name.slice(0,-5));const values=hash(c.parsed.rates),known=vintages.get(c.observationDate)??new Set();known.add(values);vintages.set(c.observationDate,known);rows.push({cacheId:c.cacheId,observationDate:c.observationDate,fetchedAt:c.fetchedAt,status:c.observationDate>asOf||c.fetchedAt.slice(0,10)>asOf?'future':days(c.observationDate,asOf)>7?'stale':'cached',license:c.license});}
 for(const row of rows)row.revised=vintages.get(row.observationDate).size>1;
 return {status:rows.length?'cached':'missing',freshnessPolicy:'More than seven calendar days is stale; not a promise of a daily release.',rows};
}
export async function publicDataProposal(v,id,confirmation){
 const c=await cache(v,id),s=await read(v);assert(s.schemaVersion===2,'UNSUPPORTED_SCHEMA','Public-data proposals require schema 2.');
 const records=c.parsed.rates.map(({currency,rate})=>{
  const sourceId=`${c.observationDate}-${currency}`,old=s.active.find(r=>r.kind==='fx'&&r.date===c.observationDate&&r.from==='EUR'&&r.to===currency);
  if(old&&new D(old.rate).eq(rate))return old;
  return {id:`ecb-${hash([id,currency]).slice(0,40)}`,kind:'fx',date:c.observationDate,capturedAt:c.fetchedAt,from:'EUR',to:currency,rate,...(old?{supersedes:old.id}:{}),provenance:{source:'European Central Bank reference FX',sourceId,...(old?{source:old.provenance.source,sourceId:old.provenance.sourceId}:{}),quality:'source-reported',uncertainties:[],rawReference:`public-data/${id}.json`}};
 });
 const batch={schemaVersion:2,batchId:`ecb-${id.slice(0,40)}`,records};return confirmation===undefined?preview(v,batch):apply(v,batch,confirmation);
}
