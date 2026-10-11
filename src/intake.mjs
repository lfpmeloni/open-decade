import fs from 'node:fs/promises';
import {parse} from 'csv-parse/sync';
import {assert,fail} from './core.mjs';
import {shape} from './validate.mjs';
export async function intake(file){
 const stat=await fs.stat(file);assert(stat.size<=10000000,'INPUT_LIMIT','Input exceeds ten megabytes.');
 const text=await fs.readFile(file,'utf8');let batch;
 try{
  if(file.toLowerCase().endsWith('.csv')){
   const rows=parse(text,{columns:true,bom:true,skip_empty_lines:true});
   assert(rows.length>0&&Object.keys(rows[0]).join(',')==='schemaVersion,batchId,kind,record','INVALID_CSV','Use the standard CSV columns.');
   assert(rows.every(r=>['1','2'].includes(r.schemaVersion)&&r.schemaVersion===rows[0].schemaVersion&&r.batchId===rows[0].batchId),'INVALID_CSV','CSV batch identity or version differs.');
   batch={schemaVersion:Number(rows[0].schemaVersion),batchId:rows[0].batchId,records:rows.map(row=>{const r=JSON.parse(row.record);assert(r.kind===row.kind,'INVALID_CSV','CSV kind does not match record.');return r;})};
  }else batch=JSON.parse(text);
 }catch(e){if(e.code&&['INVALID_CSV','INPUT_LIMIT'].includes(e.code))throw e;fail('INVALID_INPUT','Input is not valid normalized JSON or standard CSV.');}
 return shape(batch);
}
