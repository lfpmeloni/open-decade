# Local browser and agent interfaces

Install documented dependencies with `npm ci`, then build and launch:

```bash
npm run build
node bin/od-web.mjs --vault /tmp/example-vault
```

Open the private session URL printed by the process. It grants read/write access to
that vault for this process; do not share it. The server binds only to 127.0.0.1.
The fragment token never goes into a request URL and is removed from browser
history after loading. It stays in memory; reload requires reopening the launch
URL. Stop the process with Ctrl+C. No automatic background startup is installed.

Initialize a schema-2 vault from the browser, then use Import review to select
normalized JSON, column-mapped CSV or the experimental OFX/QFX banking subset. Show values, inspect and edit the interpreted records, preview,
and confirm. Any edit requires a new preview. Unresolved uncertainties block save.
Accounts, transactions and goals display confirmed records with source details.
Overview and reports use the same calculations as the CLI and show missing coverage.
Download a complete JSON report after showing values. This is not a redacted export.
Additional [portable formats and aggregate sharing](reviews.md) are available under
Reports. Tax reports expose country/year controls. Retirement, housing and fee-drag
reports accept a confirmed assumptions record ID; sensitivity tables obey masking. Save a report, then use Review
inbox to compare versions or inspect confirmed local reminders.

Masking hides record contents, totals and charts from the display; names and dates
may remain visible. It does not remove data from browser memory or downloaded
files. Accounts, Transactions and Goals have manual entry forms. Add a confirmed
account first, then add its dated balance or transactions. Ownership is an explicit
fraction; coverage defaults to unresolved. Account selectors show at most 500
accounts; use Import review for others. New goals start unfunded. Asset assignments,
transfers, investment/debt links and other advanced fields use Records or Import review.

Forms submit decimal strings to the same validated preview operation as imports.
Review the proposed fields and source, then confirm. Editing a field invalidates
its proposal. Cancel leaves records untouched. Correct record creates an immutable
replacement and preserves fields outside the form; original provenance remains in
history, and the correction records its supplied source as user-reported. Existing
uncertainties remain unresolved and block saving until handled in Import review.
The forms support existing schema-1 and schema-2 vaults without automatic migration.
The browser workflow passes Chromium acceptance in WSL/Linux: initialization,
manual/schema entry, ambiguity resolution, corrections, masking, export parity,
keyboard skip/navigation, page focus, labelled controls and narrow-screen forms.
Screen-reader certification, other native environments and individual agent-host
setups are outside the bounded [release acceptance](../docs/release-acceptance.json).

HTTP mutations require the session token, exact origin/host, JSON content type and
POST. No cross-origin API is exposed. Files are selected by the user; remote calls
cannot select arbitrary filesystem paths or switch vaults. The service has no
provider credentials, external data acquisition or model integration.

## Stdio MCP

Launch `node bin/od-mcp.mjs --vault /tmp/example-vault` from an agent that supports
stdio MCP. Initialize the vault separately through CLI or browser first. Example
client configuration (adapt the executable paths to your installation):

```json
{
  "mcpServers": {
    "open-decade": {
      "command": "node",
      "args": ["/path/to/open-decade/bin/od-mcp.mjs", "--vault", "/path/to/external-vault"]
    }
  }
}
```

The adapter implements the [MCP 2025-03-26 stdio transport](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
and [tools interface](https://modelcontextprotocol.io/specification/2025-03-26/server/tools).
It exposes diagnostics, capability lookup, paginated records (maximum 500), reports,
knowledge, saved-review listing/comparison and normalized-batch preview/apply. Tool content contains the same result
envelope. There is no embedded model. An external agent may transmit these records
to its provider; see [security](../SECURITY.md).

The agent must show the preview and obtain confirmation before calling apply.
The digest validates the exact proposal and current vault state; it is not proof
that an external host actually consulted its user. Keep tool-approval controls in
the host. Failed calls are structured errors without raw input values or paths.

Protocol and shared-domain tests do not certify every agent client's integration.
Browser and MCP maturity is listed in the [capability registry](../src/capabilities.mjs).

Household reports take a confirmed household-plan ID. Tax reports have an optional
member ID; blank means legacy personal scope. Dated fee/reward and FX comparisons
use explicit assumption IDs. Settings exposes the public read-only maintenance
queue without fetching sources or changing capability status.

## Supported record editor

Records lists all confirmed record kinds, including balances, with pagination.
Add record opens a form generated from the vault's authoritative schema; Correct
record preserves existing fields and proposes a new immutable record. The form
supports nested objects, lists, optional fields, explicit booleans, enums and
nullable values. Reference IDs are visible in the confirmed records and may be
copied into the form. The server remains the validator; schema-1 vaults expose only
schema-1 shapes. Unknown financial values are never filled with zero or assumptions.

Preview displays the full proposed record and warnings. Uncertainties block save;
resolve them explicitly in the provenance list after reviewing evidence. Masking
hides all form contents and disables confirmation. Any edit invalidates the
proposal, including edits made while a prior preview is awaiting a response.
`record schemas` is an authenticated shared read operation; MCP exposes
`record_schemas`. The user cannot select arbitrary schema files or paths.

CSV import mapping controls expose source/account IDs, columns, currency and
explicit date/decimal/grouping choices. The Wise profile has its own product and
locale controls. Advanced mapping JSON remains available for explicit source
corrections. Missing or conflicting date/currency interpretations fail validation;
no financial records are written until a valid preview is confirmed.
