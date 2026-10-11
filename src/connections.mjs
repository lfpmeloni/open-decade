import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import {parse} from 'csv-parse/sync';
import {read,locked,atomic,safePath,preview} from './vault.mjs';
import {assert,hash,canonical,dateOK} from './core.mjs';
import {credentialStore} from './credentials.mjs';
import {fetchFlex} from './flex.mjs';
import {mappedCSV} from './mapped-csv.mjs';
const validate=new Ajv({strict:true}).compile(JSON.parse(readFileSync(new URL('../schemas/connection-v1.json',import.meta.url))));
const file='connections/ibkr-flex.json';
const limits=['Experimental mapped CSV cash reporting only; no live consent/sync/revoke certification. No order, payment or account-management endpoint.', 'A configured report can omit dates or records; incremental deduplication is not proof of complete history. Full window is fetched again; no deletion is inferred.', 'Enrollment and a Flex query/token in IBKR Client Portal are required. Provider charges and eligibility are governed by your agreement; no free-access promise. Plaid is unavailable.', 'Local disconnect disables this client and attempts OS-token deletion; remote token revocation must be performed in Client Portal. File import remains available.'];
async function config(v){await read(v);try{const target=await safePath(path.join(v,file));assert((await fs.stat(target)).size<100000,'INPUT_LIMIT','Connection configuration exceeds bounds.');const state=JSON.parse(await fs.readFile(target,'utf8'));assert(validate(state.config)&&dateOK(state.config.expiresOn)&&typeof state.enabled==='boolean','CORRUPT_VAULT','Invalid connection configuration.');return state;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
export async function configureConnection(v,c){
 assert(validate(c)&&dateOK(c.expiresOn),'INVALID_INPUT','Use the version-1 reporting connection schema; credentials are not accepted.');const s=await read(v);assert(s.resolve(c.mapping.accountId)?.kind==='account','INVALID_REFERENCE','Map the connection to a confirmed account.');assert(Boolean(c.mapping.currency)!==Boolean(c.mapping.columns.currency),'INVALID_INPUT','Choose one mapped currency source.');
 await locked(v,async()=>{await fs.mkdir(await safePath(path.join(v,'connections')),{recursive:true,mode:0o700});await atomic(v,file,canonical({config:c,enabled:true,configuredAt:new Date().toISOString(),lastSync:null})+'\n');});return connectionStatus(v);
}
export async function connectionStatus(v){const c=await config(v),store=credentialStore(v);return {provider:'ibkr-flex',status:!c?'unconfigured':!c.enabled?'disconnected':c.config.expiresOn<new Date().toISOString().slice(0,10)?'declared-expired':'configured-unverified',scope:c?.config.scope??null,accountId:c?.config.mapping.accountId??null,periodDays:c?.config.periodDays??null,expiresOn:c?.config.expiresOn??null,lastSync:c?.lastSync??null,credentialService:store.service,credentialPlatform:store.platform,credentialIntegration:store.supported?'OS keyring required; installation/unlock not checked':'unavailable; use file import',productionVerified:false,limitations:limits};}
export async function disconnectConnection(v,{store=credentialStore(v)}={}){
 await locked(v,async()=>{const c=await config(v);assert(c,'MISSING_INPUT','No connection is configured.');await atomic(v,file,canonical({...c,enabled:false})+'\n');});let credentialDeletion='complete';try{await store.clear();}catch{credentialDeletion='failed; remove through OS store';}return {disconnected:true,credentialDeletion,remoteRevocation:'not-performed; revoke Flex token in Client Portal',limitations:limits};
}
export async function syncConnection(v,{store=credentialStore(v),fetchImpl,wait,now=()=>new Date().toISOString()}={}){
 const c=await config(v),capturedAt=now();assert(c?.enabled,'MISSING_INPUT','Configure or reconnect this reporting connection first.');assert(dateOK(capturedAt.slice(0,10))&&c.config.expiresOn>=capturedAt.slice(0,10),'MISSING_INPUT','Declared token expiry reached; renew through the provider and OS store.');
 const token=await store.read();let text;
 try{text=await fetchFlex({token,queryId:c.config.queryId,periodDays:c.config.periodDays},{fetchImpl,wait});}catch(e){assert(false,e.code==='MISSING_INPUT'?'MISSING_INPUT':'SOURCE_FAILURE',e.code==='MISSING_INPUT'?'Renew the reporting token in Client Portal and the OS store.':'Reporting sync failed; no fetched records were applied.');}
 const rawHash=hash(text);let rows;try{rows=parse(text,{bom:true,columns:true,skip_empty_lines:true,delimiter:c.config.mapping.delimiter??',',max_record_size:100000});}catch{assert(false,'INVALID_CSV','Unsupported reporting CSV.');}
 assert(rows.length>0&&rows.length<=10000&&rows.every(r=>r[c.config.remoteAccountColumn]===c.config.remoteAccountId),'INVALID_REFERENCE','Report must contain only the configured external account; missing/mixed accounts require file review.');
 return locked(v,async()=>{
  const current=await config(v);assert(current?.enabled&&canonical(current.config)===canonical(c.config),'CONFIRMATION_CHANGED','Connection changed while fetching; no proposal was saved.');
  const state=await read(v),batch=mappedCSV(text,{...c.config.mapping,version:1,source:'ibkr-flex-cash',capturedAt},state),proposal=await preview(v,batch);
  const content={format:'open-decade-connection-proposal',version:1,provider:'ibkr-flex',capturedAt,rawHash,raw:text,batch},digest=hash(content);
  const filename=`connections/${digest}.json`;try{await fs.access(await safePath(path.join(v,filename)));}catch(e){if(e.code!=='ENOENT')throw e;await atomic(v,filename,canonical({...content,digest})+'\n');}
  await atomic(v,file,canonical({...current,lastSync:{capturedAt,rawHash,proposalId:digest,recordCount:batch.records.length,applied:false}})+'\n');
  return {...proposal,proposalId:digest,productionVerified:false,limitations:limits};
 });
}
export async function connectionProposal(v,id){assert(typeof id==='string'&&/^[a-f0-9]{64}$/.test(id),'INVALID_INPUT','Provide a saved connection proposal digest.');const target=await safePath(path.join(v,'connections',id+'.json'));assert((await fs.stat(target)).size<4000000,'INPUT_LIMIT','Connection proposal exceeds bounds.');const saved=JSON.parse(await fs.readFile(target,'utf8')),{digest,...content}=saved;assert(saved.format==='open-decade-connection-proposal'&&saved.version===1&&digest===id&&hash(content)===id&&hash(saved.raw)===saved.rawHash,'CORRUPT_VAULT','Connection proposal checksum differs.');return preview(v,saved.batch);}
