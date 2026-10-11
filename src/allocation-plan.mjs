import {D,sum,assert,warning} from './core.mjs';
import {picture,convert,goalClaims,goalClaimShare,goals} from './picture.mjs';
export function allocationPlan(s,o,warnings){
 const a=s.resolve(o.assumptions);assert(a?.kind==='allocation-plan'&&s.active.some(r=>r.id===a.id),'MISSING_INPUT','Select an effective allocation-plan with --assumptions.');
 const policy=s.resolve(a.policyId),claims=goalClaims(s),scope=a.entityIds.map(id=>s.resolve(id).id),liquid=policy.liquidEntityIds.map(id=>s.resolve(id).id),issues=[];
 const issue=(code,id)=>{issues.push(code);warnings.push(warning(code,id));};
 if(!s.active.some(r=>r.id===policy.id)||policy.reviewDate<o.asOf)issue('PLAN_POLICY_REVIEW_REQUIRED',policy.id);
 const pw=[],p=picture(s,{asOf:o.asOf},pw);warnings.push(...pw);if(pw.length)issues.push('PLAN_PICTURE_INCOMPLETE');
 const buckets=new Map(a.targets.map(t=>[t.assetClass,new D(0)])),protectedGoals=[],inputs=[];let freeLiquidity=new D(0),unknownLiquidity=false;
 function available(id){
  const value=p.values.find(v=>v.entityId===id);if(!value){issue('PLAN_MISSING_VALUE',id);return null;}
  const share=goalClaimShare(claims.get(id)??[]);if(share.gt(1)){issue('GOAL_ALLOCATION_OVERLAP',id);return null;}
  const w=[],converted=convert(s,value.ownedValue,value.currency,a.currency,o.asOf,w);warnings.push(...w);if(w.length||converted===null){issue('PLAN_FX_INCOMPLETE',id);return null;}
  inputs.push(value.observationId);if(share.gt(0))protectedGoals.push({entityId:id,goalIds:claims.get(id).filter(c=>c.share.gt(0)).map(c=>c.goalId),value:converted.times(share)});
  return converted.times(new D(1).minus(share));
 }
 for(const id of liquid){const value=available(id);if(value===null)unknownLiquidity=true;else freeLiquidity=freeLiquidity.plus(value);}
 for(const id of scope){
  if(liquid.includes(id)){issue('PLAN_RESERVE_SCOPE_OVERLAP',id);continue;}
  const entity=s.resolve(id),value=available(id);if(!buckets.has(entity.assetClass)){issue('PLAN_UNMAPPED_ASSET_CLASS',id);continue;}if(value!==null)buckets.set(entity.assetClass,buckets.get(entity.assetClass).plus(value));
 }
 const obligations=s.active.filter(r=>r.kind==='planned-expense'),obligationRows=[];let expenseTotal=new D(0);
 for(const e of obligations){const w=[],amount=new D(e.amount).isZero()?new D(0):convert(s,e.amount,e.currency,a.currency,o.asOf,w);warnings.push(...w);if(w.length||amount===null){unknownLiquidity=true;issue('PLAN_OBLIGATION_FX_INCOMPLETE',e.id);}else expenseTotal=expenseTotal.plus(amount);obligationRows.push({expenseId:e.id,dueDate:e.dueDate,currency:e.currency,amount:e.amount,convertedAmount:amount});}
 const reserveRequired=new D(a.monthlyEssentialSpending).times(policy.reserveMonths),required=reserveRequired.plus(expenseTotal),unfunded=unknownLiquidity?null:D.max(0,required.minus(freeLiquidity));
 if(unfunded===null||unfunded.gt(0))issue('PLAN_UNFUNDED_NEEDS',a.id);
 const gw=[],goalFunding=goals(s,o,gw).rows;warnings.push(...gw.filter(w=>w.code!=='MISSING_GOALS'));
 if(goalFunding.some(g=>g.recordedValue===null))issue('PLAN_GOAL_COVERAGE_INCOMPLETE',a.id);
 if(goalFunding.some(g=>g.unfunded?.gt(0)))warnings.push(warning('PLAN_UNFUNDED_GOALS_REVIEW',a.id));
 const startingTotal=sum([...buckets.values()]),terminalTotal=startingTotal.plus(a.contribution);
 if(!terminalTotal.gt(0))issue('PLAN_EMPTY_PORTFOLIO',a.id);
 const common={asOf:o.asOf,assumptionsId:a.id,policyId:policy.id,currency:a.currency,mode:a.mode,draft:true,execution:false,scopeEntityIds:scope,observationIds:inputs,assumptions:a,protectedGoals,goalFunding,needs:{monthlyEssentialSpending:a.monthlyEssentialSpending,reserveMonths:policy.reserveMonths,reserveRequired,obligations:obligationRows,expenseTotal,unallocatedLiquidValue:unknownLiquidity?null:freeLiquidity,unfunded},startingTotal,contribution:a.contribution,terminalTotal,limitations:['Targets are supplied by the user and apply only to the selected investable scope. Goal-assigned fractions and every policy liquid entity are excluded from that scope. Contribution is explicitly declared external unallocated money, not inferred from accounts. All recorded planned expenses remain obligations, including past dates, until corrected. Monthly essential spending is a confirmed assumption, not a spending diagnosis. Unfunded goal targets remain visible and require review; this draft does not fund those goals. No security selection, quantities, orders, taxes, execution fees or suitability verdict.']};
 if(issues.length){warnings.push(warning('ALLOCATION_PLAN_INCOMPLETE',a.id));return {...common,status:'incomplete',unavailable:[...new Set(issues)],rows:[]};}
 const rows=a.targets.map(t=>{const band=policy.assetBands.find(b=>b.assetClass===t.assetClass),current=buckets.get(t.assetClass),target=terminalTotal.times(t.weight);return {assetClass:t.assetClass,current,targetWeight:t.weight,minimum:band.minimum,maximum:band.maximum,targetValue:target,deficit:D.max(0,target.minus(current))};});
 const deficits=sum(rows.map(r=>r.deficit));let allocated=new D(0);
 const recipients=rows.filter(r=>r.deficit.gt(0));
 for(const row of rows){
  let change;if(a.mode==='rebalance')change=row.targetValue.minus(row.current);
  else if(!row.deficit.gt(0))change=new D(0);
  else{change=row===recipients.at(-1)?new D(a.contribution).minus(allocated):D.min(new D(a.contribution).minus(allocated),new D(a.contribution).times(row.deficit).div(deficits));allocated=allocated.plus(change);}
  row.draftChange=change;row.after=row.current.plus(change);row.afterWeight=row.after.div(terminalTotal);row.withinBand=row.afterWeight.gte(row.minimum)&&row.afterWeight.lte(row.maximum);delete row.deficit;
 }
 if(rows.some(r=>!r.withinBand))warnings.push(warning('CONTRIBUTIONS_CANNOT_RESTORE_BANDS',a.id));
 return {...common,status:'draft',rows,netDraftChange:sum(rows.map(r=>r.draftChange))};
}
