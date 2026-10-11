# Economic scenarios

Version 1.0.0. Reviewed 2026-10-09; review due 2027-04-09. Global analytical design.
Primary project sources: [simulation method](methods.md), [scenario record contract](../docs/contracts.md).

Separate recorded observations from hypothetical inputs. A simulation starts from
confirmed capital, contribution schedule, time horizon, return, volatility and
inflation assumptions. Its probabilities describe the chosen model, not the chance
that real markets will comply. Reproduce the seed and method before comparing runs.

Scenario extensions should vary returns, inflation, income interruption and timing
one at a time and jointly, keep contributions and withdrawals explicit, and expose
unfunded needs. Fee-drag comparisons require both fee assumptions and a stated
compounding convention. Public-data enrichment must preserve vintage, revision,
license, source date and stale/missing status; cached inputs must reproduce offline.

Do not convert political events, tariffs or a country outlook into invented price
forecasts or trading instructions. No scenario guarantees diversification benefits,
liquidity or capital preservation. Example: an inflation shock is an explicitly
supplied alternative; a forecast presented as certainty is unsupported. Long-term
and near-term goals can use different assumptions without implying different facts.
