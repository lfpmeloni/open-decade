# Architecture

**Status: implemented offline architecture, schema versions 1 and 2.** See [current availability](../README.md#current-status).
This document owns boundaries and data lifecycle. [Executable schemas](../schemas/batch-v1.json) and
[capability definitions](../src/capabilities.mjs) own exact fields and feature status.

## Structure

Use JavaScript ES modules, a single `node bin/od.mjs` entry point, and readable
local files. Use one writer per vault. The optional loopback browser service and stdio MCP
adapter call the same validated domain operations. CLI-only use needs neither
service; no database, embedded model or worker queue is required.

```text
User <-> chosen agent -> CLI -> validation / domain calculations -> report
                         |
Manual input / CSV -> adapter -> preview -> confirmed atomic batch -> vault
                         |
                 shared record schemas
```

| Component | Responsibility |
|---|---|
| Agent | Clarify intent, select supported workflows, and explain results |
| CLI and domain functions | Validate, calculate, persist, and render results |
| Adapters | Normalize one source format into the shared contract; no canonical writes |
| Workflows | Describe one task's required inputs, commands, and result handling |
| Knowledge | Sourced methods, applicability, assumptions, and uncertainty |
| Vault | Personal records, source documents, preferences, and derived reports |
| Capability registry | Implementation maturity, requirements, and workflow routing |

Keep domain calculations independent of network access and model calls. Optional
network adapters acquire data through explicit boundaries with source-specific
timeouts, limits, and provenance. The agent's own network access is governed by
its host, as described in [SECURITY.md](../SECURITY.md).

## Storage and ownership

Project code, runtime skills, public documentation, contributor checks, and
synthetic fixtures belong in this repository. Every advertised feature and its
required build or test step must work from a fresh public clone using documented
prerequisites. Do not depend on a maintainer's checkout, untracked scripts,
private remotes, or files installed through a maintainer's personal agent setup.

Personal records belong in the user's vault, not on another branch of the code
repository. Maintainer-specific repository arrangements are not part of the
public product architecture.

The default vault is `~/.open-decade/vaults/default`, outside the project.
`OPEN_DECADE_VAULT` overrides it; relative paths resolve from the project root.
All access goes through one path resolver. Validate resolved paths, including
symlinks, before writes. Reject vault locations inside the code working tree.
Tests explicitly use a temporary external vault, never the personal default.

Use schema-validated, immutable JSON batches for confirmed financial records,
YAML for profile/preferences, and Markdown for narratives. Raw input documents
and generated outputs also remain in the vault. Markdown tables are views,
not editable financial truth. Preferences contain no example financial values
that could be mistaken for user input.

Each batch has a stable identity and schema version. Records have stable internal
IDs, their kind, source reference, effective date, and capture time. Corrections
supersede records by ID; they do not silently rewrite history. External IDs such
as ISINs are optional attributes, not universal record identities.

Commit a validated batch under a vault-wide write lock using a staged file and
atomic replacement/rename on the same filesystem. Recheck duplicates and conflicts
under the lock. A failed write must leave the previous committed state usable.
Readers ignore staged files; current views are rebuildable from committed batches.
This is a bounded local journal, not a distributed event-processing system.

## Financial records and invariants

The initial contract must represent accounts, assets/positions, liabilities,
dated balances and valuations, transactions, goals, and source provenance.
Personal reports represent one person. An explicit experimental household report
uses separately declared gross-value shares; it never rewrites personal ownership.
Joint asset ownership and debt responsibility are separate explicit shares; do not assume they are equal.

- **Observations are not events.** An opening balance, current holding, or
  property valuation does not imply an acquisition or income transaction.
- **History can be incomplete.** Preserve coverage start dates. Derive views
  from confirmed observations and subsequent applicable events; a new snapshot
  reconciles an existing position instead of adding another one.
- **Avoid double counting.** Use detailed holdings or the enclosing account's
  aggregate value for the same coverage, never both. Report unresolved overlap.
- **Distinguish flows.** Matched internal transfers do not become income or
  expense. Classify debt principal separately from interest and spending; label
  unresolved classifications rather than guessing.
- **Amounts have units.** Preserve original currencies and decimal strings;
  calculate with decimal arithmetic and explicit rounding. Debts have a documented
  sign convention and are subtracted once when deriving net worth.
- **Conversion is dated.** Use a stated base currency and sourced FX observation.
  Missing FX leaves per-currency results and an incomplete combined total. A
  reference rate is not an actual transaction execution rate.
- **Unknown is not zero.** Mark unpriced assets, missing costs, unclassified
  transactions, and stale valuations. Report missing coverage alongside totals.
- **Estimates remain estimates.** Preserve whether values were user-reported,
  source-reported, estimated, or calculated. Conversational proposals remain
  provisional until confirmed and persisted.

Validate dates, identifiers, amounts, references, ownership shares, and schema
versions at the boundary. Reject invalid input without partially applying it.
Exact record schemas, CSV columns, and calculation formulas must land with
validated examples before their first consuming implementation.

## Input lifecycle

Manual entry and standard CSV share one path:

1. Parse into a proposed normalized batch; preserve source references.
2. Validate shape and domain constraints; identify duplicate or conflicting data.
3. Show interpreted values, intended changes, warnings, and rejected records.
4. Resolve ambiguities and obtain confirmation for extracted batches. An explicit,
   unambiguous manual update need not be confirmed a second time.
5. Apply the confirmed batch atomically, then rebuild affected views.

Repeated imports must be idempotent. Retain source transaction IDs where available;
otherwise use a documented source/account-scoped duplicate rule. Do not discard
legitimate repeated payments merely because their amounts and dates match.

Import is not reconciliation by assumption: report discrepancies between a
statement's closing balance and the recorded activity. Do not fabricate balancing
transactions. Keep source documents private even when the imported subset is small.

## CLI contracts

Exact usage and recovery are in the [workflow](../workflows/local-analysis.md);
[contracts](contracts.md) own CSV, confirmation, versioning and exit codes.

| Interface | Contract |
|---|---|
| `od doctor --json` | Read-only diagnostics; no initialization, migration, or automatic network request |
| `od init` | Explicit, repeatable vault creation; existing records remain intact |
| `od capabilities --json` | Installed feature maturity and requirements, independent of personal readiness |
| Import operations | Preview and validate before applying a confirmed batch |
| Report operations | Structured findings, sources, coverage, warnings, and unavailable calculations |

Use `node bin/od.mjs` to invoke `od`. `--json` selects machine-readable output;
human output renders the same result rather than implementing a second calculation.
Results identify command and contract version, outcome, data, warnings, and errors.
Distinguish missing data, unsupported input, source failure, and invalid input.
Return nonzero for failure; useful partial results carry explicit coverage warnings.

## Capabilities and progressive use

The registry distinguishes `planned`, `experimental`, `available`, and
`deprecated` implementation states. Unsupported requests fall outside implemented
entries. Separately assess runtime prerequisites and user-data readiness: a working
feature blocked by missing FX is different from a feature that has not been built.

Each implemented entry points to its command, supported inputs, workflow, known
limits, and acceptance scenarios. Add only real commands and workflow files.
Transition a feature to available only with passing acceptance checks and an
example. The CLI exposes this registry; agents and user-facing documentation do
not maintain separate feature matrices.

Onboard only for the requested task. A balance summary needs balances and dates;
cashflow needs transactions for a stated period; performance needs suitable
valuations and cashflow history. Missing inputs constrain that result, not the
entire application. Offer a supported workaround before proposing development.

## Knowledge and reproducible reports

Start with a small topic index and add documents only when a workflow uses them.
Load the matching topic rather than entire directories. Each method records its
purpose, sources, applicability, assumptions, review date, limitations, and examples.
Keep calculation definitions with their method, not in an agent instruction file.

Separate sourced facts, project analytical choices, and user strategy. Do not
copy another product's house allocation rules or treat an AI-generated extract
as a verified methodology. Jurisdiction-specific guidance needs its own reviewed
sources and scope; a country preference alone enables no tax calculations.

Reports identify input record IDs, relevant data dates and coverage, software and
method versions, assumptions, and unavailable results. Store structured results
and a readable rendering. Reproducing a calculation must not require an agent;
the explanatory prose may vary. Describe actions, sources, and calculations
without depending on access to private model reasoning.

## Compatibility and deliberate deferrals

The first runtime must pin a supported Node version, dependency lockfile, schema
version, and tested environments. Agent neutrality is a design goal, not a claim
that all clients load instructions identically. Validate an integration before
advertising it; add small adapters only when needed.

Code upgrades use normal Git branches and reviewed releases. A code upgrade does
not migrate the vault. Before the first incompatible schema change, implement
explicit migration preview/apply, backup/restore, and compatibility checks. Older
code must refuse unsupported schema writes. Follow the release process in
[CONTRIBUTING.md](../CONTRIBUTING.md).

The [roadmap](roadmap.md) authorizes a local browser application, bounded stdio MCP
adapter, opt-in scheduling, and optional read-only providers in staged rounds.
They share domain operations and proposal confirmation with the CLI.
A custom updater, plugin marketplace and embedded chat remain deferred. ETF and performance methods
document their supplied-data coverage and history
requirements in [methods](../knowledge/methods.md). Verified production account connections and most named provider
imports remain planned; bounded OFX, Wise CSV, ECB FX/economic acquisition and
IBKR Flex mapped reporting are experimental.
Country/year document organization has scoped acceptance; built-in OCR remains deferred.
Tax scope is document guidance only, without calculation or filing.
See [schema 2](schema-2.md) and [recovery](../workflows/recovery.md) for the implemented
separate-destination migration and backup boundary.

The same report dispatcher owns spending, policy diagnosis, document checklists and
local reminders. `reviews.mjs` persists immutable result snapshots separately from
financial batches. `portable-exports.mjs` renders bounded documents; aggregate
sharing uses an explicit field allowlist. Public-data acquisition is isolated in
`public-data.mjs`; only the explicit CLI fetch reaches a fixed external endpoint.
Cached vintages become financial records solely through ordinary preview/apply.

Household participation and tax member routing are report-level controls, not an
access-control system. Use separate vaults for independent access boundaries. The
[household method](../workflows/household.md) owns its explicit gross-share model.
[Quote comparisons](../workflows/comparisons.md) use supplied dated assumptions and
never perform provider acquisition or financial execution.

The experimental [reporting connection boundary](../workflows/connections.md) is CLI-only for acquisition and credential access. Browser/MCP expose status and cached proposal previews; application uses the existing confirmation pipeline. External errors and credential-bearing request URLs never enter result envelopes. Non-secret configuration and fetched proposals are private vault files; OS tokens are outside backup and agent context.

The revised [release scope](release-acceptance.json) closes roadmap 0–16 for the
local application. Provider expansion is optional follow-up rather than a universal
coverage gate. The household scenario calls the existing retirement method once
with explicit pooled assumptions; personal ownership/tax contexts stay separate.
Platform and accessibility claims remain bounded by actual release acceptance.
