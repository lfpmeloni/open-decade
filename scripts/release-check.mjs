import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

function sourceState(root){
 try{return {commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:root,encoding:'utf8'}).trim()!==''};}
 catch{return {commit:null,dirty:true};}
}
async function execute(command,args,{cwd,env,log}){
 const output=createWriteStream(log);
 const child=spawn(command,args,{cwd,env,stdio:['ignore','pipe','pipe']});
 child.stdout.pipe(output,{end:false});child.stderr.pipe(output,{end:false});
 child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
 try{return await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});}
 finally{await new Promise(resolve=>output.end(resolve));}
}
export function nodeResults(tap){
 const value=name=>{const match=tap.match(new RegExp(`^# ${name} (\\d+)$`,'m'));if(!match)throw new Error('Incomplete Node test summary.');return Number(match[1]);};
 const result={tests:value('tests'),passed:value('pass'),failed:value('fail'),skipped:value('skipped'),todo:value('todo'),cancelled:value('cancelled')};
 if(!result.tests||result.failed||result.skipped||result.todo||result.cancelled||result.passed!==result.tests)throw new Error('Node tests failed, skipped, or incomplete.');
 return result;
}
export function browserResults(report){
 const stats=report.stats;
 if(!stats||!Number.isInteger(stats.expected)||!stats.expected||stats.unexpected!==0||stats.skipped!==0||stats.flaky!==0)throw new Error('Chromium tests failed, skipped, or incomplete.');
 return {passed:stats.expected,failed:stats.unexpected,skipped:stats.skipped,flaky:stats.flaky};
}
export async function runRelease({root=process.cwd(),output=path.join(root,'release-results'),run=execute,source=sourceState}={}){
 const initial=source(root),summary={startedAt:new Date().toISOString(),source:initial,scope:'WSL2/Linux runtime and bounded Chromium baseline; no native-desktop or live-provider certification',runtime:{node:process.version,platform:process.platform},package:null,stages:[],checksPassed:false,releaseReady:false};
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'od-release-')),workspace=path.join(temp,'public'),clean=path.join(workspace,'package');
 const env={...process.env,OPEN_DECADE_VAULT:path.join(temp,'unused-vault'),OPEN_DECADE_TEST_OUTPUT:path.join(output,'browser'),npm_config_offline:'true',npm_config_audit:'false',npm_config_fund:'false'};
 async function stage(name,command,args,cwd,log,verify){
  const entry={name,command:[path.basename(command),...args.map(a=>a===workspace?'<temporary-package>':a)],status:'running',evidence:log};summary.stages.push(entry);
  try{const result=await run(command,args,{cwd,env,log:path.join(output,log)});if(result.code!==0)throw new Error(`Command exited ${result.code??result.signal??'without a status'}.`);if(verify)await verify(entry);entry.status='passed';}
  catch(error){entry.status='failed';entry.error=error.message;throw error;}
 }
 try{
  await fs.mkdir(output,{recursive:true});
  // Replace only this check's known generated evidence.
  for(const name of ['browser','package.log','node.tap','chromium.log','package.tgz','package-manifest.json','summary.json'])await fs.rm(path.join(output,name),{recursive:true,force:true});
  if(process.platform!=='linux')throw new Error('Final acceptance is scoped to the documented Linux runtime.');
  summary.runtime.npm=execFileSync('npm',['--version'],{cwd:root,encoding:'utf8'}).trim();
  await stage('package',process.execPath,['scripts/check.mjs','--keep-package',workspace],root,'package.log',async()=>{
   const packed=JSON.parse(await fs.readFile(path.join(workspace,'package-check.json'),'utf8'));
   summary.package={filename:packed.filename,files:packed.files,sha256:createHash('sha256').update(await fs.readFile(path.join(workspace,packed.filename))).digest('hex'),artifact:'package.tgz',manifest:'package-manifest.json'};
   await fs.copyFile(path.join(workspace,packed.filename),path.join(output,'package.tgz'));
   await fs.writeFile(path.join(output,'package-manifest.json'),JSON.stringify({...summary.package,contents:packed.contents},null,2)+'\n');
  });
  const tests=(await fs.readdir(path.join(clean,'test'))).filter(p=>p.endsWith('.test.mjs')).sort().map(p=>`test/${p}`);
  await stage('node',process.execPath,['--test','--test-reporter=tap',...tests],clean,'node.tap',async entry=>{entry.results=nodeResults(await fs.readFile(path.join(output,'node.tap'),'utf8'));});
  await stage('chromium',process.execPath,['node_modules/@playwright/test/cli.js','test','--config','test/browser/playwright.config.mjs'],clean,'chromium.log',async entry=>{
   entry.results=browserResults(JSON.parse(await fs.readFile(path.join(output,'browser','results.json'),'utf8')));
   const {chromium}=await import(path.join(clean,'node_modules/playwright/index.mjs'));
   const browser=await chromium.launch();try{summary.runtime.chromium=browser.version();}finally{await browser.close();}
  });
  summary.checksPassed=true;
 }catch(error){summary.error=error.message;}
 finally{
  try{await fs.rm(temp,{recursive:true,force:true});summary.cleanup='passed';}catch{summary.cleanup='failed';summary.checksPassed=false;}
  const final=source(root);summary.sourceChanged=JSON.stringify(initial)!==JSON.stringify(final);
  summary.releaseReady=summary.checksPassed&&!initial.dirty&&!!initial.commit&&!summary.sourceChanged;
  summary.finishedAt=new Date().toISOString();
  await fs.writeFile(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
 }
 return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const summary=await runRelease();
 console.log(`Release checks: ${summary.checksPassed?'passed':'failed'}; release-ready: ${summary.releaseReady}. Evidence: release-results/summary.json`);
 if(summary.checksPassed&&!summary.releaseReady)console.log('Commit and review the intended changes, then rerun from a clean checkout. No files were committed or published.');
 process.exitCode=summary.releaseReady?0:1;
}
