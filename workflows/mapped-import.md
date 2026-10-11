# Ordinary CSV with explicit column mapping

Use a confirmed existing account and a JSON mapping. The
[synthetic mapping](../fixtures/imports/mapping.json) describes
[the example CSV](../fixtures/imports/mapped.csv). It supplies the source identity,
account, currency, capture timestamp, header names, date format, decimal/grouping
separators and delimiter. This is not a provider-specific parser.

```bash
node bin/od.mjs import preview --vault /tmp/example-vault --file fixtures/imports/mapped.csv --mapping fixtures/imports/mapping.json --json
node bin/od.mjs import apply --vault /tmp/example-vault --file fixtures/imports/mapped.csv --mapping fixtures/imports/mapping.json --confirm DIGEST --json
```

Review the normalized interpretation before applying. Supported date formats are
YYYY-MM-DD, DD/MM/YYYY and MM/DD/YYYY; the latter two require slashes and zero
padding. Decimal separator is dot or comma; grouping may be absent, dot, comma or
space with groups of three. No locale is guessed. Amounts are signed; debit/credit
column pairs need host normalization. Currency comes from exactly one constant
or mapped column and must match the account. No FX conversion is performed.

Map stable transaction IDs, dates and amounts; description and currency columns
are optional. Headers must be unique. Files without stable transaction IDs use
the existing host-extraction workflow to resolve overlapping events. Source
identity includes the configured source label and original account identity (preserved across corrections). Keep them
stable across exports. Exact previously imported transactions reuse their original
record, provenance and capture date. New IDs create new records; same-date equal
payments with distinct IDs are retained. Never generate new IDs to bypass a conflict.

Changed values under the same source ID stop with SOURCE_CONFLICT. After review,
add `"corrections":{"external-id":"old-internal-record-id"}` to the mapping and
preview again. Corrections never mutate earlier journal records. Partially
overlapping exports retain exact prior records and apply only new records. Unknown
cashflow classification is intentional; confirm a later correction to classify it.

Limits: 10 MB files, 10,000 rows, signed decimal strings, one confirmed account and
currency per import. No pending/posted inference or snapshot merging is performed.
Schema-2 imports preserve the raw-file digest as an inert reference; this command
does not copy the raw file into the vault. Keep source files with your private records.

Provider-specific IBKR, Schwab, Fidelity, Vanguard, Wise, Revolut, N26, Trade Republic,
and DEGIRO adapters remain planned. A bounded [OFX/QFX bank adapter](ofx.md) is
experimental. A successful user mapping is not verified
coverage for a provider, country, language or export version. Unsupported layouts
use [host extraction](local-analysis.md).
