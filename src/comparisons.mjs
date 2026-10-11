import {D,assert} from './core.mjs';
const S=D.clone({precision:120});
const out=x=>new D(new S(x).toSignificantDigits(40).toString());
function selected(s,o,kind){const r=s.resolve(o.assumptions);assert(r?.kind===kind&&s.active.some(x=>x.id===r.id),'MISSING_INPUT','Select an effective confirmed comparison with --assumptions.');return r;}
function status(offer,asOf){return offer.sourceDate>asOf?'future':offer.reviewDue<asOf?'stale':offer.eligibility!=='eligible'?offer.eligibility:'current';}
function cost(offer,usage){const gross=new S(usage).times(offer.rewardRate),reward=offer.annualRewardCap===null?gross:S.min(gross,offer.annualRewardCap);return new S(offer.annualFixedFee).plus(new S(usage).times(offer.variableFeeRate)).minus(reward);}
function line(offer,start){const cap=offer.annualRewardCap===null?null:new S(offer.annualRewardCap),rate=new S(offer.rewardRate),capped=cap!==null&&rate.gt(0)&&start.gte(cap.div(rate));return {fixed:new S(offer.annualFixedFee).minus(capped?cap:0),slope:new S(offer.variableFeeRate).minus(capped?0:rate)};}
function breakEven(a,b){
 const points=[new S(0)];for(const offer of [a,b])if(offer.annualRewardCap!==null&&new S(offer.rewardRate).gt(0))points.push(new S(offer.annualRewardCap).div(offer.rewardRate));
 const sorted=[...new Map(points.map(x=>[x.toString(),x])).values()].sort((a,b)=>a.cmp(b)),roots=[],intervals=[];
 for(let i=0;i<sorted.length;i++){const start=sorted[i],end=sorted[i+1]??null,x=line(a,start),y=line(b,start),fixed=x.fixed.minus(y.fixed),slope=x.slope.minus(y.slope);if(slope.isZero()){if(fixed.isZero())intervals.push({from:out(start),through:end===null?null:out(end)});continue;}const root=fixed.neg().div(slope);if(root.gte(start)&&(end===null||root.lte(end)))roots.push(out(root));}
 return {annualUsagePoints:[...new Map(roots.map(x=>[x.toString(),x])).values()],equalCostIntervals:intervals,units:'Annual usage amount in the comparison currency; conditional on confirmed eligibility, values and quote validity.'};
}
export function feeComparison(s,o,warnings){
 const a=selected(s,o,'fee-comparison'),rows=a.offers.map(offer=>{const validity=status(offer,o.asOf),available=validity==='current'&&offer.rewardValueConfirmed;if(!available)warnings.push({code:'OFFER_UNAVAILABLE',offerId:offer.offerId,reason:validity==='current'?'reward-value-unconfirmed':validity});return {...offer,validity,comparable:available,annualNetCost:available?out(cost(offer,a.annualUsage)):null};}),reference=rows.find(x=>x.offerId===a.referenceOfferId);
 for(const row of rows){row.differenceFromReference=row.comparable&&reference.comparable?out(cost(row,a.annualUsage).minus(cost(reference,a.annualUsage))):null;row.breakEvenWithReference=row.offerId!==reference.offerId&&row.comparable&&reference.comparable?breakEven(row,reference):null;}
 return {asOf:o.asOf,assumptionsId:a.id,currency:a.currency,product:a.product,annualUsage:a.annualUsage,referenceOfferId:a.referenceOfferId,rows,limitations:['Input-order conditional comparisons, not a provider ranking or recommendation. No offers are fetched or independently verified. Rewards are supplied cash-equivalent values; caps are annual amounts in the comparison currency. Excludes interest, tiers, minimum transaction fees, promotions, taxes and benefits not explicitly modeled. Negative net cost represents modeled rewards exceeding modeled fees, not guaranteed profit.']};
}
export function fxComparison(s,o,warnings){
 const a=selected(s,o,'fx-comparison'),rows=a.offers.map(offer=>{
  const validity=status(offer,o.asOf),fees=new S(offer.fixedSourceFee).plus(new S(a.amount).times(offer.sourceFeeRate)),available=validity==='current'&&fees.lte(a.amount);if(!available)warnings.push({code:'OFFER_UNAVAILABLE',offerId:offer.offerId,reason:validity==='current'?'fees-exceed-amount':validity});
  return {...offer,validity,comparable:available,totalSourceFees:available?out(fees):null,destinationAmount:available?out(new S(a.amount).minus(fees).times(offer.destinationPerSource)):null};
 });
 return {asOf:o.asOf,assumptionsId:a.id,sourceCurrency:a.sourceCurrency,destinationCurrency:a.destinationCurrency,amount:a.amount,rows,limitations:['Dated user-supplied routes only; no transfer or provider call. Fixed and proportional fees are in source currency and deducted before conversion. Destination amount excludes unknown intermediary/recipient fees, timing, limits and future rate changes. Eligibility and quotes are confirmed inputs, not independently verified offers. No affiliate ranking.']};
}
