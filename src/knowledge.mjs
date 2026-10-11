import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {assert,dateOK} from './core.mjs';
const catalogue=JSON.parse(readFileSync(new URL('../knowledge/catalogue.json',import.meta.url)));
export function lookup({query='',topic,jurisdiction,asOf,limit=10}={}){
 assert(dateOK(asOf),'MISSING_INPUT','Provide an explicit knowledge review date with --as-of.');
 assert(typeof query==='string'&&query.length<=500,'INPUT_LIMIT','Knowledge query exceeds 500 characters.');
 assert(!jurisdiction||/^[A-Z]{2}$/.test(jurisdiction),'INVALID_INPUT','Jurisdiction must be a two-letter country code.');
 assert(Number.isInteger(limit)&&limit>=1&&limit<=20,'INPUT_LIMIT','Knowledge results must be bounded to 1–20.');
 const words=query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),warnings=[];
 let entries=catalogue.entries.filter(e=>(!topic||e.id===topic)&&(!jurisdiction||e.jurisdictions.includes('global')||e.jurisdictions.includes(jurisdiction)));
 entries=entries.map(e=>({...e,score:words.reduce((n,w)=>n+Number([e.id,e.title,...e.tags].join(' ').toLowerCase().includes(w)),0)})).filter(e=>!words.length||e.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,limit).map(({score,...e})=>({...e,reviewStatus:asOf<e.reviewedAt?'not-yet-reviewed':asOf>e.reviewDue?'stale':'current'}));
 for(const e of entries){if(e.reviewStatus!=='current')warnings.push({code:'KNOWLEDGE_REVIEW_REQUIRED',topic:e.id});if(e.kind==='specification')warnings.push({code:'SPECIFICATION_ONLY',topic:e.id});}
 if(!entries.length)warnings.push({code:'NO_APPLICABLE_KNOWLEDGE'});
 return {data:{catalogueVersion:catalogue.version,asOf,entries,interpretation:'Routing suggestions; check capability status before using a planned operation.',evidenceContract:{facts:'Recorded input IDs and dates',preferences:'Confirmed policy or profile',assumptions:'Explicit supplied scenario values',unsupported:'Missing inputs or unavailable methods'}},warnings};
}
export async function knowledge(o){
 const result=lookup(o);
 if(o.topic&&result.data.entries.length){const e=result.data.entries[0];result.data.document=await fs.readFile(new URL('../'+e.path,import.meta.url),'utf8');}
 return result;
}
