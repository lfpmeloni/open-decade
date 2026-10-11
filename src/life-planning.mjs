import {D,assert,warning} from './core.mjs';
const S=D.clone({precision:120});
const round=x=>new D(new S(x).toSignificantDigits(40).toString());
const factor=annual=>new S(1).plus(annual).pow(new S(1).div(12));
function monthEnd(start,index){const d=new Date(start+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+index,0);return d.toISOString().slice(0,10);}
function selected(s,o,kind){const a=s.resolve(o.assumptions);assert(a?.kind===kind&&s.active.some(r=>r.id===a.id),'MISSING_INPUT','Select an effective confirmed scenario with --assumptions.');return a;}
const cases=a=>[{...a,label:'base'},...a.variants.map(v=>({...a,...v}))];
function close(balance,growth,income,cost){
 const resources=balance.times(growth).plus(income),difference=resources.minus(cost);
 // Suppress only guard-precision noise, not differences lost by display rounding.
 const noise=S.max(resources.abs(),cost.abs()).times('1e-110');
 if(difference.abs().lte(noise))return {balance:new S(0),shortfall:new S(0)};
 return {balance:S.max(0,difference),shortfall:S.max(0,difference.neg())};
}
export function retirement(s,o,warnings){
 const a=selected(s,o,'retirement-scenario'),expenses=a.expenseIds.map(id=>s.resolve(id));
 const end=monthEnd(a.startMonth,a.months),unavailable=expenses.filter(r=>!s.active.some(x=>x.id===r.id)||r.currency!==a.currency),outside=expenses.filter(r=>r.dueDate<a.startMonth||r.dueDate>end);
 for(const r of unavailable)warnings.push(warning('SCENARIO_EXPENSE_UNAVAILABLE',r.id));
 for(const r of outside)warnings.push(warning('EXPENSE_OUTSIDE_SCENARIO',r.id));
 const common={assumptionsId:a.id,currency:a.currency,startMonth:a.startMonth,through:end,assumptions:a,expenseIds:expenses.map(r=>r.id),outsideHorizon:outside.map(r=>({expenseId:r.id,dueDate:r.dueDate,currency:r.currency,amount:r.amount})),draft:true,limitations:['Hypothetical constant net returns; no probability, tax calculation or trade. Income and pension inputs must be spendable amounts. Spending grows with inflation; listed dated expenses are fixed nominal amounts additional to spending. Initial capital is a supplied scenario assumption, not an allocation of recorded assets to goals.']};
 if(unavailable.length)return {...common,cases:[],unavailableExpenseIds:unavailable.map(r=>r.id)};
 const results=cases(a).map(c=>{
  let balance=new S(c.initial),unfunded=new S(0),firstShortfall=null;const rows=[],growth=factor(c.annualReturn),inflation=factor(c.annualInflation),incomeGrowth=factor(c.annualIncomeGrowth),pensionGrowth=factor(c.annualPensionGrowth);
  for(let month=1;month<=c.months;month++){
   const date=monthEnd(c.startMonth,month),retired=month>c.retireAfterMonths,earned=retired?new S(0):new S(c.monthlyIncome).times(incomeGrowth.pow(month-1)),pension=retired?new S(c.monthlyPension).times(pensionGrowth.pow(month-c.retireAfterMonths-1)):new S(0),spending=new S(c.monthlySpending).times(inflation.pow(month-1));
   const due=expenses.filter(r=>r.dueDate.slice(0,7)===date.slice(0,7)),extra=due.reduce((v,r)=>v.plus(r.amount),new S(0)),r=close(balance,growth,earned.plus(pension),spending.plus(extra));balance=r.balance;unfunded=unfunded.plus(r.shortfall);if(r.shortfall.gt(0)&&firstShortfall===null)firstShortfall=date;
   rows.push({month,date,phase:retired?'drawdown':'accumulation',income:round(earned),pension:round(pension),spending:round(spending),plannedExpenses:round(extra),expenseIds:due.map(r=>r.id),closingCapital:round(balance),unfunded:round(r.shortfall)});
  }
  if(unfunded.gt(0))warnings.push({code:'SCENARIO_UNFUNDED',recordId:a.id,scenario:c.label});
  return {label:c.label,assumptions:{annualReturn:c.annualReturn,annualInflation:c.annualInflation,monthlyIncome:c.monthlyIncome,monthlySpending:c.monthlySpending,monthlyPension:c.monthlyPension,retireAfterMonths:c.retireAfterMonths},terminalNominal:round(balance),terminalReal:round(balance.div(inflation.pow(c.months))),unfunded:round(unfunded),firstShortfall,rows};
 });
 return {...common,cases:results};
}
export function housing(s,o,warnings){
 const a=selected(s,o,'housing-scenario');
 const results=cases(a).map(c=>{
  const principal=new S(c.price).minus(c.downPayment),rate=new S(c.mortgageAnnualRate).div(12),payment=rate.isZero()?principal.div(c.mortgageMonths):principal.times(rate).div(new S(1).minus(new S(1).plus(rate).pow(-c.mortgageMonths)));
  let debt=principal,buyerCapital=S.max(0,new S(c.initial).minus(c.downPayment).minus(c.purchaseCosts)),renterCapital=new S(c.initial),buyerUnfunded=S.max(0,new S(c.downPayment).plus(c.purchaseCosts).minus(c.initial)),renterUnfunded=new S(0),house=new S(c.price),interestTotal=new S(0);const rows=[],growth=factor(c.annualReturn),inflation=factor(c.annualInflation),appreciation=factor(c.annualHouseGrowth),rentGrowth=factor(c.annualRentGrowth);
  for(let month=1;month<=c.months;month++){
   const interest=debt.times(rate),due=month===c.mortgageMonths?debt.plus(interest):S.min(payment,debt.plus(interest));debt=S.max(0,debt.plus(interest).minus(due));interestTotal=interestTotal.plus(interest);
   const ownerCosts=new S(c.monthlyOwnerCosts).times(inflation.pow(month-1)),rent=new S(c.monthlyRent).times(rentGrowth.pow(month-1)),owner=close(buyerCapital,growth,new S(c.monthlyBudget),due.plus(ownerCosts)),renter=close(renterCapital,growth,new S(c.monthlyBudget),rent);
   buyerCapital=owner.balance;renterCapital=renter.balance;buyerUnfunded=buyerUnfunded.plus(owner.shortfall);renterUnfunded=renterUnfunded.plus(renter.shortfall);house=house.times(appreciation);
   rows.push({month,date:monthEnd(c.startMonth,month),mortgagePayment:round(due),interest:round(interest),mortgageBalance:round(debt),ownerCosts:round(ownerCosts),rent:round(rent),buyerCapital:round(buyerCapital),renterCapital:round(renterCapital),buyerUnfunded:round(owner.shortfall),renterUnfunded:round(renter.shortfall)});
  }
  const equity=house.times(new S(1).minus(c.sellingFee)).minus(debt),buyer=buyerCapital.plus(equity),renter=renterCapital,complete=buyerUnfunded.isZero()&&renterUnfunded.isZero();
  if(!complete)warnings.push({code:'HOUSING_FUNDING_GAP',recordId:a.id,scenario:c.label});
  return {label:c.label,assumptions:{...c,variants:undefined},contractualMonthlyPayment:round(payment),totalInterest:round(interestTotal),terminalHouseValue:round(house),terminalMortgage:round(debt),terminalEquityAfterSellingCost:round(equity),buyerTerminal:round(buyer),renterTerminal:round(renter),buyerTerminalReal:round(buyer.div(inflation.pow(c.months))),renterTerminalReal:round(renter.div(inflation.pow(c.months))),buyerUnfunded:round(buyerUnfunded),renterUnfunded:round(renterUnfunded),comparable:complete,buyerMinusRenter:complete?round(buyer.minus(renter)):null,rows};
 });
 return {assumptionsId:a.id,currency:a.currency,assumptions:a,draft:true,cases:results,limitations:['Fixed nominal mortgage APR / 12 and end-month contractual payments. Same supplied nominal monthly budget in both paths; surpluses earn the supplied net investment return. Owner costs inflate, rent follows its own growth rate. Terminal sale deducts supplied selling fee and outstanding debt. No tax calculation, relocation, refinancing, appreciation forecast or recommendation. If a path cannot fund costs, contractual balances are hypothetical and comparison is withheld; no borrowing is invented.']};
}
