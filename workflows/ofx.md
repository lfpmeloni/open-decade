# OFX/QFX bank transaction intake

The local adapter reads a bounded subset of OFX bank statements in UTF-8/ASCII:
SGML 1.02/1.03/1.6 and XML 2.x headers. Synthetic acceptance specifically covers
1.02 and 2.3; other accepted headers remain experimental. It also accepts QFX files
using the same supported bank statement structure. This is not live institution
certification. Credit-card, investment, pending transactions, currency overrides,
correction directives, multiple statements and encrypted exports require host
extraction. The [FDX OFX specification](https://financialdataexchange.org/wp-content/uploads/2025/12/OFX-Banking-Specification-v2.3.pdf)
is the primary format reference, reviewed 2026-10-09; source documents are not
redistributed. Fixtures are original synthetic examples.

```bash
node bin/od.mjs import preview --adapter ofx --file fixtures/imports/bank.ofx --mapping fixtures/imports/ofx-mapping.json --json
node bin/od.mjs import apply --adapter ofx --file fixtures/imports/bank.ofx --mapping fixtures/imports/ofx-mapping.json --confirm DIGEST --json
```

Use a confirmed existing account and explicit externalAccountId, source label,
capture timestamp and `datePolicy: "bank-date"`. This uses the provider's date
component without timezone conversion. Currency must match the mapped account.
FITID is scoped by source institution/account and the original local account
identity, so repeated and partially overlapping exports reuse existing records.
A changed FITID value requires the same explicit corrections mapping used by
[column-mapped CSV](mapped-import.md). Separate export families with incompatible
identities must be reviewed before combining them.

The preview shows the ledger balance and statement period separately. It does not
create a closing observation or assert complete history: a timestamped balance is
not automatically an end-of-day snapshot. Confirm those separately from the source
before using the reconciliation report. Transactions retain unknown classifications
until reviewed. Schema-2 provenance includes the original file digest. Limits and
safe-path handling match the ordinary import pipeline; external entities and
malformed markup are rejected. Raw files are not copied automatically.
