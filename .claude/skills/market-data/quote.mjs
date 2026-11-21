#!/usr/bin/env node
// Refresh market prices for data/holdings.csv (+ FX pairs to the base currency).
// Usage: node .claude/skills/market-data/quote.mjs [SYMBOL[@provider] ...]
// Writes data/market/quotes.json (latest) and appends data/market/log.jsonl (history).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const data = process.env.OD_DATA || path.join(root, 'data');
const providersDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'providers');
const read = (f, d) => { try { return fs.readFileSync(path.join(data, f), 'utf8'); } catch { return d; } };

// Which symbols, grouped by provider.
const wanted = new Map(); // provider -> Set(symbols)
const add = (p, s) => (wanted.get(p) ?? wanted.set(p, new Set()).get(p)).add(s);
const args = process.argv.slice(2);
const base = (read('profile.md', '').match(/base currency:\s*([A-Z]{3})/i)?.[1] ?? 'USD').toUpperCase();
if (args.length) {
  for (const a of args) { const [s, p = 'yahoo'] = a.split('@'); add(p, s); }
} else {
  const [head, ...rows] = read('holdings.csv', '').trim().split(/\r?\n/).filter(Boolean);
  const keys = (head ?? '').split(',').map((k) => k.trim());
  for (const r of rows) {
    const h = Object.fromEntries(r.split(',').map((v, i) => [keys[i], v.trim()]));
    if (h.provider && h.provider !== 'manual') add(h.provider, h.symbol);
    if (h.currency && h.currency.toUpperCase() !== base) add('yahoo', `${h.currency.toUpperCase()}${base}=X`);
  }
}

const quotes = JSON.parse(read('market/quotes.json', '{}'));
fs.mkdirSync(path.join(data, 'market'), { recursive: true });
const log = fs.createWriteStream(path.join(data, 'market/log.jsonl'), { flags: 'a' });
const failed = [];
for (const [p, set] of wanted) {
  const file = path.join(providersDir, `${p}.mjs`);
  if (!fs.existsSync(file)) { failed.push(...[...set].map((s) => `${s}: no provider "${p}"`)); continue; }
  const provider = await import(file);
  for (const q of await provider.quote([...set])) {
    if (q.error) { failed.push(`${q.symbol}: ${q.error}`); continue; }
    quotes[q.symbol] = { price: q.price, currency: q.currency, ts: q.ts, source: provider.name };
    log.write(JSON.stringify({ ...q, source: provider.name, fetched: new Date().toISOString() }) + '\n');
  }
}
log.end();
fs.writeFileSync(path.join(data, 'market/quotes.json'), JSON.stringify(quotes, null, 2));
const ok = [...wanted.values()].reduce((n, s) => n + s.size, 0) - failed.length;
console.log(`Updated ${ok} quote(s) into data/market/quotes.json`);
if (failed.length) { console.log(`Failed:\n  ${failed.join('\n  ')}`); process.exitCode = 1; }
