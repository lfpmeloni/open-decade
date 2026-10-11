import {taxScope} from './household.mjs';
import {readFileSync} from 'node:fs';
import {assert,warning} from './core.mjs';
const jurisdictions=['US','DE','GB','FR','ES','IT','NL'];
const guides=Object.fromEntries(jurisdictions.map(j=>[j,JSON.parse(readFileSync(new URL(`../knowledge/tax/${j}-2025.json`,import.meta.url)))]));
const triggers={income:'investmentIncome',disposals:'disposals','foreign-accounts':'foreignAccounts',wrappers:'wrappers',retirement:'retirementIncome'};
export function taxChecklist(s,o,warnings){
 assert(jurisdictions.includes(o.jurisdiction),'MISSING_INPUT','Select US, DE, GB, FR, ES, IT or NL with --jurisdiction.');
 const {member,belongs}=taxScope(s,o);
 const year=Number(o.year);assert(Number.isInteger(year)&&year>=2000&&year<=2100,'MISSING_INPUT','Provide --year with the starting tax year.');
 if(year!==2025){warnings.push(warning('UNSUPPORTED_TAX_YEAR'));return {jurisdiction:o.jurisdiction,taxYear:year,supportedYears:[2025],items:[],deadlines:[],questions:['Obtain a reviewed guide for the requested country and year.'],filingDecision:'not-produced',taxLiability:null};}
 if(!member&&s.active.some(r=>r.kind==='tax-context'&&r.memberId))warnings.push(warning('MEMBER_CONTEXT_SELECTION_REQUIRED'));
 const personal=s.active.filter(belongs);
 if(o.context)assert(personal.some(r=>r.kind==='tax-context'&&r.id===s.resolve(o.context)?.id),'MISSING_INPUT','Tax context is not in the selected personal scope.');
 const guide=guides[o.jurisdiction],contexts=personal.filter(r=>r.kind==='tax-context'&&r.jurisdiction===o.jurisdiction&&r.taxYear===year),context=o.context?contexts.find(r=>r.id===s.resolve(o.context)?.id):contexts.length===1?contexts[0]:null;
 const documents=personal.filter(r=>r.kind==='document-reference'&&r.jurisdiction===o.jurisdiction&&r.taxYear===year),otherCountries=[...new Set(personal.filter(r=>r.kind==='tax-context'&&r.taxYear===year&&r.jurisdiction!==o.jurisdiction).map(r=>r.jurisdiction))];
 const reviewStatus=o.asOf<guide.reviewedAt?'not-yet-reviewed':o.asOf>guide.reviewDue?'stale':'current';
 if(reviewStatus!=='current')warnings.push(warning('STALE_TAX_GUIDANCE'));
 if(!context)warnings.push(warning(contexts.length>1?'AMBIGUOUS_TAX_CONTEXT':'MISSING_TAX_CONTEXT'));
 const unresolved=!context||context.residence!=='resident'||context.specialCases.length>0;
 if(unresolved)warnings.push(warning('TAX_APPLICABILITY_UNRESOLVED',context?.id));
 const questions=[...guide.questions];
 if(!context)questions.push('Confirm residence, investment income, disposals, foreign accounts, wrappers, retirement income and special cases for this jurisdiction/year.');
 if(context?.residence!=='resident')questions.push('Ask a qualified preparer to establish residence and applicability; this module does not make that determination.');
 if(context?.specialCases.length)questions.push(`Separate professional review is needed for the recorded special cases: ${context.specialCases.join(', ')}.`);
 if(otherCountries.length||context?.foreignAccounts!=='no'){questions.push('Review each potentially applicable country separately, including foreign-account information and treaty questions. No combined tax calculation is produced.');warnings.push(warning('CROSS_BORDER_REVIEW'));}
 const items=Object.entries(guide.documents).filter(([kind])=>context?.[triggers[kind]]!=='no').map(([kind,description])=>{
  const refs=documents.filter(d=>d.documentType===kind);const answer=context?.[triggers[kind]]??'unknown';
  if(answer==='unknown')warnings.push({code:'UNANSWERED_TAX_QUESTION',field:triggers[kind]});
  return {documentType:kind,description,questionnaireAnswer:answer,documentReferences:refs.map(d=>({recordId:d.id,name:d.name,status:d.status,reference:d.reference})),status:refs.some(d=>d.status==='present')?'references-present':'collect-or-clarify',coverage:'not-established',origin:'Project collection checklist; does not establish required forms or completeness.'};
 });
 const deadlines=reviewStatus==='current'?guide.deadlines.map(d=>({...d,source:guide.sources.find(x=>x.id===d.sourceId),calendarStatus:d.date<o.asOf?'past-reference-date':'upcoming-reference-date',personalApplicability:'not-determined'})):[];
 return {memberId:member?.id??null,jurisdiction:o.jurisdiction,taxYear:year,period:guide.period,guideVersion:guide.version,reviewedAt:guide.reviewedAt,reviewDue:guide.reviewDue,reviewStatus,contextId:context?.id??null,applicability:unresolved?'unresolved':'document-collection-context-confirmed',items,deadlines,questions,otherCountryContexts:otherCountries,sources:guide.sources,documents,scope:guide.scope,filingDecision:'not-produced',taxLiability:null,submission:false,limitations:['Checklists are not exhaustive. A present reference does not verify document contents or all accounts. Deadlines are conditional source references, not a determination of personal filing obligations. Credentials and identity numbers are not requested.']};
}
