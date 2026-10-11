import {connectionStatus,connectionProposal} from './connections.mjs';
import {economicData,economicSeries} from './economic-data.mjs';
import {providerImport,providerFormats} from './provider-imports.mjs';
import fs from 'node:fs/promises';
import {maintenance} from './maintenance.mjs';
import {saveReview,listReviews,compareReviews} from './reviews.mjs';
import {json,markdown,csv} from './render.mjs';
import {pdf,xlsx,ics,redacted} from './portable-exports.mjs';
import {doctor,init,read,preview,apply} from './vault.mjs';
import {report} from './reports.mjs';
import {knowledge} from './knowledge.mjs';
import {capabilities} from './capabilities.mjs';
import {ofx} from './ofx.mjs';
import {mappedCSV} from './mapped-csv.mjs';
import {assert} from './core.mjs';
export function failure(command,e){
 const codes=['UNSUPPORTED_SCHEMA','INVALID_INPUT','INVALID_REFERENCE','CURRENCY_MISMATCH','OWNERSHIP_CONFLICT','OVERLAPPING_OBSERVATION','UNRESOLVED_INPUT','INPUT_LIMIT','ID_CONFLICT','CORRECTION_CONFLICT','UNSAFE_PATH','VAULT_LOCKED','NOT_EMPTY','CORRUPT_VAULT','BATCH_CONFLICT','SOURCE_CONFLICT','DUPLICATE_REFERENCE','AMBIGUOUS_OVERLAP','CONFIRMATION_CHANGED','INVALID_CSV','UNSUPPORTED_COMMAND','MISSING_INPUT','NUMERIC_RANGE'];
 return {command,contractVersion:1,outcome:'failure',data:null,warnings:[],errors:[{code:codes.includes(e.code)?e.code:e.code==='ENOENT'?'MISSING_DATA':'SOURCE_FAILURE',message:codes.includes(e.code)?e.message:'Operation failed; check input and local vault access.',...(e.details?{details:e.details}:{})}]};
}
export async function operation(v,command,args={}){
 try{
  assert(args&&typeof args==='object'&&!Array.isArray(args),'INVALID_INPUT','Arguments must be an object.');let data,warnings=[];
  if(command==='doctor')data=await doctor(v);
  else if(command==='init')data=await init(v,args.schemaVersion??1);
  else if(command==='capabilities')data=capabilities;
  else if(command==='connection status')data=await connectionStatus(v);
  else if(command==='connection preview'){data=await connectionProposal(v,args.cache);warnings=data.warnings;}
  else if(command==='data series')data=await economicData(v,args);
  else if(command==='data catalogue')data=economicSeries;
  else if(command==='import formats')data=providerFormats;
  else if(command==='maintenance'){const r=maintenance(args);data=r.data;warnings=r.warnings;}
  else if(command==='record schemas'){
   const {schemaVersion}=await read(v);const schema=JSON.parse(await fs.readFile(new URL(`../schemas/batch-v${schemaVersion}.json`,import.meta.url),'utf8'));data={schemaVersion,records:schema.properties.records.items.oneOf};
  }else if(command==='records'){
   const {active,schemaVersion}=await read(v),limit=args.limit??100,offset=args.offset??0;
   assert(Number.isInteger(limit)&&limit>0&&limit<=500&&Number.isInteger(offset)&&offset>=0,'INPUT_LIMIT','Use limit 1–500 and a nonnegative offset.');
   const rows=active.filter(r=>!args.kind||r.kind===args.kind);data={schemaVersion,records:rows.slice(offset,offset+limit),total:rows.length,offset,limit};
   if(offset+limit<rows.length)warnings.push({code:'MORE_RECORDS',nextOffset:offset+limit});
  }else if(command==='import preview'){
   const normalized=args.adapter?providerImport(args.adapter,args.csv,args.mapping,await read(v)):args.ofx!==undefined?ofx(args.ofx,args.mapping,await read(v)):null;
   const b=normalized?normalized.batch:args.csv!==undefined?mappedCSV(args.csv,args.mapping,await read(v)):args.batch;
   data=await preview(v,b);warnings=[...data.warnings,...(normalized?.warnings??[])];if(normalized)data.sourceMetadata=normalized.sourceMetadata;
  }else if(command==='import apply')data=await apply(v,args.batch,args.confirmation);
  else if(command==='knowledge'){const r=await knowledge(args);data=r.data;warnings=r.warnings;}
  else if(command==='review save')data=await saveReview(v,args.name,args);
  else if(command==='review list')data=await listReviews(v);
  else if(command==='review compare')data=await compareReviews(v,args.from,args.to);
  else if(command==='export'){
   const r=report(await read(v),args.name,args),format=args.format??'json';assert(['json','markdown','csv','pdf','xlsx','ics'].includes(format),'INVALID_INPUT','Unsupported export format.');
   let envelope={command:'export',contractVersion:1,outcome:r.warnings.length?'partial':'success',...r,errors:[]};if(args.redact)envelope=redacted(envelope);
   const bytes=Buffer.from(({json,markdown,csv,pdf,xlsx,ics}[format])(envelope));assert(bytes.length<=5000000,'INPUT_LIMIT','Local export exceeds five megabytes.');data={format,encoding:'base64',content:bytes.toString('base64')};
  }else if(command==='report'){const r=report(await read(v),args.name,args);data=r.data;warnings=r.warnings;}
  else assert(false,'UNSUPPORTED_COMMAND','Unsupported local operation.');
  return {command:command==='report'?`report ${args.name}`:command,contractVersion:1,outcome:warnings.length?'partial':'success',data,warnings,errors:[]};
 }catch(e){return failure(command,e);}
}
