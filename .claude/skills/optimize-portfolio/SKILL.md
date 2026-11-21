---
name: optimize-portfolio
description: Build the user's optimized target portfolio from current assets and profile, with concrete trades, saved to data/target.json and a dated recommendation. Use for "optimize", "what should my portfolio look like", "rebalance".
---

# Optimize portfolio

Prerequisites: a recent review (run `portfolio-review` first if `data/attention.json` is missing or older than the latest holdings/prices).

1. Read `data/profile.md`, the snapshot (`node app/portfolio.mjs`) and `knowledge/methodology.md`.
2. Follow the **build sequence** in methodology.md step by step. Each step's output constrains the next. When willingness and ability to take risk disagree, use the more cautious one.
3. Express the target as asset-class weights (and symbol weights only where the user already holds or clearly wants a specific instrument). Weights sum to 1.
4. Derive trades from current → target. Prefer, in order: directing new money, using existing cash, selling the clearly worst positions. Flag taxes and fees of each sell as an open question unless known. Skip trades smaller than ~1% of the portfolio.
5. Write `data/target.json`:

```json
{"date": "YYYY-MM-DD", "base_currency": "USD", "method": "build-sequence v1: one-line summary of the key choices",
 "allocations": [{"key": "equity", "kind": "asset_class", "weight": 0.55, "rationale": "..."}],
 "trades": [{"symbol": "BND", "action": "buy", "amount": 4000, "currency": "USD", "why": "..."}]}
```

6. Save `data/recommendations/YYYY-MM-DD-target.md`: each sequence step with inputs and decision, the allocation table, trades, assumptions, and what would change the answer. Previous files are never edited (history).
7. Reply with the target in a few lines and the first 1–3 actions. Never execute trades; the user decides.
