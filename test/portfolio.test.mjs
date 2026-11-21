import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { parseCsv, snapshot, drift, readBaseCurrency } from '../app/portfolio.mjs';

test('CSV tolerates whitespace, blank lines and optional columns', () => {
  assert.deepEqual(parseCsv('  symbol, quantity,price\r\n A, 2, 0 \r\n\n B,3\n'), [
    { symbol: 'A', quantity: '2', price: '0' }, { symbol: 'B', quantity: '3', price: '' }
  ]);
  assert.deepEqual(parseCsv(' \n'), []);
  assert.equal(readBaseCurrency('Base Currency: eur'), 'EUR');
  assert.equal(readBaseCurrency('Profile'), 'USD');
});

test('snapshot uses market, manual and missing prices; stale flags and drift', () => {
  const holdings = parseCsv(`symbol,quantity,currency,asset_class,account,price,price_date
A,2,USD,equity,broker,99,2026-01-01
B,3,USD,bond,bank,10,2026-11-20
C,1,USD,equity,broker,,
ZERO,1,USD,cash,bank,0,2026-11-20`);
  const snap = snapshot({ holdings, quotes: { A: { price: 20, currency: 'USD', ts: '2026-11-01' } }, baseCurrency: 'USD', now: new Date('2026-11-21') });
  assert.equal(snap.total, 70);
  assert.deepEqual(snap.positions.map(p => p.priceSource), ['market', 'manual', 'none', 'manual']);
  assert.deepEqual(snap.positions.map(p => p.stale), [true, false, false, false]);
  assert.equal(snap.positions[0].priceDate, '2026-11-01');
  assert.equal(snap.positions[0].valueBase, 40);
  assert.equal(snap.positions[2].value, null);
  assert.equal(snap.positions[2].weight, 0);
  assert.deepEqual(snap.missing, ['C']);
  assert.deepEqual(snap.byClass[0], { asset_class: 'equity', value: 40, weight: 40 / 70 });
  assert.deepEqual(snap.byCurrency, [{ currency: 'USD', value: 70, weight: 1 }]);
  const result = drift(snap, { allocations: [{ key: 'equity', kind: 'asset_class', weight: 0.5 }, { key: 'B', kind: 'symbol', weight: 0.2 }] });
  assert.deepEqual(result[0], { key: 'equity', kind: 'asset_class', current: 40 / 70, target: 0.5, diff: 40 / 70 - 0.5 });
  assert.equal(result[1].current, 30 / 70);
  assert.deepEqual(drift(snap, null), []);
  assert.equal(snapshot({ holdings: [] }).total, 0);
});

test('FX converts directly and inversely and excludes missing FX', () => {
  const holdings = parseCsv('symbol,quantity,currency,price,asset_class\nA,2,EUR,10,equity\nB,1,GBP,8,bond\nC,1,JPY,100,equity');
  const snap = snapshot({ holdings, baseCurrency: 'USD', quotes: { 'EURUSD=X': { price: 1.5 }, 'USDGBP=X': { price: 0.5 } } });
  assert.equal(snap.total, 46);
  assert.deepEqual(snap.positions.map(p => p.valueBase), [30, 16, null]);
  assert.deepEqual(snap.missing, ['C']);
  assert.equal(snap.byCurrency[0].value, 30);
  assert.equal(snap.positions[0].weight, 30 / 46);
});

test('server state, chat SSE, persistence, resume and validation', { timeout: 15000 }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'od-test-'));
  const data = path.join(dir, 'data');
  const fake = path.join(dir, 'fake-claude');
  fs.writeFileSync(fake, `#!/usr/bin/env node
const args = process.argv.slice(2);
if (!args.includes('--output-format') || !args.includes('stream-json')) process.exit(2);
if (args[1] === 'again' && args.at(-1) !== 'session-123') process.exit(3);
const emit = value => console.log(JSON.stringify(value));
emit({type:'system',subtype:'init',session_id:'session-123'});
emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:'Hello'}}});
emit({type:'assistant',message:{content:[{type:'tool_use',name:'Read',input:{file_path:'data/profile.md'}}]}});
setTimeout(() => emit({type:'result',result:'Hello world',session_id:'session-123'}), 200);
`, { mode: 0o755 });
  const child = spawn(process.execPath, ['app/server.mjs'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: '0', OD_DATA: data, CLAUDE_BIN: fake }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode === null) { child.kill(); await once(child, 'close'); } fs.rmSync(dir, { recursive: true, force: true }); });
  const base = await new Promise((resolve, reject) => {
    let out = '', err = '';
    child.stderr.on('data', chunk => { err += chunk; });
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`server exited ${code}: ${err}`)));
    child.stdout.on('data', chunk => { out += chunk; const match = out.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) resolve(match[0]); });
  });
  const request = (route, method, body) => fetch(base + route, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.ok(fs.existsSync(path.join(data, 'profile.md')));
  for (const folder of ['market', 'chats', 'recommendations']) assert.ok(fs.statSync(path.join(data, folder)).isDirectory());
  await request('/api/profile', 'PUT', { markdown: '# Me\nBase currency: EUR' });
  await request('/api/holdings', 'PUT', { csv: 'symbol,quantity,currency,asset_class,price\nA,2,EUR,equity,10' });
  fs.writeFileSync(path.join(data, 'market/quotes.json'), JSON.stringify({ A: { price: 12, ts: '2026-11-21T00:00:00Z' } }));
  fs.writeFileSync(path.join(data, 'recommendations/2026-11-21-review.md'), '# Review\nAnalysis');
  const state = await (await request('/api/state')).json();
  assert.equal(state.snapshot.total, 24);
  assert.equal(state.snapshot.baseCurrency, 'EUR');
  assert.equal(state.quotesUpdated, '2026-11-21T00:00:00Z');
  assert.equal(state.recommendations[0].title, 'Review');
  assert.deepEqual(state.attention, []);
  assert.equal(state.busy, false);
  const response = await request('/api/chat', 'POST', { text: 'hello' });
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const reader = response.body.getReader();
  let stream = new TextDecoder().decode((await reader.read()).value);
  assert.match(stream, /^event: chat/);
  assert.equal((await (await request('/api/state')).json()).busy, true);
  assert.equal((await request('/api/chat', 'POST', { text: 'busy' })).status, 409);
  while (true) { const { value, done } = await reader.read(); if (done) break; stream += new TextDecoder().decode(value); }
  const events = stream.trim().split('\n\n').map(block => { const [name, line] = block.split('\n'); return { name: name.slice(7), data: JSON.parse(line.slice(6)) }; });
  assert.deepEqual(events.map(e => e.name), ['chat', 'delta', 'tool', 'done']);
  const id = events[0].data.id;
  assert.deepEqual(events[1].data, { text: 'Hello' });
  assert.deepEqual(events[2].data, { name: 'Read', detail: 'data/profile.md' });
  assert.deepEqual(events[3].data, { id, text: 'Hello world' });
  const chat = await (await request(`/api/chats/${id}`)).json();
  assert.equal(chat.claude_session_id, 'session-123');
  assert.deepEqual(chat.messages.map(m => m.text), ['hello', 'Hello world']);
  assert.match(await (await request('/api/chat', 'POST', { id, text: 'again' })).text(), /event: done/);
  assert.equal((await (await request('/api/chats')).json())[0].id, id);
  assert.equal((await request('/api/chat', 'POST', { id: '../bad', text: 'x' })).status, 400);
  assert.equal((await request('/api/chats/' + id, 'DELETE')).status, 200);
  assert.equal((await request('/api/chats/' + id)).status, 404);
});
