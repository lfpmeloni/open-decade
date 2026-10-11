import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runRelease,nodeResults,browserResults} from '../scripts/release-check.mjs';
const tap='# tests 2\n# pass 2\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
const browser={stats:{expected:2,unexpected:0,skipped:0,flaky:0}};
async function setup(t,{failure,dirty=false,change=false}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'od-release-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const output=path.join(root,'evidence');let workspace,calls=0,sources=0;
 const run=async(command,args,options)=>{
  calls++;await fs.writeFile(options.log,`stage ${calls}\n`);
  if(calls===1){
   workspace=args.at(-1);await fs.mkdir(path.join(workspace,'package','test'),{recursive:true});await fs.writeFile(path.join(workspace,'package','test','example.test.mjs'),'');
   await fs.writeFile(path.join(workspace,'package-check.json'),JSON.stringify({filename:'example.tgz',files:1,contents:[{path:'test/example.test.mjs',size:0}]}));await fs.writeFile(path.join(workspace,'example.tgz'),'synthetic package');
   const module=path.join(workspace,'package','node_modules','playwright');await fs.mkdir(module,{recursive:true});await fs.writeFile(path.join(module,'index.mjs'),"export const chromium={launch:async()=>({version:()=> 'synthetic',close:async()=>{}})};");
  }else if(calls===2)await fs.writeFile(options.log,failure==='skip'?tap.replace('# skipped 0','# skipped 1'):tap);
  else{await fs.mkdir(path.join(options.env.OPEN_DECADE_TEST_OUTPUT,'artifacts'),{recursive:true});await fs.writeFile(path.join(options.env.OPEN_DECADE_TEST_OUTPUT,'artifacts','failure.txt'),'retained evidence');if(failure!=='missing-report')await fs.writeFile(path.join(options.env.OPEN_DECADE_TEST_OUTPUT,'results.json'),JSON.stringify(browser));}
  return {code:failure===calls?1:0};
 };
 const summary=await runRelease({root,output,run,source:()=>({commit:'synthetic-commit',dirty:dirty||(change&&sources++>0)})});
 return {summary,output,workspace,calls};
}
test('release gate rejects incomplete, skipped, failed and flaky test summaries',()=>{
 assert.equal(nodeResults(tap).passed,2);
 for(const text of ['',tap.replace('# skipped 0','# skipped 1'),tap.replace('# todo 0','# todo 1'),tap.replace('# cancelled 0','# cancelled 1'),tap.replace('# pass 2','# pass 1')])assert.throws(()=>nodeResults(text));
 assert.equal(browserResults(browser).passed,2);
 for(const stats of [{},{expected:0,unexpected:0,skipped:0,flaky:0},{...browser.stats,skipped:1},{...browser.stats,flaky:1},{...browser.stats,unexpected:1}])assert.throws(()=>browserResults({stats}));
});
test('failed stage stops downstream execution and cleans temporary package while retaining evidence',async t=>{
 const {summary,output,workspace,calls}=await setup(t,{failure:1});assert.equal(calls,1);assert.equal(summary.releaseReady,false);assert.equal(summary.stages[0].status,'failed');assert.equal(summary.cleanup,'passed');await assert.rejects(fs.access(workspace));assert.match(await fs.readFile(path.join(output,'package.log'),'utf8'),/stage 1/);assert.deepEqual(JSON.parse(await fs.readFile(path.join(output,'summary.json'))),summary);
});
test('skipped Node tests prevent browser execution even with a zero process exit',async t=>{
 const {summary,calls}=await setup(t,{failure:'skip'});assert.equal(calls,2);assert.equal(summary.stages[1].status,'failed');assert.equal(summary.checksPassed,false);
});
test('missing browser report fails closed and retains browser evidence',async t=>{
 const {summary,output,workspace}=await setup(t,{failure:'missing-report'});assert.equal(summary.stages[2].status,'failed');assert.equal(summary.releaseReady,false);assert.equal(await fs.readFile(path.join(output,'browser','artifacts','failure.txt'),'utf8'),'retained evidence');await assert.rejects(fs.access(workspace));
});
test('only passing checks on unchanged clean source qualify as release-ready',async t=>{
 for(const options of [{},{dirty:true},{change:true}]){
  const {summary,workspace,output}=await setup(t,options);assert.equal(summary.checksPassed,true);assert.equal(summary.releaseReady,!options.dirty&&!options.change);assert.equal(summary.package.sha256.length,64);assert.equal(summary.runtime.chromium,'synthetic');assert.equal(await fs.readFile(path.join(output,'package.tgz'),'utf8'),'synthetic package');assert.equal(JSON.parse(await fs.readFile(path.join(output,'package-manifest.json'))).contents[0].path,'test/example.test.mjs');await assert.rejects(fs.access(workspace));
 }
});
