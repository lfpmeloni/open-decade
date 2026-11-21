// Contract test for every market-data provider. Network is mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dir = new URL('../.claude/skills/market-data/providers/', import.meta.url);

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.mjs'))) {
  test(`provider ${file} follows the contract`, async () => {
    const p = await import(new URL(file, dir));
    assert.equal(typeof p.name, 'string');
    assert.equal(typeof p.covers, 'string');
    assert.equal(typeof p.quote, 'function');
    const failing = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const [r] = await p.quote(['X'], failing);
    assert.equal(r.symbol, 'X');
    assert.ok(r.error, 'a failed symbol returns {symbol, error} instead of throwing');
  });
}

test('yahoo parses a chart response', async () => {
  const { quote } = await import(new URL('yahoo.mjs', dir));
  const fake = async () => ({ ok: true, json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: 101.5, currency: 'USD', regularMarketTime: 1763740800 } }] } }) });
  const [r] = await quote(['VT'], fake);
  assert.deepEqual(r, { symbol: 'VT', price: 101.5, currency: 'USD', ts: '2025-11-21T16:00:00.000Z' });
});
