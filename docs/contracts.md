# Version 1 contracts

The executable [batch schema](../schemas/batch-v1.json) owns record shapes.
All decimals are strings; dates are real Gregorian YYYY-MM-DD dates and timestamps
include a timezone. Values use decimal.js precision 40, ROUND_HALF_EVEN. Results
retain decimal strings without forced display rounding. Simulation uses 60 internal
guard digits and rounds results/comparisons to 40 significant digits as documented
in the method. Liabilities are positive
obligations; signed liabilityDelta reduces debt when negative. Shares and weights
are fractions in [0,1]. Negative account/position balances are unsupported.

Every record has an immutable ID, effective date, capture timestamp, provenance
(source, quality, uncertainties, optional stable sourceId/page/row), and optionally
supersedes. Superseding records have the same kind; references to an older entity
ID follow its correction chain. References must resolve with compatible types and
currencies. Corrections cannot branch. Same-day observations for an entity, fund instrument,
or currency pair require a correction instead of an arbitrary tie-break. Sources are labels, never executable paths.
Unresolved extraction uncertainties appear in preview and block application.

Account coverage explicitly selects aggregate or detailed holdings. Unresolved
coverage is excluded and warned about. An account in holdings mode contributes its
positions only (cash must be a position). Observations replace prior snapshots for
the same entity; signed subsequent transaction amounts change aggregate accounts,
positionDelta changes positions, and liabilityDelta changes obligations. A same-day
observation is end-of-day and includes that day's events. Transactions cannot be
used to derive market price changes. Incomplete histories make roll-forward partial.

Standard CSV uses exactly four columns: `schemaVersion,batchId,kind,record`.
Each row has the same schemaVersion (1 or 2) and batchId. Schema 2 is described
in [its contract](schema-2.md). `record` is a quoted JSON object
with the full record, including matching kind and provenance. CSV quoting follows
RFC 4180; this lossless format supports every record kind without coercing decimal
strings. Manual and agent-extracted JSON use the batch schema directly.

Preview returns the normalized proposal, changes, duplicates, warnings, and a
confirmation digest binding both the proposal and current committed state. Apply
requires the same file plus `--confirm DIGEST`. Editing a file or committing other
records invalidates that digest. Exact normalized batch repeats are no-ops. Mixed batches retain their full proposal
identity in the immutable journal; replay skips exact repeated records. Stable
duplicates must reuse the exact previously recorded object. Stable
(source, sourceId, kind) identifies duplicate records. Similar transactions without
stable IDs require the user to assign distinct source IDs or submit a correction;
identical legitimate payments with distinct source IDs are retained.

Assumptions explicitly supply annual effective expected return, annual volatility,
annual inflation, initial capital, signed fixed nominal end-month contribution,
horizon, target in today's currency, and confirmation that returns are net of fees.
Optional paths and seed default to 10000 and 1. No market assumptions are inferred.
History records assert transaction and external-flow completeness over a closed
interval. Performance uses one account, endpoint observations and transaction
before/after valuations for every nonzero external flow; no interpolated valuations.

CLI envelopes are `{command, contractVersion:1, outcome, data, warnings, errors}`.
Outcomes are success, partial, or failure. Success/partial exit 0; failure exits 1.
Errors have stable codes and safe messages. Reports include method/software versions,
input IDs, dates, coverage, assumptions and unavailable conclusions. JSON and human
renderings contain the same result. Dates and report windows are explicit inputs.

Goal reports use goals-v3 and include explicit allocations, unfunded targets and
`conflictingGoalIds`. Legacy records retain whole-entity claims. Schema-2 records
may supply complete fractional assignments; total claims above one make affected
funding/progress unavailable. The [allocation method](../workflows/allocation-plans.md)
owns corrected-ID matching, precision, protection and draft-plan conventions.

Schema-2 spending, policy/diagnosis, document guidance, local review snapshots,
portable exports and optional reference-data acquisition are described in
[the schema-2 contract](schema-2.md) and its linked owning workflows. They share the
same envelope and immutable confirmation semantics. Experimental capability status
does not establish provider, platform or tax applicability.


## Additional local interfaces

`record schemas` returns only the current vault version's public record variants.
The [schema-driven browser editor](../workflows/application.md) builds proposals;
it does not implement a second financial validator. Decimal amounts remain strings,
optional fields remain optional, and generated IDs never overwrite old records.

[Named-provider formats](../workflows/provider-imports.md) add `import formats` and
`wise-csv` dispatch through the existing import confirmation contract. Source
balances are preview metadata, not duplicate cash movements or complete histories.
[Household cashflow](../workflows/household.md) uses the shared report envelope and
excludes personal tax contexts from its inputs.

[Economic caches](../workflows/economic-data.md) distinguish units, quality flags,
vintages and as-of availability without creating financial records. The
[connection configuration schema](../schemas/connection-v1.json) accepts no secrets.
[Reporting synchronization](../workflows/connections.md) stores fetched proposals;
`connection apply` and agent `import_apply` use the existing state-bound digest.
Local disconnect is not remote revocation. Production connection status remains
unverified until actual consent/sync/revoke and credential-store gates pass.

Diagnosis reports use `diagnosis-v2`. They add `unallocatedLiquidValue`,
`protectedGoals`, and shared `goalFunding` results. Obligation rows include `overdue`;
past-due active expenses remain in the timeline. Unknown or conflicting goal claims
and stale expense FX withhold available-liquidity conclusions. Finding input IDs
resolve to the report's source metadata. The result envelope remains version 1.

Retirement and housing reports use `retirement-v2` and `housing-v2`. Shape and
confirmation semantics stay compatible; guard precision increases to 120 digits.
Shortfalls are computed before display rounding, with only relative 10^-110
numerical noise suppressed as specified in the [life-planning method](../workflows/life-planning.md).
Saved reviews retain their original method version for comparison.

`household-scenario-v1` selects a household-plan with optional `scenarioId` and
reuses retirement-v2. It retains members, projection method/availability, scenario
cases and provenance; opt-outs or unavailable expenses withhold projection cases.
The schema-2 addition is optional and requires no migration of existing plans.

Roadmap completion is distinct from individual provider coverage.
[Release acceptance](release-acceptance.json) owns the bounded platform/accessibility
scope; maintenance returns that scope and optional follow-up capability gates.
