import {readFileSync} from 'node:fs';
import {assert,dateOK} from './core.mjs';
import {capabilities} from './capabilities.mjs';
const release=JSON.parse(readFileSync(new URL('../docs/release-acceptance.json',import.meta.url)));
const catalogue=JSON.parse(readFileSync(new URL('../knowledge/catalogue.json',import.meta.url)));
const jurisdictions=['US','DE','GB','FR','ES','IT','NL'];
const taxes=jurisdictions.map(j=>JSON.parse(readFileSync(new URL(`../knowledge/tax/${j}-2025.json`,import.meta.url))));
export const formatReviews=[
 {id:'wise-csv',scope:'English COMPACT CSV header profile; synthetic DE/GB/US account mapping',reviewedAt:'2026-10-11',reviewDue:'2027-01-11',fixture:'fixtures/imports/wise.csv',test:'test/provider-imports.test.mjs',evidence:'Official statement format references and synthetic acceptance; no live export certification'},
 {id:'lossless-csv',scope:'Open-decade schema 1/2 CSV contract; global, JSON record fields',reviewedAt:'2026-10-10',reviewDue:'2027-01-10',fixture:'fixtures/standard.csv',test:'test/acceptance.test.mjs',evidence:'Synthetic contract acceptance; no provider-layout claim'},
 {id:'mapped-csv',scope:'User-specified column, decimal and date mapping; no provider or language inference',reviewedAt:'2026-10-10',reviewDue:'2027-01-10',fixture:'fixtures/imports/mapped.csv',test:'test/mapped-csv.test.mjs',evidence:'Synthetic locale, correction and repeat-import acceptance'},
 {id:'ofx-bank',scope:'Banking subset; synthetic SGML 102 and XML 230 fixtures; no named institution certification',reviewedAt:'2026-10-10',reviewDue:'2027-01-10',fixture:'fixtures/imports/bank.ofx',test:'test/ofx.test.mjs',evidence:'Synthetic recorded formats only; no live provider test'}
];
export function maintenance(o){
 assert(dateOK(o.asOf),'MISSING_INPUT','Provide --as-of for maintenance review dates.');
 const status=x=>o.asOf<x.reviewedAt?'future':o.asOf>x.reviewDue?'due':'current';
 const knowledge=[...catalogue.entries.map(e=>({id:e.id,version:e.version,reviewedAt:e.reviewedAt,reviewDue:e.reviewDue,path:e.path})),...taxes.map((e,i)=>({id:`tax-${jurisdictions[i]}-2025`,version:e.version,reviewedAt:e.reviewedAt,reviewDue:e.reviewDue,path:`knowledge/tax/${jurisdictions[i]}-2025.json`}))].map(e=>({...e,status:status(e),action:'Review original source and applicability; update public method/version only after verification.'}));
 const formats=formatReviews.map(e=>({...e,status:status(e),action:'Run synthetic acceptance; obtain an authorized current export layout before expanding provider coverage.'}));
 const releaseGates=capabilities.filter(c=>['experimental','planned'].includes(c.status)).map(c=>({id:c.id,status:c.status,workflow:c.workflow,limitations:c.limits,acceptance:c.acceptance??null}));
 const queue=[...knowledge.filter(x=>x.status!=='current').map(x=>({kind:'knowledge',...x})),...formats.filter(x=>x.status!=='current').map(x=>({kind:'format',...x}))];
 return {data:{asOf:o.asOf,catalogueVersion:catalogue.version,queue,knowledge,formats,releaseGates,followUpCapabilities:releaseGates,roadmapStatus:release.roadmapStatus,platforms:release.platforms,accessibility:release.accessibility,agentIntegration:release.agentIntegration,providerScope:release.providers,limitations:['Read-only local review queue, not a live format-change detector. No source fetch, background task, notification or status promotion. Review dates are project checkpoints, not assurances that external formats or rules remain unchanged.']},warnings:queue.length?[{code:'MAINTENANCE_REVIEW_REQUIRED',count:queue.length}]:[]};
}
