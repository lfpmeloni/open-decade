# Open-decade

Open-decade is an open-source project for understanding your financial picture:
accounts, assets, debts, cashflow, and goals. The intended experience is a
conversation with your chosen agent, backed by local records, reproducible
calculations, and readable methods.

Open-decade is independent and is not affiliated with, endorsed by, or connected
to Decade or any other financial company.

## Current status

**Documentation only. No financial capabilities are implemented yet.** There is
no installable release, CLI, data schema, test suite, or validated agent
integration. Commands described in the architecture are planned interfaces,
not instructions you can run today.

| Capability | Status |
|---|---|
| Architecture, agent instructions, and contribution workflow | Available as documentation |
| Manual entry and standard CSV import | Planned for the first usable release |
| Accounts, assets, liabilities, cashflow, goals, and exports | Planned for the first usable release |
| Bank-specific imports, ETF analytics, and simulations | Deferred; added through focused contributions |
| Live bank connections, historical performance, regional tax calculations, and scheduled monitoring | Deferred; not currently supported |
| Trading, money transfers, custody, and transaction authority | Outside the product scope |

This section owns current availability until the capability registry exists.
When it ships, show availability from that registry rather than maintaining a
second hand-written feature list.

## Intended first use

The first release will support one person per vault, including ownership shares
for jointly held assets. It will accept manual records and the project's
documented CSV format. Arbitrary bank exports and PDFs require their own
supported importers.

Start with a question and the records needed to answer it. For example:

- "Here are my accounts, savings, and mortgage. What is my recorded net worth?"
- "Summarize these transactions for September and show what is unclassified."
- "Which information is missing before you can assess progress toward my goal?"

These are planned acceptance examples, not capabilities available today. Partial
data should produce a clearly labeled partial result. Complete transaction
history, a risk questionnaire, and tax details will not be prerequisites for a
simple balance summary.

The initial scope is general analysis across currencies. Residence metadata is
not a promise of tax support. Recording an asset does not imply that the project
can price it, forecast its return, or recommend buying it.

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

Clone the public documentation and source repository:

```bash
git clone https://github.com/lfpmeloni/open-decade.git
```

To review or develop the project now, start with [CONTRIBUTING.md](CONTRIBUTING.md).
An agent should read [AGENTS.md](AGENTS.md). No private founder documents are
required to contribute.

| Source | Owns |
|---|---|
| This README | Purpose, principles, user entry point, and current availability |
| [AGENTS.md](AGENTS.md) | Short agent behavior and document routing |
| [Architecture](docs/architecture.md) | Component boundaries, data lifecycle, and planned interfaces |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development, validation, commits, PRs, and maintenance |
| [SECURITY.md](SECURITY.md) | Privacy, credentials, publication, backups, and vulnerability handling |

Schemas, a capability registry, and topic-specific methods will become the
authoritative sources for their respective details when implemented. Link to
those sources instead of copying their contents into every guide.
