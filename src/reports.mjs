import {feeComparison,fxComparison} from './comparisons.mjs';
import {household,householdCashflow,householdScenario,taxScope} from './household.mjs';
import {reminders} from './reminders.mjs';
import {allocationPlan} from './allocation-plan.mjs';
import {retirement,housing} from './life-planning.mjs';
import {dateOK,assert,D} from './core.mjs';
import {picture,cashflow,reconciliation,goals} from './picture.mjs';
import {exposure,costs,performance} from './analytics.mjs';
import {taxChecklist} from './tax.mjs';
import {profile,policy} from './profile.mjs';
import {feeDrag,debtPaydown} from './planning.mjs';
import {diagnosis} from './diagnosis.mjs';
import {spending,bills,spendingProposals} from './spending.mjs';
import {readiness} from './readiness.mjs';
import {simulate} from './simulate.mjs';
const methods={'fee-comparison':feeComparison,'fx-comparison':fxComparison,household,'household-cashflow':householdCashflow,'household-scenario':householdScenario,'allocation-plan':allocationPlan,retirement,housing,reminders,tax:taxChecklist,profile,policy,'fee-drag':feeDrag,'debt-paydown':debtPaydown,diagnosis,spending,bills,'spending-proposals':spendingProposals,readiness,'net-worth':picture,cashflow,reconciliation,goals,exposure,costs,performance,simulation:simulate};
export function report(state,name,o){
 assert(Object.hasOwn(methods,name),'UNSUPPORTED_COMMAND','Unknown report.');
 if(['household-cashflow','cashflow','performance','spending','bills','spending-proposals'].includes(name))assert(dateOK(o.from)&&dateOK(o.to)&&(name!=='performance'?o.from<=o.to:o.from<o.to),'MISSING_INPUT','Provide --from and --to dates with from before to.');
 else if(name!=='simulation')assert(dateOK(o.asOf),'MISSING_INPUT','Provide an explicit --as-of YYYY-MM-DD date.');
 if(o.base)assert(/^[A-Z]{3}$/.test(o.base),'INVALID_INPUT','Base currency must be three uppercase letters.');
 if(['spending','bills','spending-proposals'].includes(name))assert(o.from>='1000-01-01'&&o.to<='9998-12-31','INPUT_LIMIT','Spending calendar dates must be between years 1000 and 9998.');
 const end=['household-cashflow','cashflow','performance','spending','bills','spending-proposals'].includes(name)?o.to:o.asOf;
 // Resolve corrections first; do not apply future-effective events or entities.
 const active=end?state.active.filter(r=>r.date<=end):state.active;
 const s={...state,active};const warnings=[];
 for(const r of name==='tax'?[]:active)if(r.kind==='corporate-action'||(r.kind==='trade'&&!r.transactionId)||(r.kind==='position'&&['other','unknown'].includes(r.instrumentType))||(r.kind==='observation'&&r.quantity!==undefined&&new D(r.quantity).lt(0)))warnings.push({code:'UNRESOLVED_INSTRUMENT_ACTIVITY',recordId:r.id});
 const data=methods[name](s,o,warnings);
 const kinds={reminders:['reminder','document-reference'],profile:['profile'],policy:['investment-policy'],'fee-drag':['fee-scenario'],'debt-paydown':['liability','observation','transaction','history'],spending:['account','transaction','category','history','budget'],bills:['recurring-payment','account'],'spending-proposals':['account','transaction','classification-rule','recurring-payment','category'],cashflow:['account','transaction','history'],goals:['account','position','liability','observation','transaction','history','fx','goal'],'net-worth':['account','position','liability','observation','transaction','history','fx'],reconciliation:['account','position','liability','observation','transaction','history'],exposure:['account','position','observation','transaction','history','fund','fx'],costs:['account','position','observation','transaction','history','fund','fx']};
 let inputs=active.filter(r=>['readiness','diagnosis','allocation-plan'].includes(name)||kinds[name]?.includes(r.kind)||warnings.some(w=>w.recordId===r.id));
 if(name==='simulation'){const a=state.resolve(o.assumptions);inputs=active.filter(r=>r.id===a.id||(a.goalId&&r.id===state.resolve(a.goalId).id));}
 if(name==='performance'){const id=state.resolve(o.account).id;inputs=active.filter(r=>r.id===id||(r.kind==='observation'&&state.resolve(r.entityId).id===id)||(['transaction','history'].includes(r.kind)&&state.resolve(r.accountId).id===id));}
 if(['retirement','housing'].includes(name)){const a=s.resolve(o.assumptions);inputs=active.filter(r=>r.id===a.id||(a.expenseIds??[]).some(id=>state.resolve(id)?.id===r.id));}
 if(['fee-comparison','fx-comparison'].includes(name))inputs=active.filter(r=>r.id===s.resolve(o.assumptions)?.id);
 if(name==='household')inputs=active.filter(r=>data.inputIds.includes(r.id)||['history','transaction','fx'].includes(r.kind));
 if(name==='household-scenario')inputs=active.filter(r=>data.inputIds.includes(r.id));
 if(name==='household-cashflow')inputs=active.filter(r=>data.inputIds.includes(r.id));
 if(name==='tax'){const scope=taxScope(s,o);inputs=active.filter(r=>r.id===scope.member?.id||(['tax-context','document-reference'].includes(r.kind)&&r.jurisdiction===o.jurisdiction&&r.taxYear===Number(o.year)&&scope.belongs(r)));}
 const distinct=[...new Map(warnings.map(w=>[JSON.stringify(w),w])).values()];
 return {data:{...data,metadata:{softwareVersion:'0.1.0',method:`${name}-${name==='goals'?'v3':['diagnosis','retirement','housing'].includes(name)?'v2':'v1'}`,inputIds:inputs.map(r=>r.id).sort(),sources:inputs.map(r=>({recordId:r.id,date:r.date,capturedAt:r.capturedAt,...r.provenance})),inputDates:[...new Set(inputs.map(r=>r.date))].sort(),coverage:distinct.length?'partial':'recorded inputs',assumptions:'See knowledge/methods.md and supplied record provenance.',unavailable:distinct.map(w=>w.code)}},warnings:distinct};
}
