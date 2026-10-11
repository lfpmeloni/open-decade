import {assert,dateOK,warning} from './core.mjs';
export function profileView(s,kind,o,warnings){
 assert(dateOK(o.asOf),'MISSING_INPUT','Provide an explicit --as-of date.');
 const records=s.active.filter(r=>r.kind===kind&&r.date<=o.asOf).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 if(!records.length)warnings.push(warning(kind==='profile'?'MISSING_PROFILE':'MISSING_POLICY'));
 if(records.length>1)warnings.push(warning('MULTIPLE_DATED_VERSIONS'));
 return {asOf:o.asOf,records,selection:'All effective active versions; select a policy ID explicitly when multiple policies exist.'};
}
export const profile=(s,o,w)=>profileView(s,'profile',o,w);
export const policy=(s,o,w)=>profileView(s,'investment-policy',o,w);
