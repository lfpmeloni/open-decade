# Schema 2 and recovery contracts

The [schema](../schemas/batch-v2.json) extends [schema 1](contracts.md). Schema-1
journal entries and IDs are never rewritten. Migration is explicit, backup-bound,
and writes a separate destination. The vault marker governs allowed batch versions;
version-1 software rejects version-2 vaults before writing. New software reads both.
The report and CLI envelope remain contract version 1.

Additional fields include account institution references and wrappers, position
identifiers with scheme/market and explicit instrument type, observation quantities,
unit prices and acquisition costs, transaction event type and settlement date,
and provenance rawReference. Raw references are inert labels, not paths to open.
Identifiers are metadata; they never substitute for immutable internal record IDs.
Unknown and other instruments are retained with unresolved-activity warnings.

New immutable kinds: institution, dated profile, trade and corporate-action.
Trades reference an account and its position, with positive quantity, unit price,
currency, optional fees/settlement and an optional recorded cash transaction link.
Corporate actions retain descriptions and optional before/after quantities; the
runtime does not automatically derive adjusted holdings, acquisition costs or tax
lots. Trades and actions alone do not change monetary reports: supply confirmed
transactions and reconciled observations. Missing links/actions remain warned about.
Dividend and fee cashflows use transaction eventType plus an explicit classification.

Profiles preserve effective dates, residences, currency and separate risk tolerance
and capacity. No residence or tax conclusion is inferred from an account or language.
Older profiles remain in history; corrections use the same supersedes mechanism.

`report readiness --as-of DATE` lists missing institution/wrapper data, history,
identifiers, quantities and acquisition costs, dated profile and unresolved
instrument activity. It is a collection report, never a reassuring health verdict.
Schema errors include bounded field paths and validation keywords without rejected
values. Domain errors retain stable codes and safe messages.

Backup archives contain regular file contents as base64, with per-file SHA-256 of
the base64 text and a canonical manifest digest. Restore verifies both plus journal
replay and schema before publication. Migration preview binds backup digest and
resolved destination; apply rechecks under the source write lock. Full details,
limits and interrupted-operation recovery are in [the workflow](../workflows/recovery.md).

Negative recorded quantities are retained but flagged as unresolved activity;
short-position valuation and tax-lot accounting are not inferred.

## Confirmed planning and review records

Schema 2 also stores categories, classification rules, budgets, recurring payments,
transaction splits/refund links, investment policies, planned expenses, fixed debt
terms, fee scenarios, tax contexts, document references and opt-in reminders.
Their authoritative field definitions remain in the executable schema. See
[spending](../workflows/spending.md), [policy methods](../workflows/policy-review.md),
[tax routing](../workflows/tax.md), and [review/export contracts](../workflows/reviews.md).

Splits sum exactly to signed transactions. Refunds reference compatible spending
and cannot exceed the original debit in aggregate. Overlapping category/currency
budgets are rejected. Policy bands must be feasible and liquid assets cannot repeat
through correction aliases. No policy thresholds, amounts or tax residence are
inferred. Document references remain inert strings; no document is automatically opened.

CLI `init --schema 2` and browser initialization create a new schema-2 vault. The
CLI default remains schema 1. Initialization never upgrades an existing vault.
Review snapshots and public-data vintages are separate checksum-protected vault
artifacts, included in backups; only confirmed batches change financial records.

`retirement-scenario` and `housing-scenario` records explicitly supply all model
inputs and one to eight named sensitivity overrides. Both require net-of-fee
returns and bounded first-of-month start dates/horizons. Retirement expense IDs
resolve to planned expenses and cannot repeat through correction aliases. Same
currency and effective dates are checked again when projecting. See the
[life-planning method](../workflows/life-planning.md) for timing, formulas, funding
gaps and supported sensitivity fields. These records do not allocate goal assets.

Optional goal `allocations` must match `entityIds` exactly after correction
resolution, with bounded decimal shares and no duplicate aliases. Legacy records
retain whole-entity semantics. `allocation-plan` records select policy/scope,
explicit targets within bands, an external unallocated contribution assumption,
reviewed needs and monthly essential spending. See the
[allocation method](../workflows/allocation-plans.md) for report-level safeguards.

`household-member` records hold dated participation; `household-plan` records list
members and explicit per-entity ownership/debt shares. Sum checks and resolved-ID
uniqueness reject overclaims and aliases. Optional tax-context/document `memberId`
links keep each person's checklist separate. See [household](../workflows/household.md).
`fee-comparison` and `fx-comparison` retain bounded dated offers and eligibility,
with no default quote or automatic network access. See [comparisons](../workflows/comparisons.md).

Optional household-plan `scenarioId` resolves to a `retirement-scenario`. Legacy
plans remain valid. The [household showcase](../workflows/household.md) uses one
confirmed pooled scenario and validates effective opt-in at report time.
