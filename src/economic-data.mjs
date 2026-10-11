import fs from 'node:fs/promises';
import path from 'node:path';
import {parse} from 'csv-parse/sync';
import {assert,hash,canonical,dateOK,days} from './core.mjs';
import {read,locked,safePath,atomic} from './vault.mjs';
const LIMIT=500000;
export const economicSeries=[
 {id:'ecb-deposit-rate',key:'FM.D.U2.EUR.4F.KR.DFR.LEV',frequency:'D',unit:'PCPA',meaning:'ECB deposit facility rate, percent per annum; not a retail deposit offer',staleDays:7},
 {id:'euro-area-inflation',key:'HICP.M.U2.N.000000.4D0.ANR',frequency:'M',unit:'PCCH',meaning:'Euro-area changing-composition HICP total annual percent change, not seasonally adjusted; not a personal inflation forecast',staleDays:75}
].map(s=>({...s,url:`https://data-api.ecb.europa.eu/service/data/${s.key.replace('.', '/')}?lastNObservations=24&format=csvdata`,source:`https://data.ecb.europa.eu/data/datasets/${s.key.split('.')[0]}/${s.key}`,reviewedAt:'2026-10-11'}));
const profile=id=>{const p=economicSeries.find(x=>x.id===id);assert(p,'INVALID_INPUT','Choose ecb-deposit-rate or euro-area-inflation.');return p;};
export function parseEconomic(text,id){
 const p=profile(id);assert(typeof text==='string'&&Buffer.byteLength(text)<=LIMIT,'INPUT_LIMIT','Economic series exceeds 500 kilobytes.');let rows,headers;
 try{rows=parse(text,{bom:true,skip_empty_lines:true,columns:h=>{headers=h;return h;},max_record_size:50000});}catch{assert(false,'INVALID_CSV','Malformed economic CSV.');}
 assert(headers&&new Set(headers).size===headers.length&&['KEY','TIME_PERIOD','OBS_VALUE','OBS_STATUS','UNIT','UNIT_MULT'].every(k=>headers.includes(k))&&rows.length>0&&rows.length<=24,'INVALID_INPUT','Unsupported economic series layout or observation count.');
 const seen=new Set();const observations=rows.map(r=>{
  const period=r.TIME_PERIOD,date=p.frequency==='M'?period+'-01':period;
  assert(r.KEY===p.key&&r.UNIT===p.unit&&r.UNIT_MULT==='0'&&dateOK(date)&&(p.frequency!=='M'||/^\d{4}-\d{2}$/.test(period))&&!seen.has(period),'INVALID_INPUT','Unexpected series, unit, multiplier or observation period.');seen.add(period);
  assert(r.OBS_VALUE===''||r.OBS_VALUE.length<=80&&/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(r.OBS_VALUE),'INVALID_INPUT','Economic value is not a supported decimal.');
  assert(/^[A-Z]{0,4}$/.test(r.OBS_STATUS),'INVALID_INPUT','Invalid economic observation status.');
  return {period,date,value:r.OBS_VALUE===''?null:r.OBS_VALUE,sourceStatus:r.OBS_STATUS,quality:r.OBS_VALUE===''?'missing':r.OBS_STATUS==='A'?'normal':['E','P'].includes(r.OBS_STATUS)?'estimated-or-provisional':'unreviewed',attributes:r};
 }).sort((a,b)=>a.period.localeCompare(b.period));return {profile:p,observations};
}
export async function fetchEconomic(v,id,{fetchImpl=globalThis.fetch,now=()=>new Date().toISOString()}={}){
 await read(v);const p=profile(id);let raw;
 try{const response=await fetchImpl(p.url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'text/csv'}});assert(response.ok&&response.body,'SOURCE_FAILURE','Economic series unavailable.');const chunks=[];let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;assert(bytes<=LIMIT,'INPUT_LIMIT','Economic series exceeds 500 kilobytes.');chunks.push(chunk);}raw=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));}catch(e){if(e.code==='INPUT_LIMIT')throw e;assert(false,'SOURCE_FAILURE','Economic acquisition failed; cached vintages remain unchanged.');}
 const parsed=parseEconomic(raw,id),fetchedAt=now();assert(typeof fetchedAt==='string'&&dateOK(fetchedAt.slice(0,10))&&parsed.observations.every(o=>o.date<=fetchedAt.slice(0,10)),'INVALID_INPUT','Future economic observation or invalid capture date.');
 const content={format:'open-decade-economic-data',version:1,seriesId:id,url:p.url,seriesKey:p.key,fetchedAt,raw,rawHash:hash(raw),adjustments:'None. Percent units are preserved; no division, interpolation, forward fill or scenario assumptions.',license:{url:'https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html',reviewedAt:'2026-10-11',note:'Attribute ECB and underlying Eurostat source where applicable; consult source-specific reuse terms before redistribution.'}},cacheId=hash(content);
 await locked(v,async()=>{await fs.mkdir(await safePath(path.join(v,'economic-data')),{recursive:true,mode:0o700});const file=`economic-data/${cacheId}.json`;try{await fs.access(await safePath(path.join(v,file)));}catch(e){if(e.code!=='ENOENT')throw e;await atomic(v,file,canonical({...content,cacheId})+'\n');}});
 return {cacheId,seriesId:id,fetchedAt,observations:parsed.observations.length,applied:false};
}
export async function economicData(v,{series,asOf,cache:cacheId}={}){
 await read(v);const p=profile(series);assert(dateOK(asOf),'MISSING_INPUT','Provide --as-of for cached economic data.');
 if(cacheId)assert(/^[a-f0-9]{64}$/.test(cacheId),'INVALID_INPUT','Cache ID must be a digest.');
 let names;try{names=await fs.readdir(await safePath(path.join(v,'economic-data')));}catch(e){if(e.code==='ENOENT')names=[];else throw e;}
 names=names.filter(n=>/^[a-f0-9]{64}\.json$/.test(n));assert(names.length<=1000,'INPUT_LIMIT','Economic cache exceeds 1000 vintages.');const vintages=[];
 for(const name of names.sort()){
  const file=await safePath(path.join(v,'economic-data',name));assert((await fs.stat(file)).size<=LIMIT*2,'INPUT_LIMIT','Economic cache exceeds bounds.');const c=JSON.parse(await fs.readFile(file,'utf8')),{cacheId:id,...content}=c;
  assert(c.format==='open-decade-economic-data'&&c.version===1&&hash(content)===id&&name===id+'.json'&&hash(c.raw)===c.rawHash,'CORRUPT_VAULT','Economic cache checksum differs.');
  if(c.seriesId!==series)continue;const parsed=parseEconomic(c.raw,series),future=c.fetchedAt.slice(0,10)>asOf;
  const observations=parsed.observations.map(o=>({...o,status:future||o.date>asOf?'future':o.value===null?'missing':days(o.date,asOf)>p.staleDays?'stale':'cached'}));
  vintages.push({cacheId:id,fetchedAt:c.fetchedAt,observations,license:c.license,adjustments:c.adjustments,url:c.url});
 }
 const known=new Map();for(const v of vintages.filter(v=>v.fetchedAt.slice(0,10)<=asOf))for(const o of v.observations){const values=known.get(o.period)??new Set();values.add(canonical([o.value,o.sourceStatus]));known.set(o.period,values);}
 for(const v of vintages)for(const o of v.observations)o.revised=(known.get(o.period)?.size??0)>1;
 const chosen=cacheId?vintages.find(v=>v.cacheId===cacheId):vintages.filter(v=>v.fetchedAt.slice(0,10)<=asOf).sort((a,b)=>a.fetchedAt.localeCompare(b.fetchedAt)||a.cacheId.localeCompare(b.cacheId)).at(-1);
 if(cacheId)assert(chosen,'MISSING_INPUT','Requested series vintage is unavailable.');
 return {series:p,asOf,status:chosen?'cached':vintages.length?'future-only':'missing',selected:chosen??null,vintages:vintages.map(v=>({cacheId:v.cacheId,fetchedAt:v.fetchedAt})),limitations:['Read-only external evidence, never automatic financial records or forecast inputs. Observation period is not its publication date. Retrieval date limits historical availability; a later revision is not available in an earlier as-of view. Staleness is a project review threshold, not a release calendar.']};
}
