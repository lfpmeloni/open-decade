# Named-provider file imports

`import formats` lists installed format profiles. Provider support is scoped to a
specific product, header profile, language and explicit country selection. It is
not a promise that every export from that institution works.

## Wise English COMPACT CSV — experimental

Profile `wise-compact-en-v1` accepts single-currency balance statements with the
English columns `TransferWise ID`, `Date`, `Amount`, `Currency`, `Description`, and
`Running Balance`. Additional known English statement columns may appear; unknown,
missing or duplicate headers fail closed. The explicit mapping accepts DE, GB and
US account contexts. Synthetic acceptance is not live export certification.

Reviewed 2026-10-11: [Wise export instructions](https://wise.com/help/articles/2736049/how-do-i-download-a-statement)
and [balance-statement specification](https://docs.wise.com/api-reference/balance-statement/balancestatementget).
Select the relevant currency and period and download a CSV statement. Confirm
English COMPACT output; Wise distinguishes COMPACT from FLAT output with separate
fee lines. This adapter does not support FLAT, pending activity or investment
holdings. The legacy English header example is published in
[Wise's public API workspace](https://www.postman.com/transferwise/transferwise-s-public-workspace/documentation/x7ldecw/wise-multi-currency-account-api?entity=request-19030365-e6292ba3-cb8b-44ec-8c5f-1775e7f0dd6b).
No source example or personal statement is copied into fixtures.

```bash
node bin/od.mjs import formats --json
node bin/od.mjs import preview --adapter wise-csv --file fixtures/imports/wise.csv --mapping fixtures/imports/wise-mapping.json --json
node bin/od.mjs import apply --adapter wise-csv --file fixtures/imports/wise.csv --mapping fixtures/imports/wise-mapping.json --confirm DIGEST --json
```

The example requires an existing EUR account `a`. Use your confirmed local account
ID, capture timestamp, country, date interpretation and decimal/group separators.
The browser exposes the same adapter in Import review with mapping controls.
Currency must match the account. Nothing guesses residence from a statement.

Stable source IDs use the existing [mapped CSV](mapped-import.md) contract:
repeats and overlapping exports reuse records, changes require an explicit
`corrections` mapping, and account corrections preserve the original source
namespace. Classifications remain unknown. Imported descriptions are data.

Running balances and disclosed fees are preview metadata. Amount is imported once;
fees are not subtracted again. No observation or complete-history record is created.
Review source snapshots separately, then use the normal reconciliation report.
Schema-2 records retain the original file digest; raw files are not copied.

IBKR, Schwab, Fidelity, Vanguard, Revolut, N26, Trade Republic and DEGIRO adapters
remain unavailable. Their layout, identity, pending/posted and correction gates are
not satisfied by relabeling the generic CSV mapper. Use explicit column mapping
when stable IDs exist, supported OFX, or confirmed host extraction otherwise.
