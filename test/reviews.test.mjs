import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {init,preview,apply,read} from '../src/vault.mjs';
import {saveReview,listReviews,compareReviews} from '../src/reviews.mjs';
import {pdf,xlsx,ics,redacted} from '../src/portable-exports.mjs';
import {operation} from '../src/operations.mjs';
import {report} from '../src/reports.mjs';
import {replay} from '../src/validate.mjs';
import {account,observation,batch,record} from './helpers.mjs';
test('immutable review snapshots deduplicate, compare changed evidence, and detect tampering',async t=>{
 const v=await fs.mkdtemp(path.join(os.tmpdir(),'od-review-'));t.after(()=>fs.rm(v,{recursive:true,force:true}));await init(v);
 let b=batch([account('a'),observation('o','a','100')]);await apply(v,b,(await preview(v,b)).confirmation);
 const opts={asOf:'2026-01-01',vault:'SHOULD NOT PERSIST'},a=await saveReview(v,'net-worth',opts);assert.equal((await saveReview(v,'net-worth',opts)).existing,true);
 b=batch([observation('corrected','a','120',{supersedes:'o'})],'correction');await apply(v,b,(await preview(v,b)).confirmation);
 const c=await saveReview(v,'net-worth',opts),r=await compareReviews(v,a.reviewId,c.reviewId);assert(r.changes.some(c=>c.path==='perCurrency/EUR/netWorth'&&c.before==='100'&&c.after==='120'));
 assert.equal((await listReviews(v)).reviews.length,2);const file=path.join(v,'reports',a.reviewId+'.json');assert(!(await fs.readFile(file,'utf8')).includes('SHOULD NOT PERSIST'));
 const exported=await operation(v,'export',{name:'net-worth',asOf:opts.asOf,format:'xlsx'});assert.equal(Buffer.from(exported.data.content,'base64').readUInt32LE(0),0x04034b50);
 await fs.writeFile(file,'{}');await assert.rejects(listReviews(v),{code:'CORRUPT_VAULT'});
});
test('calendar includes only enabled confirmed reminders with escaped labels and no notifications',()=>{
 const s=replay([{schemaVersion:2,batchId:'r',records:[record('reminder','r',{title:'Review,\nBEGIN:VALARM;'+ 'é'.repeat(80),dueDate:'2026-02-01',enabled:true,completed:false,topic:'review',documentIds:[]}),record('reminder','off',{title:'Off',dueDate:'2026-01-01',enabled:false,completed:false,topic:'other',documentIds:[]})]}]);
 const r={command:'export',...report(s,'reminders',{asOf:'2026-01-01',to:'2026-02-01'})},out=ics(r);assert.equal(r.data.rows.length,1);assert(out.includes('DTSTART;VALUE=DATE:20260201'));assert(!out.includes('\r\nBEGIN:VALARM'));assert(!out.includes('SUMMARY:Off'));assert(out.split('\r\n').every(line=>Buffer.byteLength(line)<=73));assert.throws(()=>ics({command:'export',data:{rows:[]}}));
});
test('sharing retains aggregate amounts but removes identifying fields; PDF and XLSX preserve inert data',()=>{
 const s=replay([batch([account('SECRET-NAME'),observation('o','SECRET-NAME','123.45')])]);
 const r={command:'export',outcome:'partial',contractVersion:1,...report(s,'net-worth',{asOf:'2026-01-01'}),errors:[]},shared=redacted(r);assert(!JSON.stringify(shared).includes('SECRET-NAME'));assert.equal(shared.data.perCurrency.EUR.netWorth.toString(),'123.45');
 assert.throws(()=>redacted({data:{perCurrency:{EUR:{assets:'1'}}}}));
 const unsafe={text:'=HYPERLINK("x") <script> é',amount:'123.45'};assert(pdf(unsafe).toString().startsWith('%PDF-1.4'));const sheet=xlsx(unsafe).toString();assert(sheet.includes('t="inlineStr"'));assert(!sheet.includes('<f>'));assert(sheet.includes('&lt;script&gt;'));assert(sheet.includes('123.45'));
});
