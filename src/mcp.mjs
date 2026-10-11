import {operation} from './operations.mjs';
const object=properties=>({type:'object',properties,additionalProperties:false});
const string={type:'string'};
export const toolDefinitions=[
 {name:'doctor',description:'Read-only vault diagnostics',inputSchema:object({})},
 {name:'maintenance',description:'Read-only public knowledge and format review queue; no network or vault access',inputSchema:object({asOf:string})},
 {name:'capabilities',description:'Installed feature status and planned limits',inputSchema:object({})},
 {name:'connection_status',description:'Read reporting connection status without accessing credentials or network',inputSchema:object({})},
 {name:'connection_preview',description:'Preview a locally cached reporting proposal; use import_apply only after confirmation',inputSchema:object({cache:string})},
 {name:'record_schemas',description:'Read the installed record schemas for this vault version',inputSchema:object({})},
 {name:'economic_data',description:'Read cached official economic evidence without network or automatic assumptions',inputSchema:object({series:string,asOf:string,cache:string})},
 {name:'records',description:'Bounded confirmed records; contains personal data',inputSchema:object({kind:string,limit:{type:'integer',minimum:1,maximum:500},offset:{type:'integer',minimum:0}})},
 {name:'report',description:'Deterministic financial report with sources and missing coverage',inputSchema:object(Object.fromEntries(['name','asOf','from','to','base','account','assumptions','mode','policy','jurisdiction','year','context','member'].map(k=>[k,string])))},
 {name:'knowledge',description:'Bounded public topic lookup; specifications are not capabilities',inputSchema:object(Object.fromEntries(['query','topic','jurisdiction','asOf'].map(k=>[k,string])))},
 {name:'review_list',description:'List locally saved report versions',inputSchema:object({})},
 {name:'review_compare',description:'Compare two saved versions; no causal interpretation',inputSchema:object({from:string,to:string})},
 {name:'import_preview',description:'Validate and preview a normalized batch without applying records',inputSchema:object({batch:{type:'object'}})},
 {name:'import_apply',description:'Apply exactly the batch and confirmation returned by preview after explicit user confirmation',inputSchema:object({batch:{type:'object'},confirmation:string})}
];
export async function rpc(v,message,session){
 if(Array.isArray(message)){if(!message.length)return {jsonrpc:'2.0',id:null,error:{code:-32600,message:'Empty batch'}};const responses=[];for(const item of message){const r=await rpc(v,item,session);if(r)responses.push(r);}return responses.length?responses:null;}
 const {id,method,params={}}=message??{};
 const result=value=>({jsonrpc:'2.0',id,result:value});
 const error=(code,text)=>({jsonrpc:'2.0',id:id??null,error:{code,message:text}});
 if(message?.jsonrpc!=='2.0'||typeof method!=='string')return error(-32600,'Invalid request');
 if(method==='notifications/initialized'){session.ready=session.initialized;return null;}
 if(id===undefined)return null;
 if(!params||typeof params!=='object'||Array.isArray(params))return error(-32602,'Invalid parameters');
 if(method==='initialize'){
  session.initialized=true;return result({protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'open-decade',version:'0.1.0'},instructions:'Use public AGENTS.md and knowledge/INDEX.md. Financial records require reviewed preview/apply confirmation. No trading or tax calculations.'});
 }
 if(method==='ping')return result({});
 if(!session.ready)return error(-32000,'Initialize this session first');
 if(method==='tools/list')return result({tools:toolDefinitions});
 if(method==='tools/call'){
  const tool=toolDefinitions.find(t=>t.name===params.name);if(!tool)return error(-32602,'Unknown tool');
  const args=params.arguments??{};if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!Object.hasOwn(tool.inputSchema.properties,k)))return error(-32602,'Invalid arguments');
  const command={connection_status:'connection status',connection_preview:'connection preview',record_schemas:'record schemas',economic_data:'data series',review_list:'review list',review_compare:'review compare',import_preview:'import preview',import_apply:'import apply'}[tool.name]??tool.name;
  let r=await operation(v,command,args);if(Buffer.byteLength(JSON.stringify(r))>1000000)r={command,outcome:'failure',contractVersion:1,data:null,warnings:[],errors:[{code:'INPUT_LIMIT',message:'Result exceeds one megabyte; narrow the request or use the local CLI.'}]};return result({content:[{type:'text',text:JSON.stringify(r)}],isError:r.outcome==='failure'});
 }
 return error(-32601,'Method not found');
}
