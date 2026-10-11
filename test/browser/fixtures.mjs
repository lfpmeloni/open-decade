import {test as base,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {serve} from '../../src/server.mjs';
import {init,read} from '../../src/vault.mjs';
import {operation} from '../../src/operations.mjs';
export {expect};
export const test=base.extend({
 diagnostics:[async({page,context},use)=>{
  const errors=[],consoleErrors=[],http=[],failed=[],external=[];let origin;
  const expectedHTTP=[],expectedTransport=[];
  await context.route('**/*',route=>{const url=new URL(route.request().url());return ['http:','https:'].includes(url.protocol)&&url.origin!==origin?route.abort('blockedbyclient'):route.continue();});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('request',request=>{
   const url=new URL(request.url());if(!['http:','https:'].includes(url.protocol))return;
   if(!origin&&request.isNavigationRequest()&&url.hostname==='127.0.0.1')origin=url.origin;
   if(url.origin!==origin)external.push(url.origin);
  });
  page.on('response',response=>{if(response.status()>=400)http.push(response.status());});
  page.on('requestfailed',request=>{let command;try{command=request.postDataJSON()?.command;}catch{}failed.push(command??request.url());});
  await use({expectHTTPFailure:status=>expectedHTTP.push(status),expectTransportFailure:command=>expectedTransport.push(command)});
  expect(errors,'uncaught browser errors').toEqual([]);
  expect(external,'unexpected external requests').toEqual([]);
  expect(http.sort(),'expected HTTP failures only').toEqual(expectedHTTP.sort());
  expect(failed.sort(),'expected transport failures only').toEqual(expectedTransport.sort());
  const unexpected=consoleErrors.filter(message=>!expectedHTTP.some(status=>message.startsWith('Failed to load resource:')&&message.includes(String(status)))&&!(expectedTransport.length&&/^Failed to load resource: net::ERR_/.test(message)));
  expect(unexpected,'unexpected console errors').toEqual([]);
  expect(consoleErrors.length,'each allowed console error must correspond to an asserted request failure').toBeLessThanOrEqual(expectedHTTP.length+expectedTransport.length);
 },{auto:true}],
 application:async({},use)=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'od-browser-release-')),vault=path.join(root,'vault');let service;
  try{
   await init(vault,2);service=await serve(vault);
   await use({vault,service,operation:(command,args)=>operation(vault,command,args),snapshot:async()=>{const state=await read(vault);return {state:state.state,batches:state.batches};}});
  }finally{if(service)await new Promise(resolve=>{service.server.closeAllConnections();service.server.close(resolve);});await fs.rm(root,{recursive:true,force:true});}
 }
});
