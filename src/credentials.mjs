import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {hash,assert} from './core.mjs';
const execute=promisify(execFile);
export const credentialService=v=>'open-decade-ibkr-'+hash(v).slice(0,32);
// No setter accepts credentials through agent arguments, files, environment or logs.
// Users provision their OS keyring directly; only this narrow CLI boundary reads it.
export function credentialStore(v,{platform=process.platform,run=execute}={}){
 const service=credentialService(v);
 const args=action=>platform==='linux'?['secret-tool',[action==='read'?'lookup':'clear','service',service]]:platform==='darwin'?['security',action==='read'?['find-generic-password','-a','open-decade','-s',service,'-w']:['delete-generic-password','-a','open-decade','-s',service]]:null;
 return {service,platform,supported:['linux','darwin'].includes(platform),async read(){
  const command=args('read');assert(command,'MISSING_INPUT','OS credential integration unavailable on this platform; use file import.');
  try{const {stdout}=await run(...command,{timeout:15000,maxBuffer:4096,encoding:'utf8'});const token=stdout.trim();assert(/^[A-Za-z0-9_-]{8,512}$/.test(token),'MISSING_INPUT','Token missing or unsupported.');return token;}catch{assert(false,'MISSING_INPUT','Unlock/provision the OS credential store for this connection, or use file import.');}
 },async clear(){const command=args('clear');assert(command,'MISSING_INPUT','OS credential integration unavailable.');try{await run(...command,{timeout:15000,maxBuffer:4096,encoding:'utf8'});}catch{assert(false,'SOURCE_FAILURE','Local credential deletion failed; remove it through the OS store.');}}};
}
