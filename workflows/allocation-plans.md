# Goal fractions and allocation drafts

Use confirmed schema-2 records through the normal import preview/apply workflow.
The [synthetic fixture](../fixtures/allocation-plan.json) demonstrates two goals
sharing an asset and an explicit policy-based draft. Its values and weights are
illustrations, not recommended preferences.

```bash
node bin/od.mjs import preview --file fixtures/allocation-plan.json --json
node bin/od.mjs import apply --file fixtures/allocation-plan.json --confirm DIGEST --json
node bin/od.mjs report goals --as-of 2026-01-01 --json
node bin/od.mjs report allocation-plan --as-of 2026-01-01 --assumptions allocation-example --json
```

The browser Reports page accepts the same assumptions ID. MCP reports, saved
reviews and exports call the identical operations. No operation places orders.

## Goal funding, goals-v3

An optional goal `allocations` array assigns `{entityId, share}` to every listed
`entityIds` entry exactly once. Shares are fractions of the user's owned value,
not fractions of the asset's gross value. A liability assignment similarly uses
its responsibility share and subtracts that amount. With no allocations array,
legacy goals continue to claim 100% of each listed entity. Nothing is guessed or
rewritten during schema migration.

Resolve corrected IDs before matching and summing claims. Explicit allocations
cannot repeat aliases. When total assigned shares exceed one, affected goals have
unavailable funding/progress and identify conflicting goals. This also applies to
mixed legacy and fractional goals. Fractions are bounded to 80 characters; share
checks use 120-digit guard precision so a tiny overclaim cannot disappear at the
40-digit result precision. Missing values, account/holding coverage or FX remain
visible. Same-day valuation, ownership and dated conversion use the existing
financial-picture method. Unfunded target is max(0, target minus recorded funding).

Example: an owned value of 800 assigned 25% and 50% funds separate goals with 200
and 400, leaving 200 unassigned. Targets, not just allocated values, remain visible.
These assignments are accounting intentions, not transfers or segregated accounts.

## Allocation-plan-v1

An `allocation-plan` names a policy, selected asset entities, currency, contribution,
mode and an exact target weight for every policy asset class. Weights must sum to
one and fall inside their selected policy bands. There is no default midpoint or
house portfolio. Scope is the selected investable portfolio, which may differ from
the all-assets scope of diagnosis. Selected entities need recorded asset classes;
an unclassified aggregate account is unavailable rather than classified as cash.

Goal-assigned portions are protected and removed from investable values. Every
policy liquid entity is excluded from the investable scope, even if reserve needs
are smaller than its balance. Free liquid value also excludes goal-assigned portions.
This prevents a goal earmark from being counted again as a reserve.

Reserve need is the confirmed `monthlyEssentialSpending` assumption multiplied by
the policy's reserve-month target. All recorded planned expenses, including past
dates, are added at dated report FX; a date passing does not prove an expense was
paid. Correct fulfilled/cancelled expense records explicitly, for example to amount
zero. Unknown/stale FX, missing/stale valuations or histories, overclaimed goals,
an expired policy, reserve/scope overlap or insufficient liquid coverage withhold
the draft's rows. Reported values and unmet obligations remain available for review.

The contribution must be explicitly declared `external-unallocated`, with
`needsReviewed: true`. These are confirmed user assumptions, not verification of an
external balance or proof that all obligations are recorded. It is not taken from
an account or counted toward liquid reserve coverage. Unfunded goal targets remain
listed and trigger a review warning; the draft does not automatically fund them.
Check these goals before acting on any allocation illustration.

For current investable class values C, contribution A and supplied target weights W:

- Post-contribution total T = sum(C) + A.
- Target class value = T × W.
- Rebalance mode: draft change = target value − C. Negative means a proposed
  reduction of the class, not a security order.
- Contribution mode: positive deficit = max(0, target value − C). Allocate A in
  proportion to these deficits, capping each at remaining budget and assigning the
  final arithmetic residual to the last positive deficit. No sales occur.

Report post-draft weights and whether each lies in its policy band. Contribution
mode can leave overweight classes outside their bands, which is explicitly warned
about. Nothing states that a trade is suitable or cost-effective. Prices, fees,
taxes, execution constraints, instruments and quantities are not inferred.

Independent example without earmarks: equity 800, bonds 200, contribution 200 and
explicit 50/50 targets produce rebalance changes −200/+400. Contribution-only uses
0/+200 and retains an equity weight of two thirds, outside a 40–60% band. Both use
exactly the supplied contribution; no money moves. With 25% of equity earmarked for
goals, investable values become 600/200 and rebalance changes become −100/+300.
