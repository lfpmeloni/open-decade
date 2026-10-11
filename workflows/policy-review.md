# Policy, diagnosis and explicit scenarios

Use schema 2 and confirmed synthetic or user-supplied records. A policy has currency,
reserve-month target, issuer/institution weight limits, chosen liquid entity IDs,
asset-class bands, review date and rationale. No house thresholds are supplied.
Profile risk tolerance and capacity are separate, dated fields.

```bash
node bin/od.mjs profile preview --file /tmp/profile.json --json
node bin/od.mjs profile apply --file /tmp/profile.json --confirm DIGEST --json
node bin/od.mjs policy preview --file /tmp/policy.json --json
node bin/od.mjs policy apply --file /tmp/policy.json --confirm DIGEST --json
node bin/od.mjs policy show --as-of 2026-01-31 --json
node bin/od.mjs report diagnosis --from 2026-01-01 --as-of 2026-01-31 --policy POLICY_ID --json
node bin/od.mjs report debt-paydown --as-of 2026-01-31 --json
node bin/od.mjs report fee-drag --as-of 2026-01-31 --assumptions FEE_SCENARIO_ID --json
```

Preview/apply files are normalized schema-2 batches containing only the requested
profile or investment-policy kind. Show retains all active dated versions. Select
a policy explicitly if more than one exists. Bands must be nonoverlapping by name,
minimum ≤ maximum, with feasible total bounds. Liquid references must resolve to
recorded accounts/positions; missing values are never invented.

Diagnosis-v2 is a recorded-data review. Each finding includes input IDs,
method, policy ID/threshold, observed values, severity, remedy and limitations.
Sources and dates for those IDs are in report metadata. This review covers direct
recorded issuer and institution assignments; it does not infer fund look-through,
insurance coverage or beneficial ownership from missing metadata.

Reserve months divide user-selected liquid value **after confirmed goal earmarks**
by average confirmed essential monthly spending over complete months in the
requested window. Fractional claims protect their share once; claims above one make
available liquidity and reserve coverage unknown. Stale valuations, missing
classifications/history/currencies or zero spending prevent a reassuring reserve
result. Issuer/institution and allocation ratios use nonoverlapping recorded assets,
retaining unknown coverage. Goal findings show dated targets, assigned value,
unfunded amounts and conflicts using the shared goals-v3 method.

Obligation timelines deduct all active dated planned expenses from currently
unallocated liquid assets, in due-date order. Past-due items remain obligations
until explicitly corrected. Missing or stale expense FX makes the affected and
subsequent remaining-liquidity values unknown. The timeline assumes no future income;
reserve needs remain a separate finding rather than an automatic second allocation.

Independent example: liquid value 1000, a confirmed goal share of 50%, and complete
monthly essential spending of 100 leave 500 unallocated and five reserve months.
A goal target of 800 has a shortfall of 300. An unresolved past-due expense of 600
then leaves an obligation shortfall of 100. Adding a second whole-entity goal claim
makes liquidity and affected goal funding unavailable instead of counting money twice.

The review includes debt-term gaps, disclosed costs and dated profile
capacity/tolerance discrepancies. It provides no composite score or quantified tax
saving. Unknown inputs force an incomplete verdict; otherwise findings can require
attention or remain recorded items for review. Saved report history is available
through [local reviews](reviews.md). [Retirement and housing scenarios](life-planning.md)
use confirmed assumptions and preserve funding gaps. [Allocation drafts](allocation-plans.md) use explicit user targets and protect
recorded earmarks/reserves. An [opt-in household picture and cashflow](household.md)
and the pooled household showcase complete the bounded household scope.

Fee-drag scenarios explicitly supply initial capital, annual gross return, each
annual fee and years. Formula: initial × ((1 + gross return) × (1 − fee))^years.
Fees occur at year end; no taxes, contributions, withdrawal or execution costs are
modeled. Difference is a hypothetical value comparison, not a predicted saving.

Debt scenarios use full recorded debt, fixed nominal APR/12 and a supplied fixed
end-month payment, without new borrowing or fees. Monthly interest is balance ×
APR/12; payment is capped at balance plus interest. Non-amortizing payments or
missing terms produce unavailable payoff estimates. No currency rounding is applied;
actual lender accrual/payment conventions may differ. Each schedule is bounded to
1200 months and retains the user's separate responsibility share.

For a synthetic walkthrough, initialize a separate test vault with `init --schema 2`,
then preview and confirm [fixtures/planning.json](../fixtures/planning.json). It
contains explicitly illustrative policy preferences, spending and document questions;
its values are not recommendations. Report spending for January 2026, diagnosis as
of 2026-01-31 with `--from 2026-01-01 --policy policy`, and the DE 2025 tax checklist
as of 2026-10-09. Missing issuer/classification details deliberately remain visible.
