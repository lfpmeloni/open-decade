// Yahoo Finance public chart endpoint. No API key. Global coverage via suffixes:
// US "VT", London "VWRA.L", São Paulo "PETR4.SA", Frankfurt "SAP.DE", Tokyo "7203.T",
// FX "EURUSD=X", crypto "BTC-USD". Unofficial endpoint: may change or rate-limit.
export const name = 'yahoo';
export const covers = 'Stocks, ETFs, FX and crypto on most global exchanges (Yahoo symbols).';

export async function quote(symbols, fetchFn = fetch) {
  const out = [];
  for (const symbol of symbols) {
    try {
      const res = await fetchFn(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`, {
        headers: { 'user-agent': 'Mozilla/5.0 open-decade' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const meta = (await res.json()).chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) throw new Error('no price');
      out.push({ symbol, price: meta.regularMarketPrice, currency: meta.currency,
        ts: new Date((meta.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString() });
    } catch (e) {
      out.push({ symbol, error: e.message });
    }
  }
  return out;
}
