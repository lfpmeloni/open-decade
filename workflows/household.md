# Opt-in household picture and personal tax contexts

This feature adds an explicitly selected household picture in one
local vault. It does not merge independent vaults, change existing personal
ownership, or pool tax contexts. Follow normal schema-2 preview/apply confirmation.
The [synthetic example](../fixtures/household.json) contains no personal records.

```bash
node bin/od.mjs import preview --file fixtures/household.json --json
node bin/od.mjs import apply --file fixtures/household.json --confirm DIGEST --json
node bin/od.mjs report household --assumptions household-example --as-of 2026-01-01 --base EUR --json
node bin/od.mjs tax checklist --member alex --jurisdiction DE --year 2025 --as-of 2026-10-10 --json
```

Create a dated `household-member` for each participant with an explicit
`participating` flag. A `household-plan` lists members and allocations of asset
ownership or debt responsibility by member. Every allocation refers to a recorded
entity; member shares sum to at most one. Unassigned shares remain shown as outside
this household scope. Correction aliases cannot duplicate members or entities.
To withdraw participation, confirm a superseding member record with the flag false.
The household result then withholds that member's values and consolidated totals.
Effective dates are respected. Participation records assert the user's confirmed
inputs; software does not independently verify another person's consent.

Household shares multiply **gross recorded values**, so personal `ownership` or
`responsibility` is not applied a second time. Existing personal net-worth, cashflow,
goals and policy reports still use their original personal shares. Household shares
express this planning model, not a legal determination of joint liability. Do not
add separate copies of the same joint account for each member.

The same account-versus-holdings selection and valuation method applies. Overlapping
account/holding scope, missing or stale records, incomplete history or unresolved
participation withhold consolidated totals while retaining known member rows and
warnings. Conversion uses existing dated FX, without inventing rates. The report
covers only selected entities, not an assertion that every family asset is recorded.
No household transaction roll-up, household goal allocation, policy execution or
combined retirement calculation is inferred from this picture.

Optional `memberId` on tax contexts and document references binds them to one member.
Use `--member` explicitly for tax checklist/handoff/report/export and saved reviews.
A requested context must belong to that selected member. Member selection also
requires effective participation. Without `--member`, only untagged legacy personal
contexts/documents are used, and a selection warning appears if tagged contexts
exist. Other-country review questions concern the same member only. Documents,
metadata and checklist matches cannot merge across people merely because their
country and year match. A jointly relevant document needs separately confirmed
references for each person. No household filing decision or tax liability is made.

**Shared vault access is shared access to its files.** Participation and member
routing are report controls, not encryption, user accounts or access controls.
Generic record reads, existing reports, backups and exports may still contain
records in that vault. Do not import another person's records unless authorized;
keep separate vaults when separate access is required. Withdrawal does not delete
immutable history, prior reports or backups. See [security](../SECURITY.md).

Independent example: gross cash 1000 shared 25%/75%, with gross debt 400 assigned
10%/50%, gives member net values 210 and 550, consolidated 760. The remaining debt
share is outside the declared scope. A personal owner/responsibility of 25%/10%
still receives 210 in the existing personal report.

## Household cashflow

`report household-cashflow --from DATE --to DATE --assumptions PLAN_ID` reuses the
personal cashflow calculation with report-local gross account shares. It includes
only account allocations; positions and liabilities do not create cash movements.
Personal ownership and the journal remain unchanged. Amounts remain separated by
currency, with each participating member's sources and account shares visible.
Tax contexts and documents are excluded from report inputs.

The plan, member participation and accounts must be effective by the start of the
period. Split reports around dated changes. Complete transaction histories are
required. Missing histories, unknown classifications, opt-outs, unsupported
activity or transfers that do not balance under a member's shares withhold the
consolidated result while retaining useful member-level recorded amounts. An
internal transfer with unequal shares can represent a redistribution; no income,
gift or tax interpretation is invented. Cross-currency and out-of-scope transfer
legs remain unresolved. Unassigned account shares stay explicit. This does not
automatically merge individual retirement or housing scenarios.

## Pooled household scenario showcase

Confirm a `retirement-scenario` containing **one aggregate set** of spendable initial
capital, income, spending and pension assumptions, plus at least one sensitivity.
Add its ID as optional `scenarioId` on the selected `household-plan`, using normal
preview/apply. Existing plans remain valid without this field.

```bash
node bin/od.mjs report household-scenario --assumptions household-example --as-of 2026-01-01 --json
```

The updated synthetic fixture supplies this link. The showcase calls retirement-v2
once. Initial capital is the confirmed pooled assumption, not household net worth
or the sum of individual scenarios. Both members must be effective and opted in;
participation and the plan must cover the scenario start. Unsupported currency or
not-yet-effective expenses withhold projection cases. Sources include the plan,
members, scenario and referenced expenses; personal tax records are excluded.

Independent example: pooled capital 100, income 100, spending 50, retirement after
two months and pension 20 gives terminal capital 140 over four zero-growth months.
Immediate retirement instead preserves an unfunded need of 20. Members' existing
ownership/responsibility, personal reports and tax checklists remain unchanged.
This completes the bounded household showcase; richer household models can be
selected later during use. The same report is available in browser Reports, stdio,
saved reviews and portable exports.
