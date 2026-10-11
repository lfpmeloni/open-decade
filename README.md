# Open-decade

Open-decade is an open-source project for understanding your financial picture:
accounts, assets, debts, cashflow, and goals. The intended experience is a
conversation with your chosen agent, backed by local records, reproducible
calculations, and readable methods.

Open-decade is independent and is not affiliated with, endorsed by, or connected
to Decade or any other financial company.

## Current status

The offline CLI is implemented locally for schema versions 1 and 2. It uses confirmed,
user-supplied records. Normal reports run offline; optional ECB reference FX requires
an explicit fetch and confirmation. Installed
availability is owned by the [capability registry](src/capabilities.mjs):

```bash
node bin/od.mjs capabilities --json
```

This is version 0.1.0 development software, not a published release. Verified production connections, built-in OCR, tax calculations, trading and money
transfers are unavailable. An [experimental IBKR Flex reporting path](workflows/connections.md)
has credential-free protocol tests; real consent/sync/revocation remains unverified. Scoped 2025 tax document modules cover seven
jurisdictions; they produce no filing decisions. The [development roadmap](docs/roadmap.md) describes rounds
5–16; future work is not installed availability. [Verified recovery](workflows/recovery.md)
provides backup, restore, and explicit migration to richer schema-2 records. See the registry's linked workflows and limitations.

## First use

Install Node **24.20.0** and npm **11.19.0**, then run `npm ci` from this checkout.
Use an external vault and start with read-only diagnostics:

```bash
node bin/od.mjs doctor --json
```

Follow the [local workflow](workflows/local-analysis.md) for explicit initialization,
manual/CSV preview and confirmation, reports, simulations and exports. The same
workflow explains agent-assisted extraction from text, screenshots and documents;
interpretation depends on the host and requires confirmation. The runtime accepts
normalized JSON, lossless standard CSV and [explicit column-mapped CSV](workflows/mapped-import.md).
The [local browser](workflows/application.md) passes Chromium acceptance in WSL/Linux.
The stdio MCP adapter passes subprocess/protocol acceptance; individual hosts use
the documented configuration.
The browser supports manual account, balance, transaction and goal entry with
preview/confirmation; Records exposes schema-driven forms for advanced fields.
A bounded [OFX/QFX bank adapter](workflows/ofx.md) is experimental. Named provider
layouts are optional follow-up except the existing experimental [Wise COMPACT CSV profile](workflows/provider-imports.md). [Spending](workflows/spending.md),
[policy reviews](workflows/policy-review.md), [goal allocations and drafts](workflows/allocation-plans.md), [retirement/housing scenarios](workflows/life-planning.md), [tax documents](workflows/tax.md),
[local reviews and exports](workflows/reviews.md) and optional
[reference FX](workflows/public-data.md) and [economic series](workflows/economic-data.md) have separate documented limits.

New browser vaults use schema 2. CLI initialization defaults to schema 1 for
compatibility; use `init --schema 2` for a new schema-2 vault. Existing vaults
require the explicit migration workflow.

Personal reports use one person’s ownership and debt-responsibility shares.
An opt-in [household picture](workflows/household.md) explicitly allocates
gross asset/debt values to participating members; shared vaults have no per-member
access controls. [Dated comparisons](workflows/comparisons.md) use supplied quotes. Useful partial results identify missing coverage. No market assumptions,
fees, prices or returns are invented. Read [methods](knowledge/methods.md) before
interpreting analytical results and [contracts](docs/contracts.md) when preparing
records. Synthetic fixtures demonstrate the interfaces; they are not personal data.

## Principles

- **Open methods.** Financial understanding should be accessible, inspectable,
  and improvable. Code and methods remain open; no capability is removed to make
  a paid tier viable.
- **User-owned records.** Personalization belongs in your vault, separate from
  project code. The project adds no telemetry or central portfolio service.
- **Evidence before conclusions.** Results identify their sources, dates,
  assumptions, and missing coverage. Unknown values remain unknown.
- **User control.** The product explains and drafts; financial execution remains
  outside it.
- **Independent contributions.** No paid provider placement or compensation tied
  to what a user holds or trades. Commercial relationships are disclosed.
- **Useful increments.** New capabilities come from real needs, with a small
  change, an example, tests, and honest limitations.

Donations, sponsorship, and paid support may support the project. A separately
operated hosting service must disclose its different privacy boundary and may
not remove capabilities from the open project. These are project commitments;
they do not change the license permissions granted to others.

## Privacy, costs, and limits

Local storage does not mean local inference. Your chosen agent may send records,
tool output, and conversations to its model provider. Its permissions, retention,
training settings, and costs are separate from Open-decade. The project does not
promise to enforce privacy settings in an external agent.

Project code and documentation use the [Apache-2.0 license](LICENSE). Agent
subscriptions and future optional data services may cost money. External source
data retains its own terms; the project license does not relicense it.

Open-decade is intended as an analytical tool, not a substitute for professional
financial, legal, or tax advice. It promises no returns. A disclaimer does not
establish regulatory compliance. See [SECURITY.md](SECURITY.md) for the data and
security boundaries.

## Help build it

Clone the public source repository:

```bash
git clone https://github.com/lfpmeloni/open-decade.git
```

To review or develop the project now, start with [CONTRIBUTING.md](CONTRIBUTING.md).
An agent should read [AGENTS.md](AGENTS.md). Before release, run
`npm run check:release` and follow the [final release review](CONTRIBUTING.md#final-release-check). This repository must contain every
script, runtime skill, and instruction needed for its advertised capabilities,
using only the documented prerequisites.

| Source | Owns |
|---|---|
| This README | Purpose, principles, user entry point, and installed capability entry point |
| [AGENTS.md](AGENTS.md) | Short agent behavior and document routing |
| [Architecture](docs/architecture.md) | Component boundaries, data lifecycle, and interfaces |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development, validation, commits, PRs, and maintenance |
| [SECURITY.md](SECURITY.md) | Privacy, credentials, publication, backups, and vulnerability handling |
| [Schema](schemas/batch-v1.json) and [contracts](docs/contracts.md) | Record shapes, invariants, CSV and result envelopes |
| [Roadmap](docs/roadmap.md) | Completed release scope and optional follow-up |
| [Schema 2](docs/schema-2.md) | Richer records and migration compatibility |
| [Capability registry](src/capabilities.mjs) and [generated listing](docs/capabilities.md) | Installed command availability |
| [Local workflow](workflows/local-analysis.md) | Intake, reports, agent extraction, exports and recovery |
| [Knowledge index](knowledge/INDEX.md) | Progressive topic routing and dated public catalogue |
| [Methods](knowledge/methods.md) | Formulas, sources, examples and analytical limitations |

Link to these owning sources instead of copying their contents into every guide.

The [0–16 roadmap](docs/roadmap.md) is complete under the selected local release
scope. Provider expansion is chosen during use. The [release acceptance record](docs/release-acceptance.json)
identifies the tested WSL2/Linux runtime and bounded Chromium accessibility baseline.
The [household showcase](workflows/household.md) uses one confirmed pooled scenario.
