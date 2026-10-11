# Confirmed spending and periodic cashflow

These features require schema 2. Import categories, classification rules, budgets
and recurring-payment records through the existing preview/apply pipeline. Rename
or disable them with immutable corrections. The [schema](../schemas/batch-v2.json)
owns exact shapes; all examples and tests use synthetic records.

```bash
node bin/od.mjs report spending --from 2026-01-01 --to 2026-03-31 --json
node bin/od.mjs report spending-proposals --from 2026-01-01 --to 2026-03-31 --json
node bin/od.mjs report bills --from 2026-04-01 --to 2026-12-31 --json
```

Categories have a user-confirmed essential, discretionary or unknown nature.
Transaction categorySplits use signed amounts summing exactly to the transaction.
The transaction retains one cash movement; splits do not create additional payments.
Optional exceptional and recurringId attributes are confirmed facts, not deductions.
A positive spending reversal can reference its original negative spending transaction
using refundOf. Total confirmed refunds cannot exceed the original amount. A refund
without its own splits inherits the original category proportions, with the refund
account's ownership share. Currency must match; no FX refund matching is inferred.

Reports show net spending by category and currency. Essential/discretionary,
exceptional and recurring views overlap deliberately and must not be added together.
Monthly cash savings rate is (income minus net spending and interest) / income.
Principal repayments, investments and transfers are excluded from that definition.
Zero/nonpositive income, missing history, incomplete months, unknown flows and
unmatched transfers/refunds leave the rate unavailable. Empty months are shown
with incomplete coverage rather than silently dropped. Budgets cover explicit date
intervals and cannot overlap for a category/currency. Missing classification or
history makes remaining budget unavailable.

Literal case-insensitive substring rules propose classifications only for unknown
transactions. Multiple matching rules produce an ambiguity warning. Recurrence
candidates need at least three same-description debits with successive 25–35-day
gaps; differing amounts are shown. Same-day payments are not deduplicated by this
heuristic. Refund candidates show equal opposite payments within 120 days on the
same account, without confirming a match. These windows are detection heuristics,
not financial policy. Confirm a correction or a recurring-payment record through
normal import; reports never apply classifications or create subscriptions.

The bill calendar expands confirmed monthly cadences and preserves the anchor day
across short months (31 January → 28 February → 31 March). It uses the supplied
amount, not an inferred future charge. No scheduler, external notification, payment
or subscription cancellation is installed.
