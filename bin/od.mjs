#!/usr/bin/env node
import {configureConnection,connectionStatus,disconnectConnection,syncConnection,connectionProposal} from '../src/connections.mjs';
import {fetchEconomic,economicData,economicSeries} from '../src/economic-data.mjs';
import {providerFile,providerFormats} from '../src/provider-imports.mjs';
import {maintenance} from '../src/maintenance.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {vaultPath,doctor,init,read,preview,apply,safePath,locked} from '../src/vault.mjs';
import {fetchECB,publicDataStatus,publicDataProposal} from '../src/public-data.mjs';
import {ofxFile} from '../src/ofx.mjs';
import {mappedFile} from '../src/mapped-csv.mjs';
import {knowledge} from '../src/knowledge.mjs';
import {backup,restore,migration} from '../src/recovery.mjs';
import {intake} from '../src/intake.mjs';
import {report} from '../src/reports.mjs';
import {capabilities} from '../src/capabilities.mjs';
import {assert} from '../src/core.mjs';
import {saveReview,listReviews,compareReviews} from '../src/reviews.mjs';
import {pdf,xlsx,ics,redacted} from '../src/portable-exports.mjs';
import {json,markdown,csv} from '../src/render.mjs';
let command='unknown',asJSON=process.argv.includes('--json');
try{
 const {values:v,positionals:p}=parseArgs({allowPositionals:true,strict:true,options:Object.fromEntries(['vault','file','confirm','as-of','from','to','base','account','assumptions','mode','report','format','output','destination','query','topic','jurisdiction','mapping','adapter','policy','year','context','member','schema','cache','series'].map(k=>[k,{type:'string'}]).concat([['json',{type:'boolean'}],['redact',{type:'boolean'}]]))});
 command=p.join(' ');assert(p.length>0,'UNSUPPORTED_COMMAND','Select a command; see workflows/local-analysis.md.');
 const o={...v,asOf:v['as-of']};let data,warnings=[];
 if(command==='capabilities')data=capabilities;
 else if(command==='import formats')data=providerFormats;
 else if(command==='maintenance'){const r=maintenance(o);data=r.data;warnings=r.warnings;}
 else if(command==='knowledge search'||command==='knowledge show'){if(command==='knowledge show')assert(v.topic,'MISSING_INPUT','Provide --topic ID.');const result=await knowledge(o);data=result.data;warnings=result.warnings;}
 else{
  const vault=await vaultPath(v.vault);
  if(command==='doctor')data=await doctor(vault);
  else if(command==='connection configure'){assert(v.file&&(await fs.stat(v.file)).size<100000,'INPUT_LIMIT','Provide a small connection configuration file without credentials.');let config;try{config=JSON.parse(await fs.readFile(v.file,'utf8'));}catch{assert(false,'INVALID_INPUT','Connection configuration must be JSON.');}data=await configureConnection(vault,config);}
  else if(command==='connection status')data=await connectionStatus(vault);
  else if(command==='connection disconnect')data=await disconnectConnection(vault);
  else if(command==='connection sync'){data=await syncConnection(vault);warnings=[...data.warnings,{code:'CONNECTION_NOT_PRODUCTION_VERIFIED'}];}
  else if(command==='connection apply'){const proposal=await connectionProposal(vault,v.cache);data=await apply(vault,proposal.batch,v.confirm);}
  else if(command==='connection preview'){data=await connectionProposal(vault,v.cache);warnings=data.warnings;}
  else if(command==='data fetch')data=v.series?await fetchEconomic(vault,v.series):await fetchECB(vault);
  else if(command==='data series')data=await economicData(vault,o);
  else if(command==='data catalogue')data=economicSeries;
  else if(command==='data status')data=await publicDataStatus(vault,o.asOf);
  else if(command==='data preview'){data=await publicDataProposal(vault,v.cache);warnings=data.warnings;}
  else if(command==='data apply'){assert(v.confirm,'MISSING_INPUT','Provide confirmation.');data=await publicDataProposal(vault,v.cache,v.confirm);}
  else if(command==='backup')data=await backup(vault,v.output);
  else if(command==='restore')data=await restore(v.file,v.destination);
  else if(command==='migrate preview')data=await migration(vault,v.file,v.destination);
  else if(command==='migrate apply'){assert(v.confirm,'MISSING_INPUT','Provide the migration confirmation.');data=await migration(vault,v.file,v.destination,v.confirm);}
  else if(command==='review save')data=await saveReview(vault,v.report,o);
  else if(command==='review list')data=await listReviews(vault);
  else if(command==='review compare')data=await compareReviews(vault,v.from,v.to);
  else if(command==='init')data=await init(vault,v.schema===undefined?1:Number(v.schema));
  else if(['profile preview','policy preview','profile apply','policy apply'].includes(command)){const batch=await intake(v.file);const kind=p[0]==='profile'?'profile':'investment-policy';assert(batch.records.every(r=>r.kind===kind),'INVALID_INPUT','This command accepts only records of the requested profile or policy kind.');if(p[1]==='preview'){data=await preview(vault,batch);warnings=data.warnings;}else data=await apply(vault,batch,v.confirm);}
  else if(command==='tax checklist'||command==='tax handoff'){const result=report(await read(vault),'tax',o);data=result.data;warnings=result.warnings;}
  else if(command==='profile show'||command==='policy show'){const result=report(await read(vault),p[0],o);data=result.data;warnings=result.warnings;}
  else if(['import preview','import apply'].includes(command)&&v.adapter&&v.adapter!=='ofx'){const normalized=await providerFile(v.adapter,v.file,v.mapping,await read(vault));if(command==='import preview'){data={...await preview(vault,normalized.batch),sourceMetadata:normalized.sourceMetadata};warnings=[...data.warnings,...normalized.warnings];}else data=await apply(vault,normalized.batch,v.confirm);}
  else if(command==='import preview'&&v.adapter==='ofx'){const normalized=await ofxFile(v.file,v.mapping,await read(vault));const result=await preview(vault,normalized.batch);data={...result,sourceMetadata:normalized.sourceMetadata};warnings=[...result.warnings,...normalized.warnings];}
  else if(command==='import apply'&&v.adapter==='ofx')data=await apply(vault,(await ofxFile(v.file,v.mapping,await read(vault))).batch,v.confirm);
  else if(command==='import preview'){assert(!v.adapter,'INVALID_INPUT','Unknown import adapter.');const result=await preview(vault,v.mapping?await mappedFile(v.file,v.mapping,await read(vault)):await intake(v.file));data=result;warnings=result.warnings;}
  else if(command==='import apply'){assert(!v.adapter,'INVALID_INPUT','Unknown import adapter.');data=await apply(vault,v.mapping?await mappedFile(v.file,v.mapping,await read(vault)):await intake(v.file),v.confirm);}
  else if((p[0]==='report'&&p.length===2)||command==='simulate goal'||command==='export'){
   const name=command==='simulate goal'?'simulation':command==='export'?v.report:p[1];
   const result=report(await read(vault),name,o);data=result.data;warnings=result.warnings;
  }else assert(false,'UNSUPPORTED_COMMAND','Unsupported command.');
 }
 let result={command,contractVersion:1,outcome:warnings.length?'partial':'success',data,warnings,errors:[]};
 if(command==='export'){
  if(v.redact){result=redacted(result);data=result.data;}
  const format=v.format??'json';assert(['json','markdown','csv','pdf','xlsx','ics'].includes(format),'INVALID_INPUT','Unsupported export format.');
  const output=({json,markdown,csv,pdf,xlsx,ics}[format])(result);
  if(v.output){const vault=await vaultPath(v.vault),dest=await safePath(path.resolve(vault,'exports',v.output));assert(path.dirname(dest)===path.join(vault,'exports'),'UNSAFE_PATH','Export output must be a filename within vault exports.');await locked(vault,async()=>{await fs.mkdir(await safePath(path.join(vault,'exports')),{recursive:true,mode:0o700});await fs.writeFile(dest,output,{flag:'wx',mode:0o600});});data={...data,exported:true};process.stdout.write(asJSON?json({...result,data}):markdown({...result,data}));}
  else process.stdout.write(output);
 }else process.stdout.write(asJSON?json(result):markdown(result));
}catch(e){
 const known=new Set(['UNSUPPORTED_SCHEMA','INVALID_INPUT','INVALID_REFERENCE','CURRENCY_MISMATCH','OWNERSHIP_CONFLICT','OVERLAPPING_OBSERVATION','UNRESOLVED_INPUT','INPUT_LIMIT','ID_CONFLICT','CORRECTION_CONFLICT','UNSAFE_PATH','VAULT_LOCKED','NOT_EMPTY','CORRUPT_VAULT','BATCH_CONFLICT','SOURCE_CONFLICT','DUPLICATE_REFERENCE','AMBIGUOUS_OVERLAP','CONFIRMATION_CHANGED','INVALID_CSV','UNSUPPORTED_COMMAND','MISSING_INPUT','NUMERIC_RANGE','INVALID_BACKUP','BACKUP_CHANGED']);
 const code=known.has(e.code)?e.code:e.code==='ENOENT'?'MISSING_DATA':e.code==='EEXIST'?'OUTPUT_EXISTS':e.code?.startsWith('ERR_PARSE_ARGS')?'INVALID_ARGUMENT':'SOURCE_FAILURE';
 const result={command,contractVersion:1,outcome:'failure',data:null,warnings:[],errors:[{code,...(e.details?{details:e.details}:{}),message:known.has(e.code)?e.message:'Operation failed; check input, vault initialization, and file permissions.'}]};
 process.stdout.write(asJSON?json(result):markdown(result));process.exitCode=1;
}
