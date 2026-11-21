# Investment methodology (v1)

Shared, versioned house method. Improve it by pull request; every analysis cites the version it used.

## Principles

- **Decades, not quarters.** Optimize for the user reaching their goals, not for beating a benchmark this year.
- **Diagnose before prescribing.** Measure the current portfolio before proposing a new one.
- **Cost matters as much as return.** Fees and taxes are certain; returns are not.
- **Real diversification.** Across asset classes, issuers, institutions and currencies — not many funds holding the same thing.
- **Same inputs, same portfolio.** The build sequence is deterministic; judgment shows up as written assumptions.
- **Dated facts.** Every price, rate and conclusion carries its date. A stale value is never treated as current.

## Build sequence

Each step uses the previous step's output. Do not skip steps; if data is missing, state the assumption.

1. **Liquidity reserve** — 6 months of expenses (3 if income is very stable and there are no dependents, 12 if self-employed or income is volatile) in instruments available within days with no loss of principal. Comes out first.
2. **Planned expenses** — money needed within 5 years stays in low-risk instruments that mature or are liquid by the date needed, in the currency it will be spent in.
3. **Debt** — debt costing more than the expected real return of a balanced portfolio (rule of thumb: above ~6% real) is paid before investing more.
4. **Horizon** — what remains is long-term money. Horizon = years until it is needed.
5. **Risk ability** — capacity to absorb losses: horizon, income stability, dependents, size of the portfolio relative to annual income.
6. **Risk appetite** — what the user says they can tolerate. **Use the lower of ability and appetite.**
7. **Illiquid / alternative assets** — real estate funds, private stakes, crypto, gold: cap combined at 10–15% unless the profile justifies more; crypto ≤ 5% by default.
8. **Currency split** — hold long-term money in the currencies of future spending; for users in volatile-currency countries, keep a meaningful hard-currency share (typically 20–50%).
9. **Long-term mix** — equity share by risk level (on long-term money): low 20–35%, medium 40–60%, high 65–85%; remainder high-quality fixed income. Prefer broad, low-cost index funds.
10. **Implementation** — map the target to the user's existing instruments first; replace an instrument only when the cost/quality gain beats taxes and fees of switching.

## Risk buckets (what an asset is, not recent prices)

| bucket | examples | typical 1-year loss chance / worst drawdown |
|---|---|---|
| safe | cash, money market, short government bills | ~0% / ~0% |
| moderate | government and investment-grade bonds, inflation-linked bonds | low / 5–20% |
| volatile | equities, REITs, crypto, commodities | high / 30%+ |

## Attention checks

| check | flag when |
|---|---|
| Data freshness | any price older than 7 days, missing price or missing FX |
| Missing profile info | base currency, expenses, horizon or risk appetite unknown |
| Reserve | safe-bucket assets < reserve target (step 1) |
| Planned expenses | money needed in < 5 years sits in volatile assets |
| Concentration — position | a single non-diversified security > 5% of portfolio (broad index funds exempt) |
| Concentration — institution | more than the local deposit-insurance limit at one bank, or most assets at one broker |
| Asset-class drift | class weight differs from target by > 5 percentage points |
| Currency | currency mix far from where money will be spent |
| Illiquids / crypto | above the caps in step 7 |
| Costs | fund expense ratio > 0.5%/yr where a cheaper equivalent exists; idle cash beyond the reserve |
| Debt | expensive debt while investing |

## How to explain

- **Level 1 (default):** the answer plus its single most important reason, in a short paragraph.
- **Level 2 (when asked):** the mechanism and numbers behind it.
- **Level 3 (when asked):** full method, assumptions and sources.
Offer one level deeper at most once. The aim is a plan the user understands and sticks with.
