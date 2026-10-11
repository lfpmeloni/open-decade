import {parse} from 'csv-parse/sync';
import fs from 'node:fs/promises';
import {isUtf8} from 'node:buffer';
import {assert,hash,canonical,dateOK,D} from './core.mjs';
import {shape} from './validate.mjs';
export function localizedAmount(value,decimal,group=''){
 assert(typeof value==='string'&&['.',','].includes(decimal)&&['',',','.',' '].includes(group)&&decimal!==group,'INVALID_CSV','Specify distinct decimal and grouping separators.');
 const escaped=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const integer=group?`(?:\\d{1,3}(?:${escaped(group)}\\d{3})+|\\d+)`:'\\d+';
 assert(new RegExp(`^-?${integer}(?:${escaped(decimal)}\\d+)?$`).test(value.trim()),'INVALID_CSV','Amount does not match the confirmed locale.');
 const normalized=value.trim().split(group||'\0').join('').replace(decimal,'.');return new D(normalized).toString();
}
function localDate(value,format){
 let date=value;
 if(format!=='YYYY-MM-DD'){
  const m=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);assert(m,'INVALID_CSV','Date does not match the selected format.');
  date=format==='DD/MM/YYYY'?`${m[3]}-${m[2]}-${m[1]}`:`${m[3]}-${m[1]}-${m[2]}`;
 }
 assert(dateOK(date),'INVALID_CSV','Invalid calendar date.');return date;
}
export function mappedCSV(text,m,s){
 assert(m?.version===1&&typeof m.source==='string'&&m.source.length>0&&m.source.length<=500,'INVALID_CSV','Provide a version 1 mapping with a source label.');
 assert(['YYYY-MM-DD','DD/MM/YYYY','MM/DD/YYYY'].includes(m.dateFormat)&&['.',','].includes(m.decimal),'INVALID_CSV','Confirm date format and decimal separator.');
 assert([',',';','\t'].includes(m.delimiter??','),'INVALID_CSV','Unsupported delimiter.');
 assert(m.columns&&['id','date','amount'].every(k=>typeof m.columns[k]==='string'),'INVALID_CSV','Map stable ID, date and signed amount columns.');
 assert(Boolean(m.currency)!==Boolean(m.columns.currency),'INVALID_CSV','Select one currency source: constant or column.');
 const a=s.resolve(m.accountId);assert(a?.kind==='account','INVALID_REFERENCE','Map to a confirmed account.');
 const allowed=['id','date','amount','currency','description'];assert(Object.keys(m.columns).every(k=>allowed.includes(k)),'INVALID_CSV','Unsupported mapped field.');
 let headers,rows;
 try{rows=parse(text,{bom:true,skip_empty_lines:true,delimiter:m.delimiter??',',columns:h=>{headers=h;return h;},max_record_size:100000});}catch{assert(false,'INVALID_CSV','Malformed CSV input.');}
 assert(rows.length>0&&rows.length<=10000&&new Set(headers).size===headers.length,'INVALID_CSV','CSV must have unique headers and 1–10000 rows.');
 assert(Object.values(m.columns).every(h=>headers.includes(h)),'INVALID_CSV','A mapped column is absent; review changed headers.');
 // Corrections must not turn an existing account into a new source namespace.
 let rootAccount=a;while(rootAccount.supersedes&&s.all.has(rootAccount.supersedes))rootAccount=s.all.get(rootAccount.supersedes);
 const source=`csv:${m.source}:${rootAccount.id}`,seen=new Set(),records=[];
 for(const [i,row] of rows.entries()){
  const external=row[m.columns.id];assert(external&&external.length<=500&&!seen.has(external),'INVALID_CSV','Stable IDs must be nonempty and unique within the file.');seen.add(external);
  const sourceId=hash(external),currency=m.currency??row[m.columns.currency];assert(currency===a.currency,'CURRENCY_MISMATCH','CSV currency differs from the mapped account.');
  const fields={kind:'transaction',date:localDate(row[m.columns.date],m.dateFormat),accountId:rootAccount.id,currency,amount:localizedAmount(row[m.columns.amount],m.decimal,m.group??''),classification:'unknown',...(m.columns.description?{description:row[m.columns.description]}:{})};
  const old=s.active.find(r=>r.kind==='transaction'&&r.provenance.source===source&&r.provenance.sourceId===sourceId);
  const comparable=r=>{const {id,capturedAt,provenance,supersedes,...rest}=r;return canonical(rest);};
  if(old&&comparable(old)===canonical(fields)){records.push(old);continue;}
  assert(!old||m.corrections?.[external]===old.id,'SOURCE_CONFLICT','Changed source data needs an explicit correction mapping and new preview.');
  const r={id:`csv-${hash({source,sourceId,fields})}`,capturedAt:m.capturedAt,provenance:{source,sourceId,quality:'source-reported',uncertainties:[],row:i+2,...((s.schemaVersion??1)===2?{rawReference:`sha256:${hash(text)}`}:{})},...fields,...(old?{supersedes:old.id}:{})};
  records.push(r);
 }
 const b={schemaVersion:s.schemaVersion??1,batchId:`csv-${hash(records)}`,records};return shape(b);
}
export async function mappedFile(file,mapping,state){
 for(const name of [file,mapping])assert(typeof name==='string'&&(await fs.stat(name)).size<=10000000,'INPUT_LIMIT','CSV and mapping must be files under ten megabytes.');
 let m;try{m=JSON.parse(await fs.readFile(mapping,'utf8'));}catch{assert(false,'INVALID_CSV','Mapping must be JSON.');}
 const bytes=await fs.readFile(file);assert(isUtf8(bytes),'INVALID_CSV','CSV must be valid UTF-8.');
 return mappedCSV(bytes.toString('utf8'),m,state);
}
