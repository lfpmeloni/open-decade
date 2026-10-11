#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {vaultPath} from '../src/vault.mjs';
import {rpc} from '../src/mcp.mjs';
try{
 const {values:v}=parseArgs({options:{vault:{type:'string'}}}),vault=await vaultPath(v.vault),session={};let pending='';
 process.stdin.setEncoding('utf8');
 for await(const chunk of process.stdin){
  pending+=chunk;if(Buffer.byteLength(pending)>10000000){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Input limit exceeded'}})+'\n');process.exitCode=1;break;}
  let newline;while((newline=pending.indexOf('\n'))>=0){
   const line=pending.slice(0,newline);pending=pending.slice(newline+1);if(!line.trim())continue;
   let r;try{r=await rpc(vault,JSON.parse(line),session);}catch{r={jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON request'}};}
   if(r)process.stdout.write(JSON.stringify(r)+'\n');
  }
 }
}catch{process.stderr.write('Unable to start local MCP adapter. Check installation and vault path.\n');process.exitCode=1;}
