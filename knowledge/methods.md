# Offline methods, version 1

Reviewed 2026-10-08. These are project analytical choices implemented by pure local
calculations over confirmed user-supplied records. No financial or market data is
fetched. Each report carries input IDs/dates, software/method version, coverage,
and unavailable conclusions. Record provenance supplies source, quality and capture
time. Reproductions need the same corrected journal, explicit options and pinned
runtime. Arithmetic uses 40 significant decimal digits, half-even rounding;
fractions are returned without percentage formatting. Simulation uses 60-digit
guard precision internally and rounds terminal values, targets and shortfalls to
40 significant digits before success comparisons. A withdrawal deficit that is
zero at the 40-digit comparison precision is treated as numerical roundoff.
No intermediate currency
rounding is imposed. Independent examples live in
[expectations](../fixtures/expectations.json) and acceptance tests.

## Financial picture, cashflow, reconciliation and goals

Purpose: describe recorded assets, obligations, flows and goal allocations.
Net worth = sum(asset value × ownership) − sum(positive obligation × responsibility).
For an entity at date d, select its latest end-of-day observation at or before d,
then add explicitly applicable deltas after that observation through d. A newer
snapshot replaces the prior baseline; it never adds another asset. Transactions
alone cannot price securities. Unobserved price changes are flagged for positions.

Aggregate accounts exclude their positions; holdings accounts exclude the aggregate
and require cash to be a position. Unresolved overlap is excluded and flagged.
Goals sum only explicitly selected entities; allocations cannot substitute an
excluded account aggregate for holdings. Cross-goal earmarking can overlap: goals
are separate scenarios, not a reservation ledger. Missing inputs never establish
that a goal is funded. Negative derived balances are flagged and excluded.

FX uses the latest supplied direct or inverse pair at/before the report date;
there is no triangulation or future-rate lookahead. Missing FX preserves currency
subtotals and prevents a combined net-worth conclusion. Known subtotal values can
still be partial. Values/FX/fund data older than 90 days get a project-chosen stale
warning; 90 days is a reporting threshold, not a universal appraisal standard.

History completeness must be expressly recorded. Roll-forward without covered
history is partial. Direct non-account assets and liabilities have no account-wide
history assertion; their older snapshots remain partial. Cashflow sums signed
transactions by currency and classification, adjusted by account ownership.
Transfers are excluded from income/spending only with an explicit shared transfer
ID, two distinct accounts, same currency and zero ownership-adjusted sum within
the reporting window. Cross-currency or incomplete matches remain unknown.
Principal reduces cash and debt separately; interest is an expense category.

Reconciliation compares each pair of observations against opening value plus
recorded intervening events, producing closing − expected. A discrepancy can be
missing transactions, price movement or another coverage difference; it is not an
automatic balancing transaction. Goals compare explicitly allocated, converted,
owned net values with recorded targets; no return forecast is inferred.

Sources: [record invariants](../docs/architecture.md#financial-records-and-invariants)
and the version 1 contract. Applicability: recorded local financial picture, not
accounting certification, tax reporting or execution advice.

## Exposure

Purpose: look through recorded positions using supplied dated fund constituents.
Exposure value = position owned value × each constituent weight along its fund
path; sum by issuer, country, sector, asset class and economic currency separately.
Divide by the recorded valued-position total for a weight. Account aggregates are
not included. Missing position values make portfolio coverage partial. With absent
FX, retain separate currency groups rather than synthesizing a combined allocation.
Economic currency is never inferred from trading/valuation currency.

Fund identity must distinguish share classes. Latest applicable fund data is used;
missing metadata and residual weight go to unknown separately for every dimension.
Nested funds are traversed; cycles, depth above 64 and traversal beyond 10,000
nodes per currency become unknown with a warning. This bounds adversarial work.
Unknown does not establish diversification. Country/sector/issuer classifications
are supplied facts or estimates, not looked up. Source: project weighted-sum method;
independent example: 600 × 60% plus 400 directly = 760/1000 = 76% X, 24% unknown.

## Costs

Purpose: summarize disclosed ongoing charges, not all costs of ownership.
Annual constant-value estimate = sum(owned position value × disclosed annual rate).
Weighted disclosed rate = estimate / all valued positions; coverage = positions
with disclosed rates / all valued positions. The separately returned covered-only
rate divides by covered value. Missing disclosure is not a zero-cost claim.
Other recorded charges remain separate disclosures, without guessed recurrence or
nested-fund additions that might double count already disclosed charges.

Operating expenses and shareholder/intermediary charges are distinct, and fund
expenses already affect observed fund value. Accordingly this method does not
subtract them again from observed performance. Source:
[SEC mutual fund and ETF fee bulletin](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/mutual-fund-and-etf-fees-and-expenses-investor-bulletin).
Example: 60% × 0.20% + 40% × 0.50% = 0.32%. Constant market value and unchanged
fee disclosures are estimates, not a bill or forecast of total costs.

## Performance

Purpose: cash profit and exact flow-segmented time-weighted return for one account.
Require end-of-day opening/closing observations, explicit external-flow flags for
all intervening transactions, and complete external-flow history.
Cash profit = ending value − opening value − sum(signed external contributions).
Profit remains unavailable without complete endpoints and flow coverage.

For each external flow, require before/after valuations with after = before + flow.
TWR = product(segment ending value / segment starting value) − 1, joining segments
at those flow boundaries. Multiple external flows on one date lack intraday order
in schema 1 and make TWR unavailable. Missing boundaries or nonpositive starting
values prevent a return conclusion. No interpolation or approximate Modified Dietz
fallback. Annualized return = (1 + TWR)^(365 / elapsed days) − 1 only when elapsed
days ≥ 365. Account-level values are gross recorded values; no extra fee deduction.

[CFA Institute GIPS handbook](https://www.gipsstandards.org/standards/gips-standards-for-firms/gips-standards-handbook-for-firms/)
describes geometric linking of subperiod returns and valuations around external
flows. The local method is not a claim of GIPS compliance. Example: 100 → 110,
+50 gives 160; 160 → 176: 1.1 × 1.1 − 1 = 21%, profit 176 − 100 − 50 = 26.

## Goal scenarios and Monte Carlo

Purpose: conditional outcomes under explicitly supplied assumptions. Scenario
monthly factor g = (1 + annual effective return)^(1/12). For each month,
V = max(0, previous V × g + fixed nominal end-month contribution). Negative
contributions are withdrawals; accumulate each unfunded deficit without borrowing.
Real terminal value = nominal value / (1 + inflation)^(months/12). Target is in
today's currency and inflated by the same factor; success also requires no unfunded
withdrawals. Returns must be supplied net of fees. No tax, changing contributions,
asset allocation, correlations or market forecast is assumed.

Monte Carlo uses exp((ln(1+r) − σ²/2)/12 + σ Z/√12) for monthly growth, so expected
annual growth is 1+r before contributions. GBM's lognormal construction is described
by [MathWorks](https://www.mathworks.com/help/finance/gbm.html). Project choices:
[PCG32 XSH-RR](https://www.pcg-random.org/download.html) v1 with 64-bit multiplier 6364136223846793005 and increment 109;
initial state zero, advance, add seed, advance. Uniforms (u32+0.5)/2^32 feed paired
Box–Muller normals (cosine first, sine cached). Pinned Node Math log/sin/cos/exp
uses binary64 for random growth factors; account accumulation uses decimal.js.
Reproducibility is scoped to the pinned runtime, not bit-identical arbitrary engines.

Default paths = 10,000; seed = 1. Financial assumptions have no defaults. Zero
volatility reuses the deterministic decimal path exactly. Terminal percentiles use
nearest rank ceil(p×N); success and withdrawal-shortfall frequencies divide counts
by N. Mean unfunded withdrawals is nominal and undiscounted. Limits: 1,200 months,
100,000 paths, twelve million total monthly steps; numeric overflow is a failure.
Independent example: initial 100, twelve end-month deposits of 10 and zero return/
volatility yields 220 in every path. A stochastic model omits regime changes and
tail risks; empirical frequencies are conditional simulation results, not promises.

## Goal funding and allocation drafts

[Goal funding and allocation methods](../workflows/allocation-plans.md) own goals-v3
and allocation-plan-v1. Optional confirmed fractions replace whole-entity claims
only when explicitly supplied. Corrected aliases cannot bypass total-claim checks.
Overclaims remain unresolved; no financial records or orders are changed by a draft.

## Retirement and housing method ownership

`retirement-v2` and `housing-v2` are specified in the
[life-planning method](../workflows/life-planning.md). They use explicit confirmed
scenario assumptions, monthly cashflows, supplied sensitivity cases and retained
funding shortfalls. They do not reuse recorded asset balances as implicit initial
capital or change goal allocations. The owning method states guard precision,
numerical-noise handling, dates, mortgage conventions and comparison limitations.

## Household and quote comparison method ownership

[Household-v1](../workflows/household.md) applies explicit gross-value shares without
changing personal reports. Member tax routing keeps contexts/documents separate.
[Fee-comparison-v1 and FX-comparison-v1](../workflows/comparisons.md) own annual
fee/reward break-even and source-fee conversion formulas, date/eligibility gates
and unmodeled costs. These are conditional comparisons of supplied quotes.

Official rate/inflation evidence follows [economic-data vintage rules](../workflows/economic-data.md); it never supplies automatic forecasts. Named-provider intake follows [format-specific scope](../workflows/provider-imports.md). Household cashflow follows the [gross-share household method](../workflows/household.md), preserving separate personal tax contexts.

[Read-only reporting connections](../workflows/connections.md) supply proposals, never automatic financial facts or completeness claims.

## Consolidated diagnosis method ownership

[Diagnosis-v2](../workflows/policy-review.md) combines recorded direct exposure,
confirmed essential spending, goal-protected liquid assets, dated obligations,
disclosed costs and goal funding. Findings cite their inputs and chosen policy;
overdue obligations and unresolved coverage remain visible. It uses goals-v3 rather
than an independent allocation calculation. Missing evidence prevents reassurance.

[Household-scenario-v1](../workflows/household.md) binds one pooled confirmed
retirement-v2 scenario to effective opt-in household participation. It does not
automatically add member capital, reserve recorded assets or merge tax contexts.
