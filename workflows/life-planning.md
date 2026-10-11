# Retirement and housing scenarios

These deterministic reports use confirmed schema-2 assumptions. They
are conditional calculations, not forecasts, recommendations, tax calculations or
instructions to place orders. No returns, inflation, income, fees or house prices
are supplied by the application. Use the normal import preview/apply workflow.

Try [the synthetic examples](../fixtures/life-planning.json) in a separate schema-2
vault; the deliberately simple values are not recommended assumptions:

```bash
node bin/od.mjs import preview --file fixtures/life-planning.json --json
node bin/od.mjs import apply --file fixtures/life-planning.json --confirm DIGEST --json
node bin/od.mjs report retirement --assumptions retirement-example --as-of 2026-01-01 --json
node bin/od.mjs report housing --assumptions housing-example --as-of 2026-01-01 --json
```

The browser Reports page accepts the same assumptions record ID. CLI, browser,
stdio reports, saved reviews and exports all use these methods. Each report retains
the full confirmed assumptions, source IDs and user-supplied sensitivity overrides.
Only effective records may be selected, including corrected IDs. At least one named
sensitivity case is required; no default optimistic or pessimistic case is invented.
Annual growth rates must exceed −100% and are bounded at 1000% for this model.
Scenarios span 1–1200 months and at most eight additional cases.

## Common timing and precision

`startMonth` must be the first day of a month, on or after the record's effective
date. The first row closes at that month's end. Annual effective investment return
and growth assumptions become monthly factors `(1 + annual rate)^(1/12)`. Initial
capital grows before each month's end cashflows. Cashflow growth starts in month
two, so month one uses the exact supplied amount. Returns must be net of fees.
Retirement-v2 and housing-v2 use 120 guard digits and return 40 significant
digits, without imposing currency rounding. Only a resource/cost difference no
larger than the greater absolute value multiplied by 10^-110 is treated as numerical
noise from monthly roots. Comparing rounded display values never erases a shortfall. Real terminal values divide by the inflation factor for the
full modeled horizon. No probabilities or expected actual outcomes are computed.

## Retirement accumulation and drawdown

A `retirement-scenario` supplies initial capital, spendable monthly earned income,
spending, pension, retirement timing, return, inflation and separate income/pension
growth. `retireAfterMonths: 0` starts drawdown immediately. Otherwise earned income
continues through that many months, with pension replacing it in the next month.
Pension growth starts with its second payment; it is not escalated before retirement.

Each month: grow capital, add income or pension, then deduct inflation-adjusted
spending and explicitly referenced planned expenses. Expense amounts are nominal,
additional to regular spending, and included once in their due month. Duplicate
references through corrected aliases are rejected. Other-currency or not-yet-effective
expenses withhold the projection; no future FX rate is invented. Expenses outside
the horizon remain listed with a warning. Unreferenced expenses are not implicitly
included, so confirm completeness of the selected expense list.

When resources are insufficient, capital stops at zero and the unmet amount remains
in the row, total shortfall and first-shortfall date. It is never treated as borrowed
money or erased because later income arrives. Initial capital is a scenario input,
not a reservation of assets for a goal. This method does not change goal funding.
Sensitivity cases can change return, inflation, income, spending, pension and
retirement timing; all other inputs inherit explicitly from the base record.

Independent example: capital 100, monthly income 100, spending 50, retirement after
two months, then pension 20, with zero growth, produces balances 150, 200, 170, 140.
Immediate retirement instead produces 70, 40, 10, 0 and preserves 20 unmet spending.

## Mortgage and rent-versus-buy

A `housing-scenario` supplies price, down payment, purchase costs, sale-fee fraction,
fixed nominal mortgage APR, mortgage term, initial capital, available monthly housing
budget, rent, owner costs, and separate investment/house/rent/inflation growth.
Owner costs must include all intended recurring ownership expenses; they are supplied
amounts, not calculated insurance, maintenance or tax liabilities. The available
budget is fixed nominal and should already exclude other life expenses.

Loan principal is price minus down payment. Monthly rate is APR/12. Scheduled payment
is `principal × rate / (1 − (1 + rate)^(-term))`, or principal/term at zero interest.
Interest accrues before each payment. The final contractual payment clears residual
principal; later months have no mortgage payment. No refinancing or variable rates.

Buyer capital starts after down payment and purchase costs; renter capital starts
with all initial capital. Both receive the identical budget each month. Buyer pays
the mortgage and inflation-adjusted owner costs; renter pays rent grown at its own
rate. Remaining invested capital earns the supplied net return in either path.
At the horizon, buyer value includes the house after the supplied selling fee minus
remaining debt. Renter value is its investment capital. Negative home equity remains
negative. Relocation, rental deposits, mortgage insurance and other costs are absent
unless included in the supplied amounts.

Funding gaps are shown, including an unaffordable initial purchase. Contractual
mortgage balances then describe a hypothetical fully paid schedule; the report marks
the path noncomparable and withholds buyer-minus-renter. It does not invent financing
for missed payments or decide which choice is suitable.

Independent zero-rate example: price 1200, no down payment or fees, 12-month loan,
budget 100 and rent 80, with no growth, gives buyer equity 1200 and renter capital 240.
The comparison is 960 only under those assumptions. Reducing the budget to 50 creates
buyer shortfall 600 and renter shortfall 360; comparison is unavailable.

These methods complete only part of round 12. [Fractional goals and allocation
drafts](allocation-plans.md) are separate operations. Household participation and
stochastic retirement workflows remain outside these two reports.

The supplied-assumption acceptance gate includes independent nominal/real growth,
retirement timing, earned-income and pension growth, inflation, planned expenses,
mortgage rational arithmetic, funding gaps below display comparison precision and
annual-root roundoff. Available status covers these documented deterministic models;
the [pooled household showcase](household.md) completes the selected household scope.
