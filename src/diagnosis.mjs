import {D,sum,warning,assert,dateOK} from './core.mjs';
import {picture,convert,goals,goalClaims,goalClaimShare} from './picture.mjs';
import {spending} from './spending.mjs';
import {costs} from './analytics.mjs';
export function diagnosis(s,o,warnings){
 assert(dateOK(o.from)&&o.from<=o.asOf,'MISSING_INPUT','Diagnosis requires an explicit spending-window --from and --as-of date.');
 const candidates=s.active.filter(r=>r.kind==='investment-policy'),policy=o.policy?s.resolve(o.policy):candidates.length===1?candidates[0]:null;
 const findings=[];const add=(code,severity,ids,threshold,observed,remedy,limitations=[])=>findings.push({code,severity,inputIds:[...new Set([...(policy?[policy.id]:[]),...ids])],method:'diagnosis-v2',policyId:policy?.id??null,threshold,observed,remedy,limitations});
 if(!policy||policy.kind!=='investment-policy'||policy.date>o.asOf){warnings.push(warning('MISSING_POLICY'));add('MISSING_POLICY','unknown',[],null,null,'Confirm one investment policy or select its ID.');return {asOf:o.asOf,findings,verdict:'incomplete',policyId:null};}
 if(policy.reviewDate<o.asOf){warnings.push(warning('POLICY_REVIEW_DUE',policy.id));add('POLICY_REVIEW_DUE','review',[policy.id],policy.reviewDate,o.asOf,'Review the dated policy before using its thresholds.');}
 const pw=[],p=picture(s,{asOf:o.asOf,base:policy.currency},pw);warnings.push(...pw);
 const valuationIds=[...new Set(p.values.flatMap(v=>[v.entityId,v.observationId]).concat(s.active.filter(r=>['transaction','history','fx'].includes(r.kind)).map(r=>r.id)))];
 if(pw.length||p.combinedNetWorth===null)add('PICTURE_INCOMPLETE','unknown',valuationIds,null,null,'Resolve valuation, history, overlap and currency gaps.',pw.map(w=>w.code));
 const claims=goalClaims(s);
 const currencyValue=v=>convert(s,v.ownedValue,v.currency,policy.currency,o.asOf,warnings);
 const ids=policy.liquidEntityIds.map(id=>s.resolve(id).id),liquidValues=ids.map(id=>p.values.find(v=>v.entityId===id));
 const liquidConverted=liquidValues.map(v=>v?currencyValue(v):null),liquid=ids.length&&liquidConverted.every(v=>v!==null)?sum(liquidConverted):null;
 const earmarks=ids.map((id,i)=>{const entries=claims.get(id)??[],share=goalClaimShare(entries);if(share.gt(1))warnings.push(warning('GOAL_ALLOCATION_OVERLAP',id));return {entityId:id,goalIds:entries.map(c=>c.goalId),share,protectedValue:share.lte(1)&&liquidConverted[i]!==null?liquidConverted[i].times(share):null};});
 const freeLiquid=liquid!==null&&earmarks.every(e=>e.protectedValue!==null)?liquid.minus(sum(earmarks.map(e=>e.protectedValue))):null;
 const sw=[],sp=spending(s,{from:o.from,to:o.asOf},sw);warnings.push(...sw);
 const essential=sp.categories.filter(c=>c.nature==='essential');const sameCurrency=essential.every(c=>c.currency===policy.currency);
 const fullCoverage=sp.months.length>0&&!sw.some(w=>['INCOMPLETE_HISTORY','INCOMPLETE_MONTH','UNCLASSIFIED_FLOW','UNMATCHED_TRANSFER','MISSING_CATEGORY','UNMATCHED_REFUND'].includes(w.code));
 const monthly=fullCoverage&&sameCurrency&&essential.length?sum(essential.map(c=>c.netSpending)).div(sp.months.length):null;
 const reserveMonths=!pw.length&&freeLiquid!==null&&monthly?.gt(0)?freeLiquid.div(monthly):null;
 add('RESERVE_COVERAGE',reserveMonths===null?'unknown':reserveMonths.lt(policy.reserveMonths)?'attention':'within-policy',[...valuationIds,...earmarks.flatMap(e=>e.goalIds),...s.active.filter(r=>r.kind==='category').map(r=>r.id),...essential.flatMap(c=>c.transactionIds)],policy.reserveMonths,reserveMonths,'Review accessible reserve assets and confirmed essential spending.',reserveMonths===null?['Incomplete essential spending, currency or liquid-asset coverage.']:['Uses recorded net spending and liquid value after goal earmarks; future expenses may differ.']);
 const assets=p.values.filter(v=>v.kind!=='liability').map(v=>({...v,converted:currencyValue(v)})),total=assets.every(v=>v.converted!==null)&&assets.length?sum(assets.map(v=>v.converted)):null;
 for(const dimension of ['institution','issuer']){
  const groups=new Map();let unknown=pw.length>0;
  for(const v of assets){const e=s.resolve(v.entityId),a=e.kind==='account'?e:e.accountId?s.resolve(e.accountId):null,key=dimension==='institution'?(a?.institutionId?s.resolve(a.institutionId).id:null):e.issuer;
   if(!key||v.converted===null){unknown=true;continue;}const g=groups.get(key)??{value:new D(0),ids:[]};g.value=g.value.plus(v.converted);g.ids.push(v.observationId);groups.set(key,g);
  }
  const threshold=dimension==='institution'?policy.maxInstitutionWeight:policy.maxIssuerWeight;
  for(const [group,g]of groups){const weight=total?.gt(0)?g.value.div(total):null;add(`${dimension.toUpperCase()}_EXPOSURE`,weight===null?'unknown':weight.gt(threshold)?'attention':unknown?'unknown':'within-policy',[...valuationIds,...g.ids,group].filter(id=>s.all.has(id)),threshold,{group,weight},'Inspect issuer/custody concentration against the chosen limit.',unknown?['Unmapped exposure prevents a complete verdict.']:[]);}
  if(unknown||!groups.size)add(`${dimension.toUpperCase()}_COVERAGE`,'unknown',assets.map(v=>v.entityId),threshold,null,'Identify all issuers and institutions before concluding concentration is acceptable.');
 }
 const bands=[];
 for(const band of policy.assetBands){
  const matched=assets.filter(v=>s.resolve(v.entityId).assetClass===band.assetClass),value=matched.every(v=>v.converted!==null)?sum(matched.map(v=>v.converted)):null,unknown=pw.length>0||assets.some(v=>!s.resolve(v.entityId).assetClass),weight=value!==null&&total?.gt(0)?value.div(total):null;
  const status=weight===null||unknown?'unknown':weight.lt(band.minimum)||weight.gt(band.maximum)?'attention':'within-policy';bands.push({assetClass:band.assetClass,weight,minimum:band.minimum,maximum:band.maximum,status});add('ALLOCATION_BAND',status,valuationIds,{minimum:band.minimum,maximum:band.maximum},{assetClass:band.assetClass,weight},'Review a draft contribution or rebalancing plan; no order is generated.',unknown?['Some assets lack an asset class.']:[]);
 }
 const obligations=s.active.filter(r=>r.kind==='planned-expense').sort((a,b)=>a.dueDate.localeCompare(b.dueDate));let remaining=pw.length?null:freeLiquid;
 const timeline=obligations.map(r=>{const fxWarnings=[],amount=convert(s,r.amount,r.currency,policy.currency,o.asOf,fxWarnings);warnings.push(...fxWarnings);remaining=remaining!==null&&amount!==null&&!fxWarnings.length?remaining.minus(amount):null;return {expenseId:r.id,dueDate:r.dueDate,overdue:r.dueDate<o.asOf,originalCurrency:r.currency,originalAmount:r.amount,policyCurrency:policy.currency,convertedAmount:amount,remainingRecordedLiquidity:remaining,unfunded:remaining===null?null:D.max(0,remaining.negated())};});
 if(timeline.length)add('OBLIGATION_TIMELINE',timeline.some(x=>x.remainingRecordedLiquidity===null)?'unknown':timeline.some(x=>x.unfunded.gt(0))?'attention':'review',[...valuationIds,...earmarks.flatMap(e=>e.goalIds),...obligations.map(r=>r.id)],null,timeline,'Resolve unfunded needs before drafting contributions.',['Uses current liquid assets and dated FX only; excludes future income. Goal earmarks are protected; reserve needs remain a separate coverage finding. Past-due expenses remain obligations until explicitly corrected.']);
 for(const debt of s.active.filter(r=>r.kind==='liability'))add('DEBT_TERMS',debt.annualRate===undefined||debt.monthlyPayment===undefined?'unknown':'review',[debt.id],null,{annualRate:debt.annualRate??null,monthlyPayment:debt.monthlyPayment??null},'Confirm debt rates, payments and terms before comparing repayment alternatives.');
 const cw=[],fee=costs(s,{asOf:o.asOf,base:policy.currency},cw);warnings.push(...cw);add('DISCLOSED_COSTS',cw.length?'unknown':'review',[...valuationIds,...s.active.filter(r=>r.kind==='fund').map(r=>r.id)],null,fee,'Review dated disclosed costs; missing costs remain unknown.',cw.map(w=>w.code));
 const goalWarnings=[],funding=goals(s,{asOf:o.asOf},goalWarnings).rows;warnings.push(...goalWarnings.filter(w=>w.code!=='MISSING_GOALS'));
 for(const g of funding){const incomplete=g.recordedValue===null||goalWarnings.some(w=>w.code!=='MISSING_GOALS');add('GOAL_FUNDING',incomplete?'unknown':g.unfunded.gt(0)?'attention':'within-policy',[g.goalId,...valuationIds,...g.conflictingGoalIds],{target:g.target,targetDate:g.targetDate},{...g,complete:!incomplete},'Review unfunded targets and allocation conflicts without counting the same money twice.',['Uses confirmed goal shares and dated values; does not fund goals or reserves automatically.']);}
 for(const r of s.active.filter(r=>r.kind==='profile'))if(r.riskTolerance==='high'&&r.riskCapacity==='low')add('TOLERANCE_CAPACITY_GAP','attention',[r.id],null,{tolerance:r.riskTolerance,capacity:r.riskCapacity},'Review the policy in light of obligations and capacity; no allocation is inferred.');
 if(warnings.some(w=>['UNRESOLVED_INSTRUMENT_ACTIVITY','STALE_FX','GOAL_ALLOCATION_OVERLAP'].includes(w.code)))add('UNRESOLVED_REVIEW_INPUTS','unknown',[...valuationIds,...warnings.map(w=>w.recordId).filter(Boolean)],null,null,'Resolve unsupported activity, stale conversion rates and conflicting allocations.',warnings.map(w=>w.code));
 const verdict=findings.some(f=>f.severity==='unknown')?'incomplete':findings.some(f=>f.severity==='attention')?'attention-required':'review-recorded-findings';
 if(verdict==='incomplete')warnings.push(warning('DIAGNOSIS_INCOMPLETE'));
 return {asOf:o.asOf,policyId:policy.id,currency:policy.currency,verdict,reserveMonths,recordedLiquidValue:liquid,unallocatedLiquidValue:freeLiquid,protectedGoals:earmarks,goalFunding:funding,bands,timeline,findings,taxScope:'Document questions only; no liability or savings calculation.'};
}
