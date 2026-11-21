export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];
  const cells = line => line.split(',').map(s => s.trim());
  const keys = cells(lines.shift());
  return lines.map(line => Object.fromEntries(keys.map((key, i) => [key, cells(line)[i] ?? ''])));
}
export const readBaseCurrency = text => text.match(/base currency:\s*([A-Z]{3})/i)?.[1].toUpperCase() || 'USD';
const numeric = n => n !== '' && n != null && Number.isFinite(Number(n));
export function snapshot({ holdings = [], quotes = {}, baseCurrency = 'USD', now = new Date(), staleDays = 7 }) {
  const missing = new Set();
  const positions = holdings.map(h => {
    const q = quotes[h.symbol];
    const priceSource = numeric(q?.price) ? 'market' : numeric(h.price) ? 'manual' : 'none';
    const price = priceSource === 'none' ? null : Number(priceSource === 'market' ? q.price : h.price);
    const currency = (priceSource === 'market' && q.currency) || h.currency || baseCurrency;
    const priceDate = (priceSource === 'market' ? q.ts : h.price_date) || null;
    const direct = quotes[`${currency}${baseCurrency}=X`]?.price;
    const inverse = quotes[`${baseCurrency}${currency}=X`]?.price;
    const fx = currency === baseCurrency ? 1 : numeric(direct) && Number(direct) > 0 ? Number(direct)
      : numeric(inverse) && Number(inverse) > 0 ? 1 / Number(inverse) : null;
    const quantity = Number(h.quantity) || 0;
    const value = price === null ? null : quantity * price;
    const valueBase = value === null || fx === null ? null : value * fx;
    if (valueBase === null) missing.add(h.symbol);
    return { symbol: h.symbol, account: h.account, asset_class: h.asset_class, quantity, currency, price, priceSource,
      priceDate, value, valueBase, weight: 0, stale: !!priceDate && new Date(now) - new Date(priceDate) > staleDays * 86400000 };
  });
  const total = positions.reduce((sum, p) => sum + (p.valueBase ?? 0), 0);
  for (const p of positions) p.weight = total ? (p.valueBase ?? 0) / total : 0;
  const group = key => {
    const sums = new Map();
    for (const p of positions) if (p.valueBase !== null) sums.set(p[key], (sums.get(p[key]) || 0) + p.valueBase);
    return [...sums].map(([name, value]) => ({ [key]: name, value, weight: total ? value / total : 0 }));
  };
  return { baseCurrency, total, positions, byClass: group('asset_class'), byCurrency: group('currency'), missing: [...missing] };
}
export function drift(snap, target) {
  return (target?.allocations || []).map(({ key, kind, weight }) => {
    const current = snap.positions.reduce((sum, p) => sum + (p[kind === 'symbol' ? 'symbol' : 'asset_class'] === key ? p.weight : 0), 0);
    return { key, kind, current, target: weight, diff: current - weight };
  });
}

// CLI: `node app/portfolio.mjs` prints the current snapshot (+ drift vs target) as JSON for the agent.
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('node:fs');
  const dir = process.env.OD_DATA || new URL('../data/', import.meta.url).pathname;
  const read = (f, d = '') => { try { return fs.readFileSync(`${dir}/${f}`, 'utf8'); } catch { return d; } };
  const snap = snapshot({ holdings: parseCsv(read('holdings.csv')), quotes: JSON.parse(read('market/quotes.json', '{}')),
    baseCurrency: readBaseCurrency(read('profile.md')) });
  const target = JSON.parse(read('target.json', 'null'));
  console.log(JSON.stringify({ asOf: new Date().toISOString(), ...snap, drift: drift(snap, target) }, null, 2));
}
