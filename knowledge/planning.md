# User policy and planning specification

Version 1.1.0. Reviewed 2026-10-11; review due 2027-04-09. Global application design,
not a model portfolio. Primary project sources: [roadmap rounds 9–12](../docs/roadmap.md)
and [current methods](methods.md). Planned operations remain unavailable until
listed as available in the registry.

A policy records its effective date, goals, reserve target, liquidity requirements,
asset/currency bands, concentration limits, exclusions, contribution constraints
and review triggers. Every threshold is a user choice with a rationale. Risk
tolerance records willingness to bear losses; capacity records ability to meet
obligations under loss or income interruption. Neither a questionnaire score nor
an account balance can stand in for the other.

Reserve coverage requires explicitly classified essential spending, a complete
period and eligible accessible assets chosen by the user. Planned expenses have
currency, due date and amount; capital assigned to one need cannot silently fund
another. Currency allocation starts from recorded liabilities and preferences,
without a default domestic/foreign split. Illiquid assets keep access restrictions
and exit uncertainty. Debt plans require balances, rates, payment terms and fees;
unknown terms prevent an invented amortization schedule.

Retirement, long-horizon contribution schedules, mortgages and rent-versus-buy
compare explicit cashflows and sensitivity to timing, income, inflation, returns,
maintenance and fees. They are scenarios, not forecasts or tax calculations.
Household participation is opt-in, with explicit ownership and separate residence
and tax-document contexts. Draft rebalancing respects user bands and preserves
unfunded needs; no order is placed.

Diagnosis implementation: report input references, method version, policy version,
threshold, severity, remedy and missing coverage for each cost, composition,
liquidity, concentration, debt or goal finding. There is no composite proprietary
health score. Missing costs or holdings cannot earn a healthy verdict. Cost drag
uses explicit alternative fees and growth assumptions; it never invents tax savings.

Example: if two goals both name the same account, flag the overlap before displaying
funded progress. If income history is incomplete, label reserve months unavailable
instead of dividing assets by an observed low-spending month.

Independent background: the SEC [asset-allocation guide](https://www.investor.gov/introduction-investing/getting-started/asset-allocation)
discusses horizon, tolerance, diversification and rebalancing. Reviewed 2026-10-09;
US investor education, not a source of default policy thresholds.

Installed [retirement and housing methods](../workflows/life-planning.md)
use confirmed assumptions, explicit sensitivity variants and bounded month-by-month
calculations. Inspect unmet needs before comparing terminal values. An [opt-in household picture](../workflows/household.md) preserves explicit shares
and personal tax contexts; household cashflow and the pooled scenario showcase are available. [Allocation drafts](../workflows/allocation-plans.md)
are a separate supplied-target method, using explicit user targets and recorded
reserve/goal protections.
