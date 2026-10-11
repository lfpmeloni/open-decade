import {listing} from './capabilities.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
const {values:options}=parseArgs({options:{'keep-package':{type:'string'}}});
const root=process.cwd(),temp=options['keep-package']?path.resolve(options['keep-package']):await fs.mkdtemp(path.join(os.tmpdir(),'od-public-check-'));
// A retained workspace must be new; never overwrite or remove caller-owned files.
if(options['keep-package'])await fs.mkdir(temp,{recursive:false});
const run=(cmd,args,cwd=root)=>execFileSync(cmd,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,OPEN_DECADE_VAULT:path.join(temp,'vault'),npm_config_offline:'true',npm_config_audit:'false',npm_config_fund:'false'}});
async function files(dir){const list=[];for(const ent of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())list.push(...await files(p));else list.push(p);}return list;}
try{
 assert.equal(await fs.readFile('docs/capabilities.md','utf8'),listing(),'Regenerate capability listing with npm run docs.');
 assert.equal(process.version,'v24.20.0');assert.equal(run('npm',['--version']).trim(),'11.19.0');
 const source=[...await files('src'),...await files('bin'),...await files('scripts'),...await files('test')].filter(p=>p.endsWith('.mjs'));
 for(const p of source)run(process.execPath,['--check',p]);
 const docs=['README.md','AGENTS.md','CONTRIBUTING.md','SECURITY.md','CHANGELOG.md',...await files('docs'),...await files('workflows'),...await files('knowledge')].filter(p=>p.endsWith('.md'));
 for(const p of docs){const text=await fs.readFile(p,'utf8');for(const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){const link=match[1];if(/^(?:https?:|#)/.test(link))continue;await fs.access(path.resolve(path.dirname(p),link.split('#')[0]));}}
 run('npm',['run','build']);
 const packed=JSON.parse(run('npm',['pack','--json','--ignore-scripts','--pack-destination',temp]))[0];
 const allowed=/^(?:bin\/|ui\/|web\/|src\/|schemas\/|fixtures\/|workflows\/|knowledge\/|docs\/|scripts\/|test\/|README\.md$|AGENTS\.md$|CONTRIBUTING\.md$|SECURITY\.md$|LICENSE$|CHANGELOG\.md$|package\.json$|\.nvmrc$)/;
 for(const f of packed.files){assert.ok(allowed.test(f.path),`Unexpected package path: ${f.path}`);assert.ok(!/(?:^|\/)(?:dev|node_modules|vault|\.env|\.git)(?:\/|$)/.test(f.path));}
 run('tar',['-xzf',path.join(temp,packed.filename),'-C',temp]);
 const clean=path.join(temp,'package');await fs.copyFile('package-lock.json',path.join(clean,'package-lock.json'));
 run('npm',['ci','--offline','--ignore-scripts','--no-audit','--no-fund'],clean);
 const bundle=async()=>Promise.all((await files(path.join(clean,'web'))).sort().map(async p=>[path.relative(clean,p),createHash('sha256').update(await fs.readFile(p)).digest('hex')]));
 const packagedBundle=await bundle();run('npm',['run','build'],clean);
 assert.deepEqual(await bundle(),packagedBundle,'Installed rebuild differs from the packaged browser bundle.');
 const od=args=>JSON.parse(run(process.execPath,['bin/od.mjs',...args,'--json'],clean));
 assert.equal(od(['import','formats']).data[0].id,'wise-csv');assert.equal(od(['doctor']).data.ready,false);assert.equal(od(['maintenance','--as-of','2028-01-01']).outcome,'partial');assert.equal(od(['doctor']).data.ready,false);od(['init']);
 const proposal=od(['import','preview','--file','fixtures/synthetic.json']);assert.equal(proposal.outcome,'success');
 od(['import','apply','--file','fixtures/synthetic.json','--confirm',proposal.data.confirmation]);
 assert.equal(od(['report','net-worth','--as-of','2026-01-01','--base','EUR']).data.combinedNetWorth,'39100');
 assert.equal(od(['report','performance','--account','performance-account','--from','2026-01-01','--to','2026-12-31']).data.timeWeightedReturn,'0.21');
 assert.equal(od(['simulate','goal','--assumptions','assumptions','--mode','monte-carlo']).data.terminalNominalPercentiles['50'],'220');
 od(['backup','--output',path.join(temp,'verified-backup.json')]);
 od(['restore','--file',path.join(temp,'verified-backup.json'),'--destination',path.join(temp,'restored')]);
 const migrationArgs=['--file',path.join(temp,'verified-backup.json'),'--destination',path.join(temp,'v2')];
 const migration=od(['migrate','preview',...migrationArgs]);od(['migrate','apply',...migrationArgs,'--confirm',migration.data.confirmation]);
 assert.equal(od(['doctor','--vault',path.join(temp,'v2')]).data.schemaVersion,2);
 assert.equal(od(['knowledge','search','--query','reserve','--as-of','2026-10-09']).data.entries[0].id,'planning');
 assert.equal(od(['connection','status']).data.productionVerified,false);assert.equal(od(['data','series','--series','euro-area-inflation','--as-of','2026-10-11']).data.status,'missing');
 const planningVault=path.join(temp,'planning');od(['init','--schema','2','--vault',planningVault]);
 const planningImport=od(['import','preview','--file','fixtures/planning.json','--vault',planningVault]);od(['import','apply','--file','fixtures/planning.json','--confirm',planningImport.data.confirmation,'--vault',planningVault]);
 assert.equal(od(['report','spending','--from','2026-01-01','--to','2026-01-31','--vault',planningVault]).data.categories[0].netSpending,'1000');
 assert.equal(od(['tax','checklist','--jurisdiction','DE','--year','2025','--as-of','2026-10-09','--vault',planningVault]).data.filingDecision,'not-produced');
 const lifeImport=od(['import','preview','--file','fixtures/life-planning.json','--vault',planningVault]);od(['import','apply','--file','fixtures/life-planning.json','--confirm',lifeImport.data.confirmation,'--vault',planningVault]);
 assert.equal(od(['report','retirement','--assumptions','retirement-example','--as-of','2026-01-01','--vault',planningVault]).data.cases[0].terminalNominal,'140');
 assert.equal(od(['report','housing','--assumptions','housing-example','--as-of','2026-01-01','--vault',planningVault]).data.cases[0].buyerMinusRenter,'960');
 const allocationVault=path.join(temp,'allocation');od(['init','--schema','2','--vault',allocationVault]);const allocationImport=od(['import','preview','--file','fixtures/allocation-plan.json','--vault',allocationVault]);od(['import','apply','--file','fixtures/allocation-plan.json','--confirm',allocationImport.data.confirmation,'--vault',allocationVault]);
 const draft=od(['report','allocation-plan','--assumptions','allocation-example','--as-of','2026-01-01','--vault',allocationVault]);assert.equal(draft.data.rows[0].draftChange,'-100');assert.equal(draft.data.netDraftChange,'200');assert.equal(od(['report','goals','--as-of','2026-01-01','--vault',allocationVault]).data.rows[0].recordedValue,'80');
 const householdVault=path.join(temp,'household');od(['init','--schema','2','--vault',householdVault]);
 for(const file of ['fixtures/household.json','fixtures/comparisons.json']){const preview=od(['import','preview','--file',file,'--vault',householdVault]);od(['import','apply','--file',file,'--confirm',preview.data.confirmation,'--vault',householdVault]);}
 assert.equal(od(['report','household-scenario','--assumptions','household-example','--as-of','2026-01-01','--vault',householdVault]).data.cases[0].terminalNominal,'140');
 assert.equal(od(['report','household-cashflow','--assumptions','household-example','--from','2026-01-01','--to','2026-01-31','--vault',householdVault]).data.complete,false);
 assert.equal(od(['report','household','--assumptions','household-example','--as-of','2026-01-01','--base','EUR','--vault',householdVault]).data.combinedNetWorth,'1000');
 assert.equal(od(['tax','checklist','--member','alex','--jurisdiction','DE','--year','2025','--as-of','2026-10-10','--vault',householdVault]).data.documents[0].id,'alex-document');
 od(['review','save','--report','tax','--member','alex','--jurisdiction','DE','--year','2025','--as-of','2026-10-10','--vault',householdVault]);assert.equal(od(['review','list','--vault',householdVault]).data.reviews[0].options.member,'alex');
 assert.equal(od(['report','fee-comparison','--assumptions','fee-example','--as-of','2026-01-01','--vault',householdVault]).data.rows[1].breakEvenWithReference.annualUsagePoints[1],'20000');
 const saved=od(['review','save','--report','net-worth','--as-of','2026-01-31','--vault',planningVault]);assert.equal(od(['review','list','--vault',planningVault]).data.reviews[0].reviewId,saved.data.reviewId);
 od(['export','--report','net-worth','--as-of','2026-01-31','--format','xlsx','--output','picture.xlsx','--vault',planningVault]);
 assert.equal((await fs.readFile(path.join(planningVault,'exports','picture.xlsx'))).readUInt32LE(0),0x04034b50);
 const partial=od(['report','costs','--as-of','2026-01-01']);assert.equal(partial.outcome,'partial');
 await fs.writeFile(path.join(temp,'package-check.json'),JSON.stringify({filename:packed.filename,files:packed.files.length,contents:packed.files.map(({path,size})=>({path,size}))},null,2)+'\n');
 console.log(`Checked ${source.length} modules, ${docs.length} documents and ${packed.files.length} package files. Fresh public-only offline installation and synthetic CLI flow passed.`);
}finally{if(!options['keep-package'])await fs.rm(temp,{recursive:true,force:true});}
