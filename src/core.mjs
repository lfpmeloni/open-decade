import Decimal from 'decimal.js';
import {createHash} from 'node:crypto';
export const D = Decimal.clone({precision:40, rounding:Decimal.ROUND_HALF_EVEN});
export const sum = xs => xs.reduce((a,b)=>a.plus(b),new D(0));
export const fail = (code,message) => {const e=new Error(message);e.code=code;throw e;};
export const assert = (ok,code,message) => {if(!ok)fail(code,message);};
export function canonical(v){return JSON.stringify(v,(_,x)=>x && typeof x==='object' && !Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);}
export const hash = x=>createHash('sha256').update(typeof x==='string'?x:canonical(x)).digest('hex');
export const dateOK = x => typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x)) && new Date(x).toISOString().slice(0,10)===x;
export const days = (a,b)=>(Date.parse(b)-Date.parse(a))/86400000;
export const warning = (code,recordId)=>({code,...(recordId?{recordId}:{})});
