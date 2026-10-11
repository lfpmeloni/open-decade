import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {maintenance,formatReviews} from '../src/maintenance.mjs';
import {operation} from '../src/operations.mjs';
test('maintenance dates distinguish current, due and future without fetching or requiring a vault',async()=>{
 const current=maintenance({asOf:'2026-10-11'});assert.equal(current.data.queue.length,0);assert.equal(current.data.knowledge.filter(x=>x.id.startsWith('tax-')).length,7);
 const future=maintenance({asOf:'2025-01-01'});assert(future.data.queue.every(x=>x.status==='future'));
 const due=maintenance({asOf:'2028-01-01'});assert.equal(due.data.queue.length,due.data.knowledge.length+formatReviews.length);assert.equal(due.warnings[0].code,'MAINTENANCE_REVIEW_REQUIRED');
 const result=await operation('/not-a-vault','maintenance',{asOf:'2028-01-01'});assert.equal(result.outcome,'partial');assert.equal(result.data.roadmapStatus,'complete');assert.equal(result.data.platforms.filter(p=>p.status==='supported').length,1);assert.equal(result.data.platforms.find(p=>p.platform==='Windows native').status,'outside-release-scope');assert.equal(result.data.accessibility.status,'complete-for-release-scope');
});
test('maintenance references existing synthetic fixtures/tests and never promotes planned/live coverage',async()=>{
 for(const entry of formatReviews){await fs.access(new URL('../'+entry.fixture,import.meta.url));await fs.access(new URL('../'+entry.test,import.meta.url));}
 const r=maintenance({asOf:'2026-10-11'});assert(r.data.followUpCapabilities.some(c=>c.id==='ibkr-flex-reporting'&&c.status==='experimental'));assert(!r.data.releaseGates.some(c=>c.id==='read-only-connections'));assert.equal(r.data.providerScope.status,'complete-for-release-scope');assert.throws(()=>maintenance({asOf:'today'}),{code:'MISSING_INPUT'});
});
