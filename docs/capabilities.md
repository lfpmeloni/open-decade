# Installed capability listing

Generated from [the registry](../src/capabilities.mjs). Run `npm run docs` after
changing statuses; planned entries are unavailable, experimental entries have limited
acceptance. See [the roadmap](roadmap.md) for full round gates.

| Capability | Status | Command | Scope and limits |
|---|---|---|---|
| [capabilities](../workflows/local-analysis.md) | available | capabilities | See docs/contracts.md and knowledge/methods.md |
| [doctor](../workflows/local-analysis.md) | available | doctor | See docs/contracts.md and knowledge/methods.md |
| [init](../workflows/local-analysis.md) | available | init | See docs/contracts.md and knowledge/methods.md |
| [import](../workflows/local-analysis.md) | available | import preview / apply | See docs/contracts.md and knowledge/methods.md |
| [net-worth](../workflows/local-analysis.md) | available | report net-worth | See docs/contracts.md and knowledge/methods.md |
| [cashflow](../workflows/local-analysis.md) | available | report cashflow | See docs/contracts.md and knowledge/methods.md |
| [reconciliation](../workflows/local-analysis.md) | available | report reconciliation | See docs/contracts.md and knowledge/methods.md |
| [goals](../workflows/local-analysis.md) | available | report goals | See docs/contracts.md and knowledge/methods.md |
| [exposure](../workflows/local-analysis.md) | available | report exposure | See docs/contracts.md and knowledge/methods.md |
| [costs](../workflows/local-analysis.md) | available | report costs | See docs/contracts.md and knowledge/methods.md |
| [performance](../workflows/local-analysis.md) | available | report performance | See docs/contracts.md and knowledge/methods.md |
| [simulation](../workflows/local-analysis.md) | available | simulate goal --mode scenario / monte-carlo | See docs/contracts.md and knowledge/methods.md |
| [export](../workflows/local-analysis.md) | available | export --report NAME --format json / markdown / csv / pdf / xlsx / ics | See docs/contracts.md and knowledge/methods.md |
| [backup](../workflows/recovery.md) | available | backup --output FILE | docs/schema-2.md |
| [restore](../workflows/recovery.md) | available | restore --file FILE --destination DIRECTORY | docs/schema-2.md |
| [migration](../workflows/recovery.md) | available | migrate preview / apply --file BACKUP --destination DIRECTORY | docs/schema-2.md |
| [readiness](../workflows/recovery.md) | available | report readiness --as-of DATE | docs/schema-2.md |
| [provider-file-imports](../docs/roadmap.md) | available | import formats | Completed file-first framework; additional provider formats are user-selected follow-up; consult individual adapter limits. |
| [investment-policy-planning](../docs/roadmap.md) | available | report household-scenario --assumptions PLAN_ID --as-of DATE | Completed bounded personal planning and opt-in pooled household showcase; no orders or combined tax. |
| [public-data](../docs/roadmap.md) | available | data catalogue | Completed explicit cache/acquisition boundary; additional sources and licenses are user-selected follow-up. |
| [read-only-connections](../docs/roadmap.md) | available | connection status | Completed optional reporting boundary; live provider coverage remains governed by each connector; expansion is user-selected follow-up. |
| [periodic-reviews](../docs/roadmap.md) | available | review list | Completed local reviews, exports, reminders and supplied-quote comparisons; additional provider offers/imports are follow-up. |
| [cross-platform-distribution](../docs/roadmap.md) | available | maintenance --as-of DATE | Completed local release gates for WSL2/Linux runtime and bounded Chromium accessibility; other native environments are outside release scope. |
| [knowledge-catalogue](../knowledge/INDEX.md) | available | knowledge search / show --as-of DATE | Specifications do not enable planned operations; dated reviews, no tax rules. |
| [mapped-csv](../workflows/mapped-import.md) | available | import preview / apply --file FILE --mapping JSON | No provider-specific or snapshot parsing |
| [local-application](../workflows/application.md) | available | node bin/od-web.mjs | Chromium workflow tested in WSL/Linux; keyboard/mobile checks pass; bounded accessibility baseline; other native platforms and screen-reader certification are outside release scope |
| [stdio-mcp](../workflows/application.md) | available | node bin/od-mcp.mjs | Bounded reads and shared preview/apply; stdio subprocess and protocol parity tested; host-specific setup is outside the bounded integration gate |
| [spending](../workflows/spending.md) | available | report spending --from DATE --to DATE | Detection is proposal-only; missing coverage blocks complete rates/budgets |
| [spending-proposals](../workflows/spending.md) | available | report spending-proposals --from DATE --to DATE | Detection is proposal-only; missing coverage blocks complete rates/budgets |
| [bills](../workflows/spending.md) | available | report bills --from DATE --to DATE | Detection is proposal-only; missing coverage blocks complete rates/budgets |
| [ofx-bank](../workflows/ofx.md) | experimental | import preview / apply --adapter ofx --file FILE --mapping JSON | No pending, investment, credit-card or automatic balance/history import |
| [financial-diagnosis](../workflows/policy-review.md) | available | report diagnosis --from DATE --as-of DATE --policy ID | Recorded direct exposures, goal-protected reserve and overdue obligations; missing coverage remains unknown; no execution plan or tax savings |
| [profile](../workflows/policy-review.md) | available | profile preview / apply / show | See method conventions and remaining life-planning scope |
| [policy](../workflows/policy-review.md) | available | policy preview / apply / show | See method conventions and remaining life-planning scope |
| [fee-drag](../workflows/policy-review.md) | available | report fee-drag --assumptions ID --as-of DATE | See method conventions and remaining life-planning scope |
| [debt-paydown](../workflows/policy-review.md) | available | report debt-paydown --as-of DATE | See method conventions and remaining life-planning scope |
| [tax-documents](../workflows/tax.md) | available | tax checklist / handoff --jurisdiction CODE --year YEAR --as-of DATE | Document collection and conditional source dates only; no liability, filing decision or submission |
| [reminders](../workflows/reviews.md) | available | report reminders --as-of DATE --to DATE | Structural comparison only; basic text PDF/XLSX; calendar export has no notifications; aggregate sharing is not anonymization |
| [review-history](../workflows/reviews.md) | available | review save / list / compare | Structural comparison only; basic text PDF/XLSX; calendar export has no notifications; aggregate sharing is not anonymization |
| [portable-exports](../workflows/reviews.md) | available | export --report NAME --format pdf / xlsx / ics | Structural comparison only; basic text PDF/XLSX; calendar export has no notifications; aggregate sharing is not anonymization |
| [sharing-summary](../workflows/reviews.md) | available | export --report net-worth / cashflow --redact | Structural comparison only; basic text PDF/XLSX; calendar export has no notifications; aggregate sharing is not anonymization |
| [ecb-reference-fx](../workflows/public-data.md) | experimental | data fetch / status / preview / apply | Dated FX cache/proposals only; rate/inflation is a separate capability; no market prices, automatic application or live-source certification |
| [retirement](../workflows/life-planning.md) | available | report retirement --assumptions ID --as-of DATE | Deterministic conditional calculations; unfunded needs retained; no tax, orders, inferred assumptions or household allocation |
| [housing](../workflows/life-planning.md) | available | report housing --assumptions ID --as-of DATE | Deterministic conditional calculations; unfunded needs retained; no tax, orders, inferred assumptions or household allocation |
| [goal-fractions](../workflows/allocation-plans.md) | available | report goals --as-of DATE | Legacy goals still claim full entities; overclaims and missing coverage remain unresolved |
| [allocation-plan](../workflows/allocation-plans.md) | available | report allocation-plan --as-of DATE --assumptions ID | Protects recorded goal earmarks and reserves; no security orders, fees, taxes or suitability verdict |
| [household](../workflows/household.md) | available | report household --as-of DATE --assumptions ID | Shared-vault selected financial picture; no access controls, merged tax or automatic household scenarios |
| [fee-comparison](../workflows/comparisons.md) | available | report fee-comparison --assumptions ID --as-of DATE | Bounded fee/reward or source-fee FX model; no live offers, provider ranking or money movement |
| [fx-comparison](../workflows/comparisons.md) | available | report fx-comparison --assumptions ID --as-of DATE | Bounded fee/reward or source-fee FX model; no live offers, provider ranking or money movement |
| [maintenance-queue](../workflows/maintenance.md) | available | maintenance --as-of DATE | Read-only manual review queue; no live format detection or platform certification |
| [wise-csv](../workflows/provider-imports.md) | experimental | import preview / apply --adapter wise-csv --file FILE --mapping JSON | Synthetic header profile only; no live export certification, pending/FLAT/holdings import or automatic balance/history records |
| [household-cashflow](../workflows/household.md) | available | report household-cashflow --from DATE --to DATE --assumptions ID | Account gross shares only; unequal-share, missing-account and cross-currency transfers unresolved; no tax consolidation |
| [economic-series](../workflows/economic-data.md) | experimental | data fetch --series ID; data series --series ID --as-of DATE | Percent units and preliminary flags retained; no automatic forecasts or financial records; no issuer/price coverage |
| [ibkr-flex-reporting](../workflows/connections.md) | experimental | connection configure / status / sync / preview / apply / disconnect | Credential-free protocol tests only; real consent/sync/revoke and OS integration unverified. Linux/macOS credential utility boundary; no native Windows, Plaid, positions, orders or automatic apply. |
| [household-scenario](../workflows/household.md) | available | report household-scenario --assumptions PLAN_ID --as-of DATE | One pooled supplied-assumption showcase; no automatic pooling of individual capital, legal ownership change or merged taxes |
