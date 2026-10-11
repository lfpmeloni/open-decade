# Verified recovery and schema 2

Use an initialized external vault and new external destinations. All examples are
synthetic; backup files contain the complete vault including raw sources, private
preferences and reports. They are not encrypted or suitable for public sharing.

```bash
node bin/od.mjs backup --vault /tmp/example-vault --output /tmp/example-backup.json --json
node bin/od.mjs restore --file /tmp/example-backup.json --destination /tmp/example-restored --json
node bin/od.mjs migrate preview --vault /tmp/example-vault --file /tmp/example-backup.json --destination /tmp/example-v2 --json
node bin/od.mjs migrate apply --vault /tmp/example-vault --file /tmp/example-backup.json --destination /tmp/example-v2 --confirm DIGEST --json
node bin/od.mjs report readiness --vault /tmp/example-v2 --as-of 2026-01-01 --json
```

Use the confirmation returned by migration preview. Changing source files, backup
or destination invalidates it. Migration restores and validates the complete backup
before changing only the destination's schema marker and adding a migration receipt.
The source remains usable with old software. Both vaults can still accept schema-1
batches; only schema-2 vaults accept schema-2 batches. Initialization defaults to
schema 1 so upgrades are always explicit.

Backups verify checksums and replay in a separate temporary vault. Restore and
migration require a nonexistent destination. A complete staged vault is published
only after verification. They reject links, special files, traversal, malformed
journals and conflicting destination locks. Backups exclude writer locks and
staged files. Limits: 10,000 files and 100 MB decoded data; empty ancillary
directories and filesystem metadata are not preserved. SHA-256 detects accidental
changes; it does not authenticate a backup from an untrusted party.

An interrupted restore may leave a sibling `.stage-restore-*` directory and
`DESTINATION.restore-lock`. Check that no process is active, inspect the source and
backup, then remove only that interrupted staging directory and reservation before
retrying. Never delete the original vault to recover a failed migration. Recovery
has been tested in WSL/Linux; other platform gates remain planned.

The [schema-2 contract](../docs/schema-2.md) explains richer records and limits.

After migration, preview `fixtures/schema-2.json` through the normal import pipeline.
It is a synthetic example with an unresolved instrument, incomplete history and
missing acquisition cost/cash linkage. Its warnings are intentional; no acquisition
cost or cash transaction should be invented to suppress them.
