import {retirement} from './life-planning.mjs';
import {D,sum,assert,warning} from './core.mjs';
import {selected,valuation,convert,goalClaimShare,cashflow} from './picture.mjs';
export function household(s,o,warnings){
 const plan=s.resolve(o.assumptions);assert(plan?.kind==='household-plan'&&s.active.some(r=>r.id===plan.id),'MISSING_INPUT','Select an effective household-plan with --assumptions.');
 const memberIds=plan.memberIds.map(id=>s.resolve(id).id),members=memberIds.map(id=>s.resolve(id)),activeMember=m=>m.participating&&s.active.some(r=>r.id===m.id),rows=members.map(m=>({memberId:m.id,participating:activeMember(m),...(activeMember(m)?{name:m.name}:{}),perCurrency:activeMember(m)?{}:null,values:[]}));
 let complete=warnings.length===0;for(const m of members)if(!activeMember(m)){warnings.push(warning('HOUSEHOLD_OPT_IN_REQUIRED',m.id));complete=false;}
 const coverageWarnings=[],chosen=selected(s,coverageWarnings),selectedIds=new Set(chosen.map(e=>e.id)),scope=plan.allocations.map(a=>s.resolve(a.entityId).id),references=new Set([plan.id,...memberIds]),outsideShares=[];
 for(const allocation of plan.allocations){
  const e=s.resolve(allocation.entityId);references.add(e.id);if(!selectedIds.has(e.id)){warnings.push(warning('HOUSEHOLD_ENTITY_COVERAGE',e.id));complete=false;continue;}
  const w=[],v=valuation(s,e,o.asOf,w);warnings.push(...w);if(w.length||!v)complete=false;if(!v)continue;references.add(v.observationId);
  const assigned=goalClaimShare(allocation.members);outsideShares.push({entityId:e.id,unassignedShare:new D(1).minus(assigned)});
  for(const assignment of allocation.members){
   const row=rows.find(r=>r.memberId===s.resolve(assignment.memberId).id);if(!row.participating)continue;
   const value=new D(v.value).times(assignment.share),bucket=row.perCurrency[e.currency]??={assets:new D(0),liabilities:new D(0)};bucket[e.kind==='liability'?'liabilities':'assets']=bucket[e.kind==='liability'?'liabilities':'assets'].plus(value);
   row.values.push({entityId:e.id,kind:e.kind,currency:e.currency,share:assignment.share,assignedValue:value,observationId:v.observationId,observationDate:v.observationDate});
  }
 }
 if(!scope.length){warnings.push(warning('HOUSEHOLD_EMPTY_SCOPE',plan.id));complete=false;}
 const currencies={};
 for(const row of rows){if(!row.participating)continue;for(const [currency,b]of Object.entries(row.perCurrency)){b.netWorth=b.assets.minus(b.liabilities);const total=currencies[currency]??={assets:new D(0),liabilities:new D(0)};total.assets=total.assets.plus(b.assets);total.liabilities=total.liabilities.plus(b.liabilities);}row.taxContextIds=s.active.filter(r=>r.kind==='tax-context'&&r.memberId&&s.resolve(r.memberId).id===row.memberId).map(r=>{references.add(r.id);return r.id;});}
 for(const b of Object.values(currencies))b.netWorth=b.assets.minus(b.liabilities);
 let combined=null;if(o.base&&complete){const converted=Object.entries(currencies).map(([c,b])=>convert(s,b.netWorth,c,o.base,o.asOf,warnings));if(converted.every(v=>v!==null)&&!warnings.some(w=>w.code==='STALE_FX'))combined=sum(converted);else complete=false;}
 if(!complete)warnings.push(warning('HOUSEHOLD_INCOMPLETE',plan.id));
 return {asOf:o.asOf,planId:plan.id,name:plan.name,scopeEntityIds:scope,inputIds:[...references],members:rows,unassignedShares:outsideShares,perCurrency:complete?currencies:null,baseCurrency:o.base??null,combinedNetWorth:complete?combined:null,complete,limitations:['Explicit shared-vault planning scope only; not a consolidation of every family asset. Household shares apply to gross recorded values and replace personal ownership/responsibility only in this report. They do not change personal reports or establish legal liability. Tax checklists require a separate member selection and are never combined. Participation flags are report controls, not access controls; everyone granted vault access can read its files and backups.']};
}
export function taxScope(s,o){
 let member=null;if(o.member){member=s.resolve(o.member);assert(member?.kind==='household-member'&&member.participating&&s.active.some(r=>r.id===member.id),'MISSING_INPUT','Select an effective participating household member.');}
 const belongs=r=>member?r.memberId&&s.resolve(r.memberId)?.id===member.id:!r.memberId;
 return {member,belongs};
}

// Reuse cashflow's history and transfer checks with explicit household account shares.
// The projected state is report-local; neither personal ownership nor the journal changes.
export function householdCashflow(s,o,warnings){
 const plan=s.resolve(o.assumptions);assert(plan?.kind==='household-plan'&&s.active.some(r=>r.id===plan.id),'MISSING_INPUT','Select an effective household-plan with --assumptions.');
 const inputIds=new Set([plan.id]),allocations=plan.allocations.filter(a=>s.resolve(a.entityId).kind==='account'),members=[],totals={},unassignedShares=[];
 let complete=warnings.length===0;
 if(plan.date>o.from){warnings.push(warning('HOUSEHOLD_PERIOD_NOT_COVERED',plan.id));complete=false;}
 if(!allocations.length){warnings.push(warning('HOUSEHOLD_EMPTY_ACCOUNT_SCOPE',plan.id));complete=false;}
 for(const a of allocations)unassignedShares.push({accountId:s.resolve(a.entityId).id,unassignedShare:new D(1).minus(goalClaimShare(a.members))});
 for(const id of plan.memberIds){
  const member=s.resolve(id);inputIds.add(member.id);
  if(!member.participating||!s.active.some(r=>r.id===member.id)){warnings.push(warning('HOUSEHOLD_OPT_IN_REQUIRED',member.id));complete=false;members.push({memberId:member.id,participating:false,perCurrency:null,transactionIds:[]});continue;}
  const shares=new Map(allocations.map(a=>[s.resolve(a.entityId).id,a.members.find(x=>s.resolve(x.memberId).id===member.id)?.share??'0']).filter(([,share])=>new D(share).gt(0)));
  const selected=r=>r.kind==='account'?shares.has(r.id):['transaction','history'].includes(r.kind)&&shares.has(s.resolve(r.accountId).id);
  const active=s.active.filter(selected),resolve=id=>{const r=s.resolve(id);return r?.kind==='account'&&shares.has(r.id)?{...r,ownership:shares.get(r.id)}:r;};
  const ownWarnings=[];if(member.date>o.from)ownWarnings.push(warning('HOUSEHOLD_PERIOD_NOT_COVERED',member.id));
  for(const a of active.filter(r=>r.kind==='account'))if(a.date>o.from)ownWarnings.push(warning('HOUSEHOLD_PERIOD_NOT_COVERED',a.id));
  const flow=shares.size?cashflow({...s,active,resolve},o,ownWarnings):{perCurrency:{},transactionIds:[]};
  for(const r of active)inputIds.add(r.id);
  warnings.push(...ownWarnings.map(w=>({...w,memberId:member.id})));if(ownWarnings.length)complete=false;
  members.push({memberId:member.id,name:member.name,participating:true,accountShares:[...shares].map(([accountId,share])=>({accountId,share})),...flow,complete:ownWarnings.length===0});
  for(const [currency,values]of Object.entries(flow.perCurrency)){const bucket=totals[currency]??={};for(const [kind,amount]of Object.entries(values))bucket[kind]=(bucket[kind]??new D(0)).plus(amount);}
 }
 if(!complete)warnings.push(warning('HOUSEHOLD_INCOMPLETE',plan.id));
 return {from:o.from,to:o.to,planId:plan.id,inputIds:[...inputIds],scopeAccountIds:allocations.map(a=>s.resolve(a.entityId).id),members,unassignedShares,perCurrency:complete?totals:null,complete,limitations:['Account shares apply to gross transaction amounts throughout the requested period; no personal ownership multiplier is added. Only explicitly allocated accounts are included. Transfers with unequal member shares, cross-currency legs or missing counterpart accounts remain unresolved. Shares and participation must cover the whole period; split reports when these change. Tax contexts and documents are excluded.']};
}

// One explicitly confirmed pooled scenario; never sum individual scenario capital.
export function householdScenario(s,o,warnings){
 const plan=s.resolve(o.assumptions);assert(plan?.kind==='household-plan'&&s.active.some(r=>r.id===plan.id)&&plan.scenarioId,'MISSING_INPUT','Select an effective household-plan with a confirmed retirement scenarioId.');
 const scenario=s.resolve(plan.scenarioId);assert(scenario?.kind==='retirement-scenario'&&s.active.some(r=>r.id===scenario.id),'MISSING_INPUT','The household scenario must be effective at the report date.');
 const members=plan.memberIds.map(id=>s.resolve(id)),inputIds=[plan.id,scenario.id,...members.map(m=>m.id),...scenario.expenseIds.map(id=>s.resolve(id).id)];
 let available=true;
 for(const m of members)if(!m.participating||!s.active.some(r=>r.id===m.id)){warnings.push(warning('HOUSEHOLD_OPT_IN_REQUIRED',m.id));available=false;}
 for(const r of [plan,...members])if(r.date>scenario.startMonth){warnings.push(warning('HOUSEHOLD_PERIOD_NOT_COVERED',r.id));available=false;}
 const projection=available?retirement(s,{...o,assumptions:scenario.id},warnings):null;
 return {...(projection??{cases:[],currency:scenario.currency,draft:true}),planId:plan.id,name:plan.name,scenarioId:scenario.id,inputIds,
  members:members.map(m=>({memberId:m.id,participating:m.participating&&s.active.some(r=>r.id===m.id),...(m.participating&&s.active.some(r=>r.id===m.id)?{name:m.name}:{})})),
  projectionMethod:'retirement-v2',projectionAvailable:available&&projection.cases.length>0,
  limitations:[...(projection?.limitations??[]),'Showcase: one confirmed pooled spendable capital, income, spending and pension scenario for the participating household. Inputs are aggregate assumptions, not a sum of member scenarios or recorded net worth. No asset reservation, member allocation, legal ownership change or combined tax calculation. Personal and household-picture/cashflow reports remain unchanged.']};
}
