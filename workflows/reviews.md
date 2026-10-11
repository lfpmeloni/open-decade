# Local reviews, reminders and sharing

Reports use the same deterministic operations in the CLI, browser and agent tools.
Save immutable report snapshots, list them, and compare their structural fields:

```bash
node bin/od.mjs review save --report diagnosis --as-of 2026-01-31 --from 2026-01-01 --policy POLICY_ID --json
node bin/od.mjs review list --json
node bin/od.mjs review compare --from EARLIER_REVIEW_DIGEST --to LATER_REVIEW_DIGEST --json
node bin/od.mjs report reminders --as-of 2026-01-01 --to 2026-03-31 --json
node bin/od.mjs export --report reminders --as-of 2026-01-01 --to 2026-03-31 --format ics --output reminders.ics
node bin/od.mjs export --report net-worth --as-of 2026-01-31 --format xlsx --output picture.xlsx
node bin/od.mjs export --report net-worth --as-of 2026-01-31 --format pdf --redact --output sharing.pdf
```

Snapshots contain the entire result, method version, selected report options and
journal state digest. Same inputs/options deduplicate. Checksums detect corruption;
they are not signatures. Comparisons show field differences, including changed
coverage and options, rather than attributing gains or explaining causes.

Schema-2 reminders are confirmed records with an explicit enabled flag, due date,
completed flag and topic. Insurance and beneficiary reminders can reference inert
document records. Disabled/completed reminders do not appear. Past due means only
that the recorded reminder date precedes the requested view date; it does not infer
a legal deadline. Nothing starts in the background or sends messages.

PDF uses a basic paginated text layout, with non-ASCII characters represented as
Unicode escape sequences. XLSX uses text cells for exact decimal strings and inert
formula-like content. These are review documents, not formatted statements.
Calendar export supports bills and reminders only. It contains all-day events and
no alarms; importing a file into another application is a separate user action.

`--redact` supports only net-worth and cashflow aggregate summaries. It removes
names, source references, record IDs and detailed rows, retaining dates, currencies,
amounts, method version and warning codes. This is not guaranteed anonymization.
Review the file before sharing it. UI masking does not alter an export. Export files
are written exclusively beneath the external vault's `exports` directory.

References: [SpreadsheetML package structure](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/structure-of-a-spreadsheetml-document),
[iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545).
