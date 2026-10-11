# Local financial-planning roadmap

Updated 2026-10-11. Open-decade is an offline, non-custodial application backed by
local immutable records, deterministic calculations, and the user's chosen agent.
Milestones 0–4 are completed historical work: documentation, local journal,
financial picture, confirmed host extraction, and supplied-data analytics.
This roadmap describes the next independently deliverable rounds. It does not
advertise implementation: [the registry](../src/capabilities.mjs) owns installed
availability. Run `node bin/od.mjs capabilities --json` for current status.

## Completed release scope — 2026-10-11

The user closed the open-ended provider work and selected a simple household
showcase and one-iteration platform/accessibility gate. Under that revised scope,
**rounds 0–16 are complete for the local release**. The original delivery targets
below remain design history; this section owns the revised completion gates.
[Release acceptance](release-acceptance.json) records supported scope and evidence.
Completion of a round does not certify an untested provider or environment.

| Round | Completed release scope |
|---|---|
| 0–4 | Historical documentation, local journal, financial picture, confirmed extraction and supplied-data analytics preserved |
| 5 | Verified backup/restore, separate schema migration, richer records, validation and readiness |
| 6 | Original public catalogue, topic routing, review metadata and private concept dispositions |
| 7 | File-first adapter framework, lossless/mapped CSV, documented OFX/Wise subsets and host-extraction fallback; further providers chosen during use |
| 8 | Local browser onboarding, records/import review, masking, reports/exports and shared stdio protocol |
| 9 | Confirmed categories/rules/splits/refunds, recurring proposals, bills, budgets and spending trends |
| 10 | Versioned policy diagnosis, goal-protected reserves, overdue obligations and incomplete-data findings |
| 11 | Seven country/year document modules, applicability questions, reviewed sources, stale routing and preparer handoff; no tax calculation or filing |
| 12 | Personal policy/goals/debt/retirement/housing/allocation drafts; opt-in household picture/cashflow and one pooled household scenario showcase |
| 13 | Explicit public-data acquisition/cache/vintage framework and current ECB FX/rate/inflation subsets; more data providers chosen during use |
| 14 | Optional reporting connection boundary, OS-secret isolation, cached proposals, confirmation and local disconnect; production enrollment/coverage chosen during use |
| 15 | Local reminders/reviews, portable and sharing exports, supplied fee/reward/FX comparisons; further offers/import migrations chosen during use |
| 16 | Public-only offline package/install/recovery checks, maintenance queue, WSL2/Linux runtime, stdio protocol and bounded Chromium accessibility acceptance |

The household showcase links a confirmed `retirement-scenario` to an opt-in
`household-plan` through `scenarioId`. It uses one explicitly supplied pooled
capital/income/spending/pension scenario, preserves shortfalls and sensitivities,
and never adds member capital twice or combines personal tax contexts.

The supported runtime for this completion is Linux under WSL2 with the pinned
Node/npm versions and Chromium. Native Linux desktop, Windows and macOS execution
and individual agent hosts/screen readers are outside this release's certification
scope. Accessibility acceptance covers keyboard/skip navigation, labels/landmarks,
focus, live feedback, contrast, 320-pixel reflow, large text, masking and reduced
motion. It is a bounded baseline, not a claim of full WCAG conformance.

## Original delivery targets — historical specification

### 5. Reliability and richer records

Explicit verified backup, restore, and schema migration into a separate vault;
field-level validation and collection readiness. Preserve instrument identifiers,
quantities, trades, dividends, fees, settlement dates, corporate actions, account
wrappers, institution identities, dated profiles, raw references, and incomplete
histories. Never infer missing cost, quantity, or ownership.

Gate: restore into an independent vault; preserve schema-1 journal bytes, IDs and
financial totals through migration. Unknown instruments remain unresolved and
visible. Old software refuses schema-2 writes.

### 6. Original knowledge and guidance

Searchable versioned public catalogue for product use, assets, portfolio planning,
tax, institutions, and economic scenarios. Progressive routing, source metadata,
review dates, jurisdiction applicability, and scenario evaluations. Maintain a
private disposition for each of 117 reference notes: retain concept, adapt, or
exclude, with rationale and original public destination for adopted concepts.

Gate: every adopted idea has an original specification or knowledge document;
installation needs no private corpus. Guidance separates evidence, preferences,
assumptions, and unsupported conclusions. Reference material supplies ideas, never
authoritative rules or copied branding, house thresholds, scores, or promises.

### 7. Common file imports

IBKR, Schwab, Fidelity, Vanguard, Wise, Revolut, N26, Trade Republic, DEGIRO,
OFX/QFX, and ordinary column-mapped CSV. Each adapter states product, country,
language, export version, export instructions, account mapping and coverage.
Localized decimals and ambiguous dates/currencies require explicit interpretation.
Deduplicate sources, reconcile snapshots and transactions, preserve corrections.
Unsupported layouts use host-assisted extraction.

Gate per adapter: synthetic success, malformed input, overlap, correction,
repeat-import and pending-to-posted tests; rejected batches leave no partial writes.
A missing fixture blocks only the affected adapter. Saved fixtures do not certify
ongoing provider compatibility.

### 8. Full local application

React/Vite browser client and loopback-only Node service: onboarding, overview,
accounts, transactions, import review, goals, reports, settings, charts, monetary
masking, accessible controls, freshness/coverage and source drill-down. Session
authentication, origin checks and protected mutation routes. Corrections use the
same preview and confirmation pipeline. Add a stdio MCP adapter with bounded reads
and identical proposal/apply operations for existing agents.

Gate: after launch, initialize a synthetic vault, import and resolve ambiguities,
inspect finances and export without a terminal. UI/CLI/agent financial results and
confirmation behavior agree. No embedded model or mandatory model credentials.

### 9. Cashflow and spending

User categories, reusable rules, splits, refund matching, recurring candidates,
subscription review, bill calendars, budgets, savings-rate trends. Essential,
discretionary, recurring and exceptional spending classifications are confirmed.

Gate: examples cover duplicates, refunds, transfers, irregular income, missing
months and changing subscriptions. Detected patterns remain proposals.

### 10. Consolidated diagnosis

Versioned review combines costs, allocation against user policy, liquidity,
concentration, debt, goal funding and unresolved data. Reserve months, obligations
timeline, issuer/institution exposure, severity and remedies; fee-drag scenarios
use explicit assumptions.

Gate: each finding cites inputs, method, policy threshold and limitations. Missing
data cannot produce reassurance. Tax findings ask questions and identify documents;
they do not quantify tax savings.

### 11. Tax guidance and documents

11A: US federal and Germany. 11B: UK and France. 11C: Spain, Italy, Netherlands.
Separate jurisdiction/year modules with questionnaires, applicability, investment
income/disposals, wrappers, foreign accounts, retirement documents, document
checklists, reviewed deadlines, official links and preparer handoff packages.

Gate: dated primary sources, applicability tests, unsupported-case routing and
stale-content handling in every module. Cross-border situations retain separate
country obligations and professional-review questions. No liability calculations,
filing decisions, return submission, or US state/local modules.

### 12. Life planning and user policy

Versioned editable investment policy distinguishes tolerance from capacity. Dated
goals, planned expenses, reserves, debt schedules, retirement accumulation and
drawdown, mortgages, rent-versus-buy, future currency liabilities; draft contributions
and rebalancing against user-selected bands. Opt-in household ownership keeps
personal tax contexts separate.

Gate: confirmed inputs, explicit assumptions, unfunded needs and sensitivity to
inflation, returns, income and timing. Funds cannot silently satisfy multiple goals.
Plans stay drafts; no orders or money movement.

### 13. Optional public data

Explicit acquisition boundary: official FX, rates and inflation first, then dated
issuer holdings/fee disclosures and permitted market prices. Preserve vintage,
adjustments, license, provenance and revision status.

Gate: cached inputs reproduce reports offline; stale, missing, revised and
unavailable data are distinct. No promise of free comprehensive securities data or
unrestricted redistribution.

### 14. Optional read-only connections

IBKR Flex reporting first, then Plaid bank transactions and supported US investment
data. Disclose provider/account/product/country scopes, fees and enrollment;
connection status, incremental sync, expiry, reconnect and revocation. Credentials
stay in the OS store outside records and agent context. Fetched records always
enter preview and confirmation.

Gate: credential-free recorded-response tests cover pagination, rate limits,
missing accounts, changed data, retries and secret redaction. Production status
requires real consent/sync/revoke tests for the advertised scope. Keep file fallback.
Mocks must never be advertised as verified live access.

### 15. Perks and periodic reviews

Dated FX routes, bank/broker fee comparisons, credit-card reward/fee break-even,
renewal reminders and insurance/beneficiary document checklists. PDF/XLSX reports,
redacted sharing, calendar exports, report comparisons and a local review inbox.
Extend the same adapter contract to budgeting migrations and more institutions.

Gate: source dates, eligibility, assumptions and coverage; no affiliate rankings
or invented offers. Local reminders are opt-in, send no messages and modify no
external accounts. Scheduled fetches may create proposals, never confirm records.

### 16. Distribution and maintenance

Package the local application; onboarding/recovery guides; validate Windows/WSL,
Linux and macOS independently. Adapter-format monitoring, knowledge-review queues,
accessibility checks, upgrades and release-artifact inspection.

Gate per advertised platform: install, migration, restore, import, reports and
agent integration. Complete offline operation requires no paid data or model
subscription. Background startup, notifications and telemetry are off by default.

## Shared acceptance and boundaries

One validated persistence and calculation implementation serves CLI, browser and
agent tools. Preserve the result envelope and useful partial results, decimal
arithmetic, immutable provenance, exclusive writes and proposal-bound confirmation.
Profiles, policies, confirmed categories, document references, reminders and report
history belong in the vault; credentials do not. Schema 2 migration preserves
original schema-1 batches and refuses in-place changes.

Each round updates its owning contract/method, registry, changelog, synthetic
examples and milestone note. Tests retain independent calculations, cross-currency
cases, corporate actions, holdings overlap, refunds, competing goals and incomplete
history. Import tests include malicious text and changing exports. Compatibility
tests include interrupted migration and concurrent access. Public installations,
logs, fixtures and packages remain independent of private research and personal data.

English is the initial interface. Country guides cite official native sources;
import locales are explicitly tested. No default house portfolio, custody, trading,
payments, credential scraping, hosted account, built-in chat or native OCR.
Optional purchases, production enrollment, commits and publication are separate
user-authorized actions. Provider onboarding must not block unrelated local work.


## Follow-up selected during use

There are no blocking tasks left on the revised 0–16 roadmap. Additional provider
layouts, budgeting migrations, issuer/price feeds, Plaid or production Flex access,
other native environments, host-specific integration and expanded accessibility
certification are optional new follow-up tasks. Select their scope when needed.

Individual capabilities retain honest availability and limits. In particular,
synthetic provider-response tests do not establish live account coverage; no
provider purchases, production enrollment, commits or publication were performed.
Knowledge/source review dates and regression checks continue as routine maintenance
through [the local queue](../workflows/maintenance.md), not unfinished roadmap rounds.

## Bounded maintenance increment: final release acceptance

Add one final package-based release command, retained Chromium evidence, report
entry-point coverage and risk-based failure/recovery journeys. Contribution scope,
protected contracts and human review are owned by
[CONTRIBUTING.md](../CONTRIBUTING.md#scope-and-protected-contracts). This increment
preserves completed rounds 0–16 and adds no provider, platform, financial method,
or product framework. Larger gaps remain separately scoped follow-up work.
