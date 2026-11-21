---
name: market-data
description: Fetch live market prices and FX rates for the user's holdings or any symbol, and store them in data/market/. Use when prices are needed, stale, or the user asks about a quote.
---

# Market data

Run from the repo root:

- All holdings (+ FX to base currency): `node .claude/skills/market-data/quote.mjs`
- Specific symbols: `node .claude/skills/market-data/quote.mjs VT PETR4.SA EURUSD=X` (append `@provider` to pick one, default `yahoo`)

Results: `data/market/quotes.json` (latest, keyed by symbol) and `data/market/log.jsonl` (every reading, never edited).

## Providers (`providers/*.mjs`)

| provider | covers |
|---|---|
| `yahoo` | Stocks, ETFs, FX, crypto on most global exchanges. Suffixes: `.L` London, `.SA` B3, `.DE` Xetra, `.PA` Paris, `.T` Tokyo, `.TO` Toronto; FX `EURUSD=X`; crypto `BTC-USD`. |
| `manual` | Not fetched — uses `price`/`price_date` from holdings.csv. |

A holding's `provider` column picks the provider. If a symbol fails, try the right
suffix, then WebSearch for the official price and tell the user it is a manual
reading (write it to holdings.csv `price`/`price_date`). If the user needs an
exchange or asset type no provider covers, use the `contribute` skill to add one.

Never invent prices. Always state the quote date when you use a price.
