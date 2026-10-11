import {test,expect} from './fixtures.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {serve} from '../../src/server.mjs';
import {read,init} from '../../src/vault.mjs';
import {report} from '../../src/reports.mjs';
import {batch,account,observation,record} from '../helpers.mjs';
test('browser-only initialize, uncertain import review, correction, sources, masking and report export',async({page})=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'od-browser-')),vault=path.join(root,'vault'),service=await serve(vault),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(service.url);await page.getByRole('button',{name:'Initialize vault'}).click();await expect(page.getByRole('button',{name:'Update report'})).toBeVisible();
  await page.getByRole('button',{name:'Import review',exact:true}).click();await page.getByRole('button',{name:'Show values'}).click();
  const b=batch([account('a'),observation('o','a','123.45')]);b.records[1].provenance.uncertainties=['Review value'];
  await page.getByLabel('Record contents').fill(JSON.stringify(b));await page.getByRole('button',{name:'Preview interpretation'}).click();await expect(page.getByRole('button',{name:'Confirm and save this proposal'})).toBeDisabled();expect((await read(vault)).active).toHaveLength(0);
  b.records[1].provenance.uncertainties=[];await page.getByLabel('Record contents').fill(JSON.stringify(b));await page.getByRole('button',{name:'Preview interpretation'}).click();await page.getByRole('button',{name:'Confirm and save this proposal'}).click();await expect(page.getByRole('status')).toHaveText('Result: success');
  const correction=batch([observation('o2','a','125.50',{supersedes:'o'})],'correction');await page.getByLabel('Record contents').fill(JSON.stringify(correction));await page.getByRole('button',{name:'Preview interpretation'}).click();await page.getByRole('button',{name:'Confirm and save this proposal'}).click();await expect(page.getByRole('status')).toHaveText('Result: success');
  await page.getByRole('button',{name:'Overview',exact:true}).click();await page.getByLabel('As of').fill('2026-01-01');await page.getByRole('button',{name:'Update report'}).click();await expect(page.getByRole('cell',{name:'125.5',exact:true})).toBeVisible();await expect(page.getByRole('img')).toBeVisible();
  await page.getByRole('button',{name:'Mask values'}).click();await expect(page.getByRole('cell',{name:'125.5',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Download complete JSON report'})).toBeDisabled();
  await page.getByRole('button',{name:'Show values'}).click();await page.getByText('Structured result and sources',{exact:true}).click();await expect(page.locator('pre')).toContainText('synthetic');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download complete JSON report'}).click();const downloaded=await download;const exported=JSON.parse(await fs.readFile(await downloaded.path(),'utf8'));expect(exported.data).toEqual(JSON.parse(JSON.stringify(report(await read(vault),'net-worth',{asOf:'2026-01-01',base:'EUR'}).data)));
  await page.getByRole('button',{name:'Accounts',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Confirmed accounts'})).toBeVisible();
  await page.getByRole('button',{name:'Overview',exact:true}).click();await page.getByRole('button',{name:'Update report'}).click();await page.screenshot({path:test.info().outputPath('overview.png'),fullPage:true});
  expect(errors).toEqual([]);
 }finally{await new Promise(r=>{service.server.closeAllConnections();service.server.close(r);});await fs.rm(root,{recursive:true,force:true});}
});

test('schema-2 browser reminders, tax routing, saved reviews and portable downloads',async({page})=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'od-browser-review-')),vault=path.join(root,'vault'),service=await serve(vault);
 try{
  await page.goto(service.url);await page.getByRole('button',{name:'Initialize vault'}).click();await expect(page.getByRole('button',{name:'Update report'})).toBeVisible();expect((await read(vault)).schemaVersion).toBe(2);
  await page.getByRole('button',{name:'Show values'}).click();await page.getByRole('button',{name:'Import review',exact:true}).click();
  const b={schemaVersion:2,batchId:'reminder',records:[record('reminder','reminder',{title:'Review insurance documents',dueDate:'2026-01-20',enabled:true,completed:false,topic:'insurance',documentIds:[]})]};
  b.records.push(...JSON.parse(await fs.readFile(new URL('../../fixtures/life-planning.json',import.meta.url))).records);
  b.records.push(...JSON.parse(await fs.readFile(new URL('../../fixtures/allocation-plan.json',import.meta.url))).records);
  b.records.push(...JSON.parse(await fs.readFile(new URL('../../fixtures/household.json',import.meta.url))).records);
  b.records.push(...JSON.parse(await fs.readFile(new URL('../../fixtures/comparisons.json',import.meta.url))).records);
  await page.getByLabel('Record contents').fill(JSON.stringify(b));await page.getByRole('button',{name:'Preview interpretation'}).click();await page.getByRole('button',{name:'Confirm and save this proposal'}).click();await expect(page.getByRole('status')).toHaveText('Result: success');
  await page.getByRole('button',{name:'Reports',exact:true}).click();await page.getByLabel('Report',{exact:true}).selectOption('reminders');await page.getByLabel('As of').fill('2026-01-01');await page.getByLabel('Through').fill('2026-01-31');await page.getByRole('button',{name:'Update report'}).click();
  await page.getByLabel('Export format').selectOption('ics');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Generate download'}).click();const file=await download;expect(await fs.readFile(await file.path(),'utf8')).toContain('SUMMARY:Review insurance documents');
  await page.getByRole('button',{name:'Save report to review history'}).click();await expect(page.getByRole('status')).toHaveText('Result: success');await page.getByRole('button',{name:'Review inbox',exact:true}).click();await expect(page.getByLabel('Earlier review').locator('option')).toHaveCount(2);
  const id=await page.getByLabel('Earlier review').locator('option').nth(1).getAttribute('value');await page.getByLabel('Earlier review').selectOption(id);await page.getByLabel('Later review').selectOption(id);await page.getByRole('button',{name:'Compare saved reports'}).click();await expect(page.getByRole('status')).toHaveText('Result: success');
  await page.getByRole('button',{name:'Reports',exact:true}).click();await page.getByLabel('Report',{exact:true}).selectOption('tax');await page.getByLabel('As of').fill('2026-10-09');await page.getByLabel('Jurisdiction').selectOption('DE');await page.getByLabel('Tax year').fill('2025');await page.getByRole('button',{name:'Update report'}).click();await expect(page.getByText('MISSING_TAX_CONTEXT',{exact:true})).toBeVisible();
  await page.getByLabel('Export format').selectOption('pdf');const pdfDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Generate download'}).click();expect((await fs.readFile(await (await pdfDownload).path())).subarray(0,8).toString()).toBe('%PDF-1.4');
  await page.getByLabel('Report',{exact:true}).selectOption('retirement');await page.getByLabel('Assumptions record ID').fill('retirement-example');await page.getByRole('button',{name:'Update report'}).click();await expect(page.getByRole('cell',{name:'140',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Mask values'}).click();await expect(page.getByRole('cell',{name:'140',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Show values'}).click();
  await page.getByLabel('Report',{exact:true}).selectOption('housing');await page.getByLabel('Assumptions record ID').fill('housing-example');await page.getByRole('button',{name:'Update report'}).click();await expect(page.getByRole('cell',{name:'No: funding gap',exact:true})).toBeVisible();
  await page.getByLabel('Report',{exact:true}).selectOption('allocation-plan');await page.getByLabel('As of').fill('2026-01-01');await page.getByLabel('Assumptions record ID').fill('allocation-example');await page.getByRole('button',{name:'Update report'}).click();await expect(page.getByRole('heading',{name:'Allocation draft · draft'})).toBeVisible();await expect(page.getByRole('cell',{name:'-100',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Mask values'}).click();await expect(page.getByRole('cell',{name:'-100',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Show values'}).click();await page.getByLabel('Report',{exact:true}).selectOption('household');await page.getByLabel('Assumptions record ID').fill('household-example');await page.getByRole('button',{name:'Update report'}).click();await expect(page.getByText('EUR net worth: 750',{exact:true})).toBeVisible();
  await page.getByLabel('Report',{exact:true}).selectOption('household-scenario');await page.getByRole('button',{name:'Update report'}).click();await expect(page.getByRole('cell',{name:'140',exact:true})).toBeVisible();await expect(page.getByRole('cell',{name:'20',exact:true})).toBeVisible();
  await page.getByLabel('Report',{exact:true}).selectOption('tax');await page.getByLabel('As of').fill('2026-10-10');await page.getByLabel('Member ID (blank for personal)').fill('alex');await page.getByRole('button',{name:'Update report'}).click();const personalDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download complete JSON report'}).click();const personal=JSON.parse(await fs.readFile(await (await personalDownload).path(),'utf8'));expect(personal.data.documents.map(d=>d.id)).toEqual(['alex-document']);
  await page.getByLabel('Report',{exact:true}).selectOption('fx-comparison');await page.getByLabel('Assumptions record ID').fill('fx-example');await page.getByRole('button',{name:'Update report'}).click();await expect(page.getByRole('cell',{name:'1083.5 USD',exact:true})).toBeVisible();
 }finally{await new Promise(r=>{service.server.closeAllConnections();service.server.close(r);});await fs.rm(root,{recursive:true,force:true});}
});

for(const schemaVersion of [1,2])test(`schema-${schemaVersion} manual forms preview, correct, mask and export shared results`,async({page})=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'od-forms-')),vault=path.join(root,'vault'),service=await serve(vault);
 try{
  if(schemaVersion===1)await init(vault,1);
  await page.goto(service.url);if(schemaVersion===2)await page.getByRole('button',{name:'Initialize vault'}).click();await expect(page.getByRole('button',{name:'Update report'})).toBeVisible();
  await page.getByRole('button',{name:'Accounts',exact:true}).click();await page.getByRole('button',{name:'Add record',exact:true}).click();await expect(page.getByText('Show values to enter and review records.')).toBeVisible();await page.getByRole('button',{name:'Show values'}).click();
  async function common(){await page.getByLabel('Record date',{exact:true}).fill('2026-01-01');await page.getByLabel('Record currency').fill('EUR');}
  async function save(){await page.getByRole('button',{name:'Preview record',exact:true}).click();await page.getByRole('button',{name:'Confirm record',exact:true}).click();await expect(page.getByRole('region',{name:'Record entry'})).toHaveCount(0);}
  await common();await page.getByLabel('Record name').fill('Everyday account');await page.getByLabel('Ownership fraction').fill('2');await page.getByRole('button',{name:'Preview record',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();expect((await read(vault)).active).toHaveLength(0);await page.getByLabel('Ownership fraction').fill('1');await page.getByLabel('Balance coverage').selectOption('aggregate');await page.getByRole('button',{name:'Preview record',exact:true}).click();await expect(page.getByRole('heading',{name:'Review proposed record'})).toBeVisible();expect((await read(vault)).active).toHaveLength(0);
  await page.getByRole('button',{name:'Mask values'}).click();await expect(page.getByRole('button',{name:'Confirm record',exact:true})).toBeDisabled();await expect(page.getByLabel('Record name')).toHaveCount(0);await page.getByRole('button',{name:'Show values'}).click();await page.getByLabel('Record name').fill('Household cash');await expect(page.getByRole('button',{name:'Confirm record',exact:true})).toHaveCount(0);await save();
  const a=(await read(vault)).active[0];
  await page.getByRole('button',{name:'Add balance',exact:true}).click();await common();await page.getByLabel('Account',{exact:true}).selectOption(a.id);await page.getByLabel('Balance value').fill('123.45');await save();
  await page.getByRole('button',{name:'Transactions',exact:true}).click();await page.getByRole('button',{name:'Add record',exact:true}).click();await common();await page.getByLabel('Account',{exact:true}).selectOption(a.id);await page.getByLabel('Signed amount').fill('-12.50');await page.getByLabel('Classification',{exact:true}).selectOption('spending');await save();
  const transaction=(await read(vault)).active.find(r=>r.kind==='transaction');await page.locator('summary').filter({hasText:transaction.id}).click();await page.getByRole('button',{name:'Correct record',exact:true}).click();await page.getByLabel('Signed amount').fill('-13.50');await save();
  const corrected=(await read(vault)).active.find(r=>r.kind==='transaction');expect(corrected.supersedes).toBe(transaction.id);expect(corrected.amount).toBe('-13.50');expect(corrected.accountId).toBe(a.id);
  await page.getByRole('button',{name:'Goals',exact:true}).click();await page.getByRole('button',{name:'Add record',exact:true}).click();await common();await page.getByLabel('Record name').fill('Reserve');await page.getByLabel('Target amount').fill('500');await page.getByLabel('Target date',{exact:true}).fill('2027-01-01');await save();expect((await read(vault)).active.find(r=>r.kind==='goal').entityIds).toEqual([]);
  await page.getByRole('button',{name:'Overview',exact:true}).click();await page.getByLabel('As of').fill('2026-01-01');await page.getByRole('button',{name:'Update report'}).click();await expect(page.getByRole('cell',{name:'123.45',exact:true})).toBeVisible();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download complete JSON report'}).click();const exported=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));expect(exported.data).toEqual(JSON.parse(JSON.stringify(report(await read(vault),'net-worth',{asOf:'2026-01-01',base:'EUR'}).data)));
 }finally{await new Promise(r=>{service.server.closeAllConnections();service.server.close(r);});await fs.rm(root,{recursive:true,force:true});}
});

test('schema-driven records editor handles supported fields, optional values, arrays and unresolved corrections',async({page})=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'od-schema-ui-')),vault=path.join(root,'vault'),service=await serve(vault);
 try{
  await page.goto(service.url);await page.getByRole('button',{name:'Initialize vault'}).click();await expect(page.getByRole('button',{name:'Update report'})).toBeVisible();await page.getByRole('button',{name:'Show values'}).click();await page.getByRole('button',{name:'Records',exact:true}).click();await page.getByRole('button',{name:'Add record',exact:true}).click();await expect(page.getByLabel('Record type').locator('option')).toHaveCount(31);
  await page.getByLabel('Record / date',{exact:true}).fill('2026-01-01');await page.getByLabel('Record / provenance / source',{exact:true}).fill('Synthetic manual review');await page.getByLabel('Record / provenance / quality',{exact:true}).selectOption('user-reported');await page.getByLabel('Record / name',{exact:true}).fill('Groceries');await page.getByLabel('Record / nature',{exact:true}).selectOption('essential');
  await page.getByRole('button',{name:'Add Record / provenance / uncertainties item',exact:true}).click();await page.getByLabel('Record / provenance / uncertainties 1',{exact:true}).fill('Confirm category interpretation');await page.getByRole('button',{name:'Preview supported record'}).click();await expect(page.getByRole('button',{name:'Confirm supported record'})).toBeDisabled();expect((await read(vault)).active).toHaveLength(0);
  await page.getByRole('button',{name:'Remove Record / provenance / uncertainties 1',exact:true}).click();await expect(page.getByRole('button',{name:'Confirm supported record'})).toHaveCount(0);await page.getByRole('button',{name:'Preview supported record'}).click();await page.getByRole('button',{name:'Confirm supported record'}).click();await expect(page.getByRole('region',{name:'Advanced record entry'})).toHaveCount(0);
  const original=(await read(vault)).active[0];await page.locator('summary').filter({hasText:'Groceries'}).click();await page.getByRole('button',{name:'Correct record',exact:true}).click();await page.getByLabel('Record / name',{exact:true}).fill('Food');await page.getByLabel('Include raw Reference',{exact:true}).check();await page.getByLabel('Record / provenance / raw Reference',{exact:true}).fill('synthetic-note');await page.getByRole('button',{name:'Preview supported record'}).click();await page.getByRole('button',{name:'Mask values'}).click();await expect(page.getByRole('button',{name:'Confirm supported record'})).toBeDisabled();await expect(page.getByLabel('Record / name',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Show values'}).click();await page.getByRole('button',{name:'Confirm supported record'}).click();await expect(page.getByRole('region',{name:'Advanced record entry'})).toHaveCount(0);
  const corrected=(await read(vault)).active[0];expect(corrected.supersedes).toBe(original.id);expect(corrected.nature).toBe('essential');expect(corrected.provenance.rawReference).toBe('synthetic-note');
 }finally{await new Promise(r=>{service.server.closeAllConnections();service.server.close(r);});await fs.rm(root,{recursive:true,force:true});}
});

test('CSV mapping controls and delayed preview never confirm an edited interpretation',async({page})=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'od-csv-ui-')),vault=path.join(root,'vault'),service=await serve(vault);
 try{
  await init(vault,2);const {operation}=await import('../../src/operations.mjs');const b=batch([account('mapped-account')]);const p=await operation(vault,'import preview',{batch:b});await operation(vault,'import apply',{batch:b,confirmation:p.data.confirmation});
  await page.goto(service.url);await page.getByRole('button',{name:'Show values'}).click();await page.getByRole('button',{name:'Import review',exact:true}).click();await page.getByLabel('Format',{exact:true}).selectOption('csv');await page.getByLabel('Record contents').fill('ID,Date,Amount\none,02/01/2026,-12.50\n');
  await page.getByLabel('Confirmed account ID').fill('mapped-account');await page.getByLabel('Source label',{exact:true}).fill('Synthetic CSV');await page.getByLabel('Column separator',{exact:true}).selectOption(',');await page.getByLabel('Stable ID column').fill('ID');await page.getByLabel('Date column',{exact:true}).fill('Date');await page.getByLabel('Signed amount column').fill('Amount');await page.getByLabel('Constant currency').fill('EUR');await page.getByLabel('Date interpretation',{exact:true}).selectOption('DD/MM/YYYY');await page.getByLabel('Decimal separator',{exact:true}).selectOption('.');
  let release;const gate=new Promise(r=>release=r);let intercepted;const pending=new Promise(r=>intercepted=r);
  await page.route('**/api',async route=>{if(route.request().postDataJSON().command==='import preview'){const response=await route.fetch();intercepted();await gate;await route.fulfill({response});}else await route.continue();});
  await page.getByRole('button',{name:'Preview interpretation'}).click();await pending;await page.getByLabel('Record contents').fill('ID,Date,Amount\none,02/01/2026,-13.50\n');release();await expect(page.getByRole('status')).not.toHaveText('Working locally…');await expect(page.getByRole('button',{name:'Confirm and save this proposal'})).toHaveCount(0);expect((await read(vault)).active).toHaveLength(1);
  await page.unroute('**/api');await page.getByRole('button',{name:'Preview interpretation'}).click();await page.getByRole('button',{name:'Confirm and save this proposal'}).click();await expect(page.getByRole('status')).toHaveText('Result: success');expect((await read(vault)).active.find(r=>r.kind==='transaction').amount).toBe('-13.5');
 }finally{await new Promise(r=>{service.server.closeAllConnections();service.server.close(r);});await fs.rm(root,{recursive:true,force:true});}
});

test('keyboard navigation, skip link, responsive forms and local-only requests',async({page})=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'od-keyboard-')),vault=path.join(root,'vault'),service=await serve(vault),external=[];
 page.on('request',r=>{if(new URL(r.url()).origin!==service.origin)external.push(r.url());});
 try{
  await page.setViewportSize({width:390,height:844});await page.goto(service.url);await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('main')).toBeFocused();
  await page.getByRole('button',{name:'Initialize vault'}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Update report'})).toBeVisible();
  await page.getByRole('button',{name:'Records',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('main')).toBeFocused();await expect(page).toHaveTitle('Records · Open-decade');
  await page.getByRole('button',{name:'Show values'}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Add record',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByLabel('Record type')).toBeVisible();
  await page.getByLabel('Record / date',{exact:true}).fill('2026-01-01');await page.getByLabel('Record / provenance / source',{exact:true}).fill('Synthetic keyboard input');await page.getByLabel('Record / provenance / quality',{exact:true}).selectOption('user-reported');await page.getByLabel('Record / name',{exact:true}).fill('Essential');await page.getByLabel('Record / nature',{exact:true}).selectOption('essential');
  await page.getByRole('button',{name:'Preview supported record'}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Confirm supported record'})).toBeEnabled();
  const unlabeled=await page.locator('input,select,textarea').evaluateAll(nodes=>nodes.filter(n=>!n.labels?.length&&!n.getAttribute('aria-label')&&!n.getAttribute('aria-labelledby')).length);expect(unlabeled).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Mask values'}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Confirm supported record'})).toBeDisabled();expect((await read(vault)).active).toHaveLength(0);expect(external).toEqual([]);
 }finally{await new Promise(r=>{service.server.closeAllConnections();service.server.close(r);});await fs.rm(root,{recursive:true,force:true});}
});

test('release accessibility baseline: landmarks, labels, contrast, live feedback and 320px large-text reflow',async({page})=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'od-accessibility-')),vault=path.join(root,'vault'),service=await serve(vault);
 try{
  await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(service.origin+'/#'+service.token);
  await page.getByRole('button',{name:'Initialize vault'}).click();await expect(page.getByRole('status')).toHaveText('Result: success');
  const check=async()=>{
   await expect(page.getByRole('navigation',{name:'Main'})).toHaveCount(1);await expect(page.getByRole('main')).toHaveCount(1);await expect(page.getByRole('heading',{level:1})).toHaveCount(1);
   const issues=await page.evaluate(()=>{
    const problems=[],visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
    for(const e of document.querySelectorAll('input,select,textarea'))if(visible(e)&&!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby'))problems.push('unnamed input');
    for(const e of document.querySelectorAll('button'))if(visible(e)&&!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby'))problems.push('unnamed button');
    const rgb=x=>x.match(/[\d.]+/g)?.map(Number),luminance=c=>c.slice(0,3).map(x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;}).reduce((n,x,i)=>n+x*[0.2126,0.7152,0.0722][i],0);
    for(const e of document.querySelectorAll('body *')){
     if(!(e instanceof HTMLElement)||!visible(e)||e.disabled||e.closest('button:disabled')||![...e.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()))continue;
     const style=getComputedStyle(e),fg=rgb(style.color);let bg;
     for(let p=e;p;p=p.parentElement){const c=rgb(getComputedStyle(p).backgroundColor);if(c&&(c.length===3||c[3]===1)){bg=c;break;}}
     if(!fg||!bg)continue;const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&parseFloat(style.fontWeight)>=700);
     if(ratio<(large?3:4.5))problems.push('low text contrast: '+e.tagName+' '+e.textContent.trim().slice(0,40)+' '+ratio.toFixed(2));
    }
    if(document.documentElement.scrollWidth>innerWidth)problems.push('horizontal page overflow');return problems;
   });expect(issues).toEqual([]);
  };
  for(const name of ['Overview','Accounts','Transactions','Import review','Goals','Records','Reports','Review inbox','Settings']){
   const nav=page.getByRole('navigation').getByRole('button',{name,exact:true});await nav.focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{level:1,name,exact:true})).toBeVisible();await check();
  }
  await page.getByRole('navigation').getByRole('button',{name:'Reports',exact:true}).click();await page.getByLabel('Report',{exact:true}).selectOption('household-scenario');await page.getByLabel('Assumptions record ID').fill('missing');await page.getByRole('button',{name:'Update report'}).click();await expect(page.getByRole('alert')).toBeVisible();await check();
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});expect(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize)).toBe('32px');await check();
  await page.getByRole('button',{name:'Show values'}).focus();await page.keyboard.press('Tab');expect(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle)).not.toBe('none');
 }finally{await new Promise(r=>{service.server.closeAllConnections();service.server.close(r);});await fs.rm(root,{recursive:true,force:true});}
});
