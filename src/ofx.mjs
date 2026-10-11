import fs from 'node:fs/promises';
import {isUtf8} from 'node:buffer';
import {assert,dateOK,hash,D} from './core.mjs';
import {mappedCSV} from './mapped-csv.mjs';
const aggregates=new Set(['OFX','SIGNONMSGSRSV1','SONRS','STATUS','FI','BANKMSGSRSV1','STMTTRNRS','STMTRS','BANKACCTFROM','BANKTRANLIST','STMTTRN','LEDGERBAL','AVAILBAL']);
function decode(s){
 assert(!/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/.test(s),'INVALID_INPUT','Unsupported OFX entity.');
 return s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g,(_,v)=>{if(v[0]!=='#')return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[v];const n=v[1]==='x'?parseInt(v.slice(2),16):Number(v.slice(1));assert(n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff),'INVALID_INPUT','Invalid OFX entity.');return String.fromCodePoint(n);});
}
function parseOFX(text){
 assert(typeof text==='string'&&Buffer.byteLength(text)<=10000000,'INPUT_LIMIT','OFX input exceeds ten megabytes.');
 assert(!/<!/.test(text),'INVALID_INPUT','OFX declarations, external entities and embedded markup are unsupported.');
 const start=text.indexOf('<OFX>');assert(start>=0,'INVALID_INPUT','Missing OFX root.');const header=text.slice(0,start),xml=header.includes('<?xml');
 const version=xml?header.match(/VERSION="(\d+)"/)?.[1]:header.match(/VERSION:(\d+)/)?.[1];
 assert(xml?['200','201','202','203','211','220','221','230'].includes(version):['102','103','160'].includes(version),'UNSUPPORTED_SCHEMA','Unsupported OFX export version.');
 assert(xml?/SECURITY="NONE"/.test(header):/SECURITY:NONE/.test(header),'INVALID_INPUT','Encrypted OFX is unsupported.');
 const root={tag:'ROOT',children:[],text:''},stack=[root];let offset=start,count=0;
 const tokens=/<\/?[A-Z][A-Z0-9.]*>|[^<]+/g;tokens.lastIndex=start;let match;
 while((match=tokens.exec(text))){assert(match.index===offset,'INVALID_INPUT','Malformed OFX markup.');offset=tokens.lastIndex;assert(++count<=200000,'INPUT_LIMIT','Too many OFX elements.');const part=match[0];
  if(part[0]!=='<'){const current=stack.at(-1);if(aggregates.has(current.tag)||current===root)assert(!part.trim(),'INVALID_INPUT','Unexpected text in an OFX aggregate.');else current.text+=part;continue;}
  const closing=part.startsWith('</'),tag=part.slice(closing?2:1,-1);
  if(!xml&&stack.length>1&&!aggregates.has(stack.at(-1).tag)&&!(closing&&stack.at(-1).tag===tag))stack.pop();
  if(closing){assert(stack.at(-1).tag===tag,'INVALID_INPUT','Unbalanced OFX tags.');stack.pop();}
  else{const node={tag,children:[],text:''};stack.at(-1).children.push(node);stack.push(node);assert(stack.length<=32,'INPUT_LIMIT','OFX nesting exceeds 32.');}
 }
 assert(offset===text.length&&stack.length===1&&root.children.length===1&&root.children[0].tag==='OFX','INVALID_INPUT','Incomplete OFX document.');
 return {root:root.children[0],version};
}
function children(node,tag){return node.children.filter(n=>n.tag===tag);}
function one(node,tag,required=true){const found=children(node,tag);assert(found.length<2&&(!required||found.length===1),'INVALID_INPUT','Required OFX field missing or repeated.');return found[0];}
function value(node,tag,required=true){const n=one(node,tag,required);if(!n)return undefined;assert(n.children.length===0,'INVALID_INPUT','Expected an OFX scalar.');return decode(n.text.trim());}
function date(value){assert(/^\d{8}(?:\d{6}(?:\.\d+)?(?:\[[+-]?\d+(?:\.\d+)?:[A-Za-z]+\])?)?$/.test(value),'INVALID_INPUT','Unsupported OFX date representation.');const d=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`;assert(dateOK(d),'INVALID_INPUT','Invalid OFX date.');return d;}
export function ofx(text,m,s){
 assert(!/<(?:STMTTRNP|BANKTRANLISTP)>/.test(text),'INVALID_INPUT','Pending transactions require separate review.');
 assert(m?.version===1&&typeof m.source==='string'&&m.source.length>0&&m.source.length<=300&&m.datePolicy==='bank-date'&&typeof m.externalAccountId==='string','INVALID_INPUT','Confirm OFX mapping, external account identity and bank-date policy.');
 const {root,version}=parseOFX(text);
 assert(root.children.every(n=>['SIGNONMSGSRSV1','BANKMSGSRSV1'].includes(n.tag)),'INVALID_INPUT','Only bank transaction statements are supported; credit card and investment layouts need host extraction.');
 const signon=one(root,'SIGNONMSGSRSV1',false);if(signon)assert(value(one(one(signon,'SONRS'),'STATUS'),'CODE')==='0','INVALID_INPUT','OFX signon status is unsuccessful.');
 const messages=one(root,'BANKMSGSRSV1'),response=one(messages,'STMTTRNRS'),status=one(response,'STATUS');assert(value(status,'CODE')==='0','SOURCE_FAILURE','OFX source returned an unsuccessful statement.');
 const statement=one(response,'STMTRS'),currency=value(statement,'CURDEF'),account=one(statement,'BANKACCTFROM'),external=value(account,'ACCTID'),bank=value(account,'BANKID');
 assert(external===m.externalAccountId,'INVALID_REFERENCE','OFX account differs from the explicit mapping.');
 const list=one(statement,'BANKTRANLIST');assert(!statement.children.some(n=>n.tag==='BANKTRANLISTP')&&!children(list,'STMTTRNP').length,'INVALID_INPUT','Pending OFX transactions require separate review.');
 const transactions=children(list,'STMTTRN');assert(transactions.length>0,'MISSING_INPUT','No posted transactions in OFX statement.');
 const csvCell=x=>'"'+String(x).replace(/"/g,'""')+'"';
 const rows=transactions.map(t=>{
  assert(!t.children.some(n=>['CORRECTFITID','CORRECTACTION','CURRENCY','ORIGCURRENCY'].includes(n.tag)),'INVALID_INPUT','OFX correction directives or transaction currency overrides require host review.');
  const amount=value(t,'TRNAMT');assert(/^-?\d+(?:\.\d+)?$/.test(amount),'INVALID_INPUT','OFX amount must be a signed decimal.');
  return [value(t,'FITID'),date(value(t,'DTPOSTED')),new D(amount).toString(),[value(t,'NAME',false),value(t,'MEMO',false)].filter(Boolean).join(' — ')];
 });
 const start=date(value(list,'DTSTART')),end=date(value(list,'DTEND'));assert(start<=end&&rows.every(row=>row[1]>=start&&row[1]<=end),'INVALID_INPUT','OFX transactions fall outside the reported period.');
 const normalized=['ID,Date,Amount,Description',...rows.map(row=>row.map(csvCell).join(','))].join('\n');
 const batch=mappedCSV(normalized,{version:1,source:`ofx:${m.source}:${hash([bank,external])}`,accountId:m.accountId,currency,capturedAt:m.capturedAt,corrections:m.corrections,dateFormat:'YYYY-MM-DD',decimal:'.',columns:{id:'ID',date:'Date',amount:'Amount',description:'Description'}},s);
 if(batch.schemaVersion===2)for(const r of batch.records)if(!s.all.has(r.id))r.provenance.rawReference=`sha256:${hash(text)}`;
 batch.batchId=`ofx-${hash(batch.records)}`;
 const ledger=one(statement,'LEDGERBAL',false),balance=ledger?value(ledger,'BALAMT'):undefined;
 if(balance!==undefined)assert(/^-?\d+(?:\.\d+)?$/.test(balance),'INVALID_INPUT','Invalid OFX ledger balance.');
 return {batch,sourceMetadata:{adapter:'ofx-bank-v1',exportVersion:version,currency,from:start,through:end,ledger:ledger?{amount:balance,date:date(value(ledger,'DTASOF')),imported:false}:null},warnings:[{code:'OFX_HISTORY_NOT_ASSERTED'},...(ledger?[{code:'OFX_SNAPSHOT_NOT_IMPORTED'}]:[])]};
}
export async function ofxFile(file,mapping,state){
 for(const name of [file,mapping])assert(typeof name==='string'&&(await fs.stat(name)).size<=10000000,'INPUT_LIMIT','OFX and mapping must be files under ten megabytes.');
 const bytes=await fs.readFile(file);assert(isUtf8(bytes),'INVALID_INPUT','OFX must use UTF-8 or ASCII.');let m;try{m=JSON.parse(await fs.readFile(mapping,'utf8'));}catch{assert(false,'INVALID_INPUT','OFX mapping must be JSON.');}return ofx(bytes.toString('utf8'),m,state);
}
