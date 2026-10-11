# Institutions and practical comparisons

Version 1.0.0. Reviewed 2026-10-09; review due 2027-01-09. Global design; the
[CFPB banking overview](https://www.consumerfinance.gov/consumer-tools/bank-accounts/)
is a US-only primary source for account-use topics, not worldwide eligibility.
The [import roadmap](../docs/roadmap.md) owns planned provider coverage.

Comparison implementation specification: store provider, product, country,
eligibility, source date, fee schedule, currency, limits and usage assumptions.
Compare the user's dated cashflows, including fixed and variable fees, rather than
inventing a best institution. Separate issuer exposure from custody institution
exposure; recorded institution names do not prove deposit protection or safety.

FX-route comparisons need amount, timing, both currencies, actual quote and all
explicit fees. Credit-card break-even needs annual fees, eligible spending, reward
valuation and caps; unvalued perks stay qualitative. No affiliate ranking, default
partner roster, invented offers or copied privacy guarantees. Subscription,
insurance and beneficiary review items are local reminders/document questions,
not permission to send messages or change an external account.

File-first intake keeps downloaded documents under user control. Wise documents
CSV and other statement exports in its [export instructions](https://wise.com/help/articles/2736049/how-do-i-download-a-statement).
DEGIRO distinguishes account activity, trade statements and dated portfolio
snapshots in its [report guide](https://www.degiro.com/uk/helpdesk/tax/tax-treaties/which-reports-are-there-and-where-can-i-find-them).
These instructions establish export availability, not a tested parser contract.

Example: compare two sourced quotes for the same amount/date and show coverage;
if a rate or eligibility is unknown, preserve that gap and avoid a winner.

Installed experimental [quote comparisons](../workflows/comparisons.md) calculate
only dated, user-supplied fee/reward or FX quotes. Source metadata and eligibility
are explicit; no live offers, affiliate rankings or provider recommendations are
inferred. More complex fees and provider integrations retain their separate gates.
