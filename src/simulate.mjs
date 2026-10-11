import {D,assert} from './core.mjs';
// Guard digits keep monthly-root rounding below the 40-digit result contract.
const S=D.clone({precision:60});
const rounded=value=>new D(value.toSignificantDigits(40).toString());
const mask=(1n<<64n)-1n;
export function pcg32(seed){
 let state=0n;const inc=109n;
 function next(){const old=state;state=(old*6364136223846793005n+inc)&mask;const x=Number(((old>>18n)^old)>>27n)&0xffffffff,rot=Number(old>>59n);return ((x>>>rot)|(x<<((-rot)&31)))>>>0;}
 next();state=(state+BigInt(seed))&mask;next();return next;
}
function normals(seed){const next=pcg32(seed);let spare;
 return ()=>{if(spare!==undefined){const n=spare;spare=undefined;return n;}const u=(next()+0.5)/4294967296,v=(next()+0.5)/4294967296,r=Math.sqrt(-2*Math.log(u)),theta=2*Math.PI*v;spare=r*Math.sin(theta);return r*Math.cos(theta);};
}
export function simulate(s,o,warnings){
 const a=s.resolve(o.assumptions);assert(a?.kind==='assumptions','MISSING_INPUT','Select a confirmed --assumptions ID.');
 assert(['scenario','monte-carlo'].includes(o.mode),'INVALID_INPUT','Mode must be scenario or monte-carlo.');
 const monthly=new S(1).plus(a.annualReturn).pow(new S(1).div(12)),inflation=new S(1).plus(a.annualInflation).pow(new S(a.months).div(12));
 const contribution=new S(a.monthlyContribution),target=rounded(new S(a.target).times(inflation));
 const normal=normals(a.seed??1),vol=Number(a.annualVolatility),drift=Math.log1p(Number(a.annualReturn))/12-vol*vol/24,scale=vol/Math.sqrt(12);
 assert(Number.isFinite(drift)&&Number.isFinite(scale),'NUMERIC_RANGE','Simulation assumptions exceed supported numeric range.');
 function path(stochastic){let value=new S(a.initial),shortfall=new S(0);for(let m=0;m<a.months;m++){
   const growth=stochastic?Math.exp(drift+scale*normal()):monthly;
   assert(stochastic?Number.isFinite(growth):growth.isFinite(),'NUMERIC_RANGE','Simulation growth overflow.');
   const grown=value.times(growth);value=grown.plus(contribution);
   if(value.lt(0)){if(!rounded(grown).eq(rounded(contribution.neg())))shortfall=shortfall.minus(value);value=new S(0);}
  }return {value:rounded(value),shortfall:rounded(shortfall)};}
 const common={assumptionsId:a.id,assumptions:a,currency:a.currency,months:a.months,targetNominal:target,mode:o.mode,contributionTiming:'end-month',returnsNetOfFees:true};
 if(o.mode==='scenario'){const r=path(false);return {...common,terminalNominal:r.value,terminalReal:r.value.div(inflation),unfundedWithdrawals:r.shortfall,goalReached:r.value.gte(target)&&r.shortfall.isZero()};}
 const n=a.paths??10000,seed=a.seed??1,terminals=[];let success=0,shortfallPaths=0,totalShortfall=new D(0);
 const deterministic=vol===0?path(false):null;
 for(let i=0;i<n;i++){const r=deterministic??path(true);terminals.push(r.value);if(r.value.gte(target)&&r.shortfall.isZero())success++;if(r.shortfall.gt(0))shortfallPaths++;totalShortfall=totalShortfall.plus(r.shortfall);}
 terminals.sort((a,b)=>a.cmp(b));
 const percentiles=Object.fromEntries([5,25,50,75,95].map(p=>[String(p),terminals[Math.ceil(p*n/100)-1]]));
 return {...common,paths:n,seed,generator:'pcg32-xsh-rr-v1-box-muller-v1',terminalNominalPercentiles:percentiles,terminalRealPercentiles:Object.fromEntries(Object.entries(percentiles).map(([p,v])=>[p,v.div(inflation)])),goalSuccessFrequency:new D(success).div(n),withdrawalShortfallFrequency:new D(shortfallPaths).div(n),meanUnfundedWithdrawals:totalShortfall.div(n)};
}
