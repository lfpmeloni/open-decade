import {assert} from './core.mjs';
const base='https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/';
const transient=new Set(['1001','1003','1004','1005','1006','1007','1008','1009','1018','1019','1021']);
export async function fetchFlex({token,queryId,periodDays},{fetchImpl=globalThis.fetch,wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 assert(/^[A-Za-z0-9_-]{8,512}$/.test(token)&&/^\d{1,20}$/.test(queryId)&&Number.isInteger(periodDays)&&periodDays>=1&&periodDays<=365,'INVALID_INPUT','Invalid Flex request configuration.');
 async function request(endpoint,q){
  const url=new URL(endpoint,base);url.search=new URLSearchParams({t:token,q,v:'3',...(endpoint==='SendRequest'?{p:String(periodDays)}:{})}).toString();
  try{const response=await fetchImpl(url.toString(),{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'text/plain, text/csv, application/xml','User-Agent':'open-decade/0.1.0'}});
   if(response.status===429)return {error:'1018'};assert(response.ok&&response.body,'SOURCE_FAILURE','Flex report unavailable.');let bytes=0;const chunks=[];for await(const chunk of response.body){bytes+=chunk.length;assert(bytes<=2000000,'INPUT_LIMIT','Flex response exceeds two megabytes.');chunks.push(chunk);}const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));assert(!text.includes(token),'SOURCE_FAILURE','Unexpected credential echo in Flex response.');
   if(text.trimStart().startsWith('<')){
    assert(!/<!|&/.test(text),'SOURCE_FAILURE','Unsupported Flex XML response.');const statuses=[...text.matchAll(/<Status>(Success|Fail|Warn)<\/Status>/g)];assert(statuses.length===1,'SOURCE_FAILURE','Unsupported Flex envelope.');
    if(statuses[0][1]!=='Success'){const code=text.match(/<ErrorCode>(\d{4})<\/ErrorCode>/)?.[1];return {error:code??'unknown'};}
    const reference=text.match(/<ReferenceCode>(\d{1,30})<\/ReferenceCode>/)?.[1];assert(reference&&endpoint==='SendRequest','SOURCE_FAILURE','Configure Flex CSV output; other report layouts use file extraction.');return {reference};
   }
   assert(endpoint==='GetStatement','SOURCE_FAILURE','Invalid Flex generation response.');return {csv:text};
  }catch(e){if(e.code==='INPUT_LIMIT')throw e;assert(false,'SOURCE_FAILURE','Flex request failed; check reporting access and retry manually.');}
 }
 async function retry(endpoint,q){
  for(let attempt=0;attempt<3;attempt++){
   const result=await request(endpoint,q);if(!result.error)return result;
   if(['1012','1015'].includes(result.error))assert(false,'MISSING_INPUT','Flex token expired or invalid; renew it in Client Portal and update the OS store.');
   if(!transient.has(result.error)||attempt===2)assert(false,'SOURCE_FAILURE','Flex report unavailable, access restricted or retry limit reached; use file import.');
   await wait(10000);
  }
 }
 const generated=await retry('SendRequest',queryId);await wait(10000);const report=await retry('GetStatement',generated.reference);return report.csv;
}
