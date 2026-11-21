---
name: contribute
description: Extend the open-decade framework (new market-data provider for an exchange/country/asset type, or a new skill) and prepare it as a pull request. Use when a symbol/market is not covered or the user wants to improve the framework.
---

# Contribute to the framework

Framework = everything tracked by git. Personal data = `data/` (gitignored). Contributions
must never contain anything from `data/`, account names, amounts, or API keys.

## Add a market-data provider

1. Copy `.claude/skills/market-data/providers/yahoo.mjs` to `providers/<name>.mjs` (lowercase, e.g. `tsx`, `coingecko`).
2. Export `name`, `covers` (one sentence), and `async quote(symbols, fetchFn = fetch)` returning
   `[{symbol, price, currency, ts}]` or `{symbol, error}` per symbol. Never throw for one bad symbol.
   Prefer free, keyless, official sources. If a key is unavoidable read it from `process.env.<NAME>_API_KEY` and document it; never hard-code it.
3. Add one row to the provider table in `.claude/skills/market-data/SKILL.md`.
4. Add a test in `test/providers.test.mjs` that calls `quote` with a mocked `fetchFn` (no network in tests).
5. `npm test`, then try it for real: `node .claude/skills/market-data/quote.mjs SYMBOL@<name>`.
6. Set the holding's `provider` column to `<name>` in `data/holdings.csv`.

## Add or improve a skill / knowledge

Skills live in `.claude/skills/<name>/SKILL.md` (frontmatter `name` + `description` saying when to use it). Keep them short, generic (any country/user) and write results only into `data/`. Shared investing knowledge goes in `knowledge/`.

## Open the pull request

1. `git status` — confirm only framework files changed; `data/` must not appear.
2. `git checkout -b contrib/<short-name>`, commit with a clear message.
3. If the user has the GitHub CLI and a fork: `gh pr create --fill` against `lfpmeloni/open-decade`; otherwise explain how to push a fork and open the PR in the browser.
Ask the user before committing or pushing. The maintainer reviews, tests and ships accepted changes in a new release; users get it with `git pull`.
