# Dated fee, reward and FX comparisons

These calculations compare **user-supplied dated quotes**. They fetch
no offers, establish no eligibility and rank no providers. Input order is preserved.
Every offer needs a source URL, source date, review-due date, eligibility status and
notes. A confirmed quote record is not independent verification of the source.
Future, stale, unknown or ineligible quotes retain their input facts but have no
computed comparison. Dates are report inputs, not automatic current-offer claims.

Import the [synthetic examples](../fixtures/comparisons.json) through normal
schema-2 preview/apply. The example.com references are fictional test metadata,
not evidence of actual available products.

```bash
node bin/od.mjs report fee-comparison --assumptions fee-example --as-of 2026-01-01 --json
node bin/od.mjs report fx-comparison --assumptions fx-example --as-of 2026-01-01 --json
```

CLI, browser Reports, agent tools, saved reviews and portable exports use the same
methods. Reports show raw assumptions and source metadata. Sharing is a separate
user action; these formats are not automatically redacted.

## Fee-comparison-v1

For a card, bank or broker **flat-plus-proportional fee model**, supply an annual
usage amount in the comparison currency, annual fixed fee, variable fee fraction,
reward fraction and annual reward cap. `annualRewardCap: null` explicitly means
uncapped. Rewards must be confirmed cash-equivalent values in that currency;
unconfirmed reward valuations withhold the comparison. Use zero reward and a zero
cap for a fee-only product. Do not encode a tiered/minimum transaction fee or points
redemption rule as a misleading flat percentage.

Annual net cost = annual fixed fee + usage × variable fee rate −
min(usage × reward rate, reward cap), with no minimum for an uncapped reward.
Differences compare the selected reference offer, retaining signed costs. A negative
modeled cost is not guaranteed profit. No credit interest, tax, one-time promotion,
noncash benefit, volume tier, transaction count or minimum trading fee is inferred.

Break-even amounts are piecewise linear solutions between reward-cap thresholds.
There may be multiple solutions or equal-cost intervals, including an unbounded
interval; the report does not invent one unique spending threshold. Arithmetic uses
120 guard digits and returns 40 significant digits. These are conditional annual
usage comparisons, not suitability decisions or a reason to increase spending.

Independent example: a no-fee 1% uncapped reward versus a fee of 100 with 2% rewards
capped at 300 has equal modeled costs at annual usage 10000 and 20000. At 30000,
net costs are −300 and −200 respectively. Unknown eligibility or stale terms makes
the corresponding comparison unavailable.

## FX-comparison-v1

Quotes state destination-currency units per source-currency unit. Fees are fixed
and proportional source-currency amounts deducted before conversion:

Destination amount = (source amount − fixed source fee − source amount × fee rate)
× destination-per-source rate.

Quotes whose fees exceed the source amount cannot produce a negative delivery;
the result is unavailable. Recipient/intermediary fees, delivery timing, limits and
future rate changes are not modeled unless already reflected in confirmed inputs.
This is not a payment route selection or a transfer instruction.

Independent example: source amount 1000, fixed fee 5, proportional fee 1%, and rate
1.1 yields 1083.5 destination units. A second route at 1.08 without fees yields 1080.
Both retain their own dates and eligibility; no affiliate score or ranking is added.

The supplied-quote acceptance gate passes independent integer fee/reward cases,
reward-cap boundaries, multiple break-even points, equality intervals, FX fee
exhaustion, unavailable eligibility/dates and immutable quote corrections. This
availability covers the formulas above; live offer discovery and broader product
fee structures remain outside this capability.
