import {D,sum,assert,warning} from './core.mjs';
import {valuation} from './picture.mjs';
export function feeDrag(s,o,warnings){
 const a=s.active.find(r=>r.kind==='fee-scenario'&&r.id===o.assumptions);
 assert(a,'MISSING_INPUT','Select a confirmed fee-scenario record with --assumptions.');
 const value=fee=>new D(a.initial).times(new D(1).plus(a.annualGrossReturn).times(new D(1).minus(fee)).pow(a.years));
 const current=value(a.currentAnnualFee),alternative=value(a.alternativeAnnualFee);
 return {assumptionsId:a.id,currency:a.currency,years:a.years,currentTerminalValue:current,alternativeTerminalValue:alternative,difference:alternative.minus(current),assumptions:{initial:a.initial,annualGrossReturn:a.annualGrossReturn,currentAnnualFee:a.currentAnnualFee,alternativeAnnualFee:a.alternativeAnnualFee},limitations:['Constant annual gross return, end-year proportional fee, no contributions, withdrawals, taxes or execution costs. Hypothetical comparison, not a forecast or recommendation.']};
}
export function debtPaydown(s,o,warnings){
 const debts=s.active.filter(r=>r.kind==='liability');assert(debts.length<=100,'INPUT_LIMIT','Debt schedule supports at most 100 liabilities.');
 const rows=debts.map(debt=>{
  const w=[],value=valuation(s,debt,o.asOf,w);warnings.push(...w);
  const result={liabilityId:debt.id,currency:debt.currency,startingBalance:value?.value??null,responsibility:debt.responsibility,monthsToPayoff:null,totalInterest:null,schedule:[],assumptions:'Full debt balance; fixed nominal APR / 12, fixed end-month payment, no new borrowing or fees. No currency rounding; actual contracts may differ.'};
  if(!value||w.length||debt.annualRate===undefined||debt.monthlyPayment===undefined||new D(debt.monthlyPayment).lte(0)){warnings.push(warning('MISSING_DEBT_TERMS',debt.id));return result;}
  let balance=new D(value.value),interestTotal=new D(0);const rate=new D(debt.annualRate).div(12);
  for(let month=1;month<=1200&&balance.gt(0);month++){
   const interest=balance.times(rate);if(new D(debt.monthlyPayment).lte(interest)){warnings.push(warning('DEBT_NOT_AMORTIZING',debt.id));return result;}
   const payment=D.min(debt.monthlyPayment,balance.plus(interest));balance=balance.plus(interest).minus(payment);interestTotal=interestTotal.plus(interest);result.schedule.push({month,interest,payment,closingBalance:balance});
  }
  if(balance.gt(0))warnings.push(warning('DEBT_HORIZON_EXCEEDED',debt.id));else{result.monthsToPayoff=result.schedule.length;result.totalInterest=interestTotal;}
  return result;
 });
 if(!rows.length)warnings.push(warning('MISSING_DEBTS'));return {asOf:o.asOf,rows};
}
