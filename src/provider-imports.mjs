import fs from 'node:fs/promises';
import {isUtf8} from 'node:buffer';
import {parse} from 'csv-parse/sync';
import {assert,hash} from './core.mjs';
import {mappedCSV,localizedAmount} from './mapped-csv.mjs';
export const providerFormats=[{id:'wise-csv',version:'wise-compact-en-v1',provider:'Wise',product:'Single-currency balance statement, COMPACT CSV',countries:['DE','GB','US'],language:'en',status:'experimental',reviewedAt:'2026-10-11',reviewDue:'2027-01-11',evidence:'Synthetic English header profile; no live export certification',sources:['https://wise.com/help/articles/2736049/how-do-i-download-a-statement','https://docs.wise.com/api-reference/balance-statement/balancestatementget'],limitations:['Explicit account, country, date and decimal interpretation required. No pending activity, FLAT fees, holdings, automatic balance or history records. Other layouts use mapped CSV or host extraction.']}];
const wiseColumns=['TransferWise ID','Date','Amount','Currency','Description','Payment Reference','Running Balance','Exchange From','Exchange To','Exchange Rate','Payer Name','Payee Name','Payee Account Number','Merchant','Card Last Four Digits','Card Holder Full Name','Attachment','Note','Total fees'];
export function providerImport(adapter,text,m,s){
 const profile=providerFormats.find(p=>p.id===adapter);assert(profile,'INVALID_INPUT','Unsupported provider adapter; use mapped CSV or host extraction.');
 assert(typeof text==='string'&&Buffer.byteLength(text)<=10000000,'INPUT_LIMIT','Provider export exceeds ten megabytes.');
 assert(m?.version===1&&m.formatVersion===profile.version&&profile.countries.includes(m.country)&&m.language==='en'&&m.statementType==='COMPACT','INVALID_INPUT','Confirm the supported country, English COMPACT layout and format version.');
 let rows,headers;try{rows=parse(text,{bom:true,columns:h=>{headers=h;return h;},skip_empty_lines:true,max_record_size:100000});}catch{assert(false,'INVALID_CSV','Malformed provider CSV.');}
 assert(headers&&new Set(headers).size===headers.length&&headers.every(h=>wiseColumns.includes(h))&&['TransferWise ID','Date','Amount','Currency','Description','Running Balance'].every(h=>headers.includes(h)),'INVALID_CSV','Unsupported Wise headers; use mapped CSV or host extraction.');
 const mapping={version:1,source:'wise-compact-en-v1',accountId:m.accountId,dateFormat:m.dateFormat,decimal:m.decimal,group:m.group??'',capturedAt:m.capturedAt,corrections:m.corrections,columns:{id:'TransferWise ID',date:'Date',amount:'Amount',currency:'Currency',description:'Description'}};
 const batch=mappedCSV(text,mapping,s);
 const balances=rows.map((r,i)=>({recordId:batch.records[i].id,date:batch.records[i].date,currency:r.Currency,value:localizedAmount(r['Running Balance'],m.decimal,m.group??''),...(r['Total fees']?{disclosedFee:localizedAmount(r['Total fees'],m.decimal,m.group??'')}:{})}));
 return {batch,sourceMetadata:{adapter,formatVersion:profile.version,country:m.country,language:m.language,rawHash:hash(text),balances,feesTreatment:'Amount imported once; disclosed fees are metadata only, never added a second time.',history:'Unconfirmed; running balances do not establish a complete transaction history.'},warnings:[{code:'PROVIDER_FORMAT_EXPERIMENTAL'},{code:'SOURCE_BALANCES_NOT_APPLIED'}]};
}
export async function providerFile(adapter,file,mapping,state){
 for(const name of [file,mapping])assert(typeof name==='string'&&(await fs.stat(name)).size<=10000000,'INPUT_LIMIT','Export and mapping must be files under ten megabytes.');
 let m;try{m=JSON.parse(await fs.readFile(mapping,'utf8'));}catch{assert(false,'INVALID_INPUT','Provider mapping must be JSON.');}
 const bytes=await fs.readFile(file);assert(isUtf8(bytes),'INVALID_CSV','Provider export must be UTF-8.');return providerImport(adapter,bytes.toString('utf8'),m,state);
}
