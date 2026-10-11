# Country/year tax document organization

The installed document modules cover starting tax year 2025 for US federal,
Germany, UK (6 April 2025–5 April 2026), France, Spain, Italy and Netherlands.
Each [country module](../knowledge/tax.md) contains dated official-source links,
conditional deadline references and original document-collection questions.
They do not determine residence, liability, filing obligations, forms to submit or
which tax treatment is best. No return is generated or submitted.

```bash
node bin/od.mjs tax checklist --jurisdiction DE --year 2025 --as-of 2026-10-09 --json
node bin/od.mjs tax handoff --jurisdiction DE --year 2025 --as-of 2026-10-09 --json
node bin/od.mjs export --report tax --jurisdiction DE --year 2025 --as-of 2026-10-09 --format json --output preparer-review.json --json
```

Confirm tax-context records through normal import: jurisdiction, year, residence
status, yes/no/unknown answers for investment income, disposals, foreign accounts,
wrappers and retirement income, plus special cases. Use --context ID when multiple
active contexts exist for a country/year. Contexts belong to the person represented
by this vault; another household member's tax facts must not be combined implicitly.

Confirm document-reference records with jurisdiction/year, type, name, status and
an inert private reference. The program does not open the referenced file, ask for
credentials/identity numbers or verify document contents. References marked present
do not establish that every account/document is covered. Handoff returns these
references, source metadata, unanswered questions and country-specific guidance;
export remains local and contains private references, so review it before sharing.

Deadlines are displayed as conditional official calendar references, never personal
filing determinations. Past dates are not automatically labeled overdue. Extensions,
notices, residence and special cases can change applicability. Once a guide's review
date expires (or before its review date), deadlines are withheld until review.
Unsupported years return useful routing information without borrowing another year's
rules. Cross-border cases retain separate country questions and professional review.
US state/local, trusts, estates, businesses, special regional regimes and treaty
applications are not resolved by this module.

For [household members](household.md), provide `--member MEMBER_ID`. Tagged contexts,
documents, source metadata and cross-country questions remain within that member.
Without a member selection, only legacy untagged personal records are used. A
member context cannot be selected through `--context` alone. Saved reviews retain
the member selection. These are report filters, not access controls on the vault.
