# Official economic evidence and offline vintages

Experimental explicit acquisition supports two fixed series:

| ID | Scope and units | Review threshold |
|---|---|---|
| `ecb-deposit-rate` | ECB euro-area deposit-facility rate, percent per annum | More than 7 calendar days |
| `euro-area-inflation` | Eurostat euro-area changing-composition HICP total annual percent change, not seasonally adjusted, disseminated by ECB | More than 75 days from reference-month start |

These thresholds request review; they are not publication schedules. Rates are not
retail offers and HICP is not a user's personal inflation forecast. Percent values
are not silently divided by 100 or inserted into planning assumptions.

```bash
node bin/od.mjs data catalogue --json
node bin/od.mjs data fetch --series ecb-deposit-rate --json
node bin/od.mjs data fetch --series euro-area-inflation --json
node bin/od.mjs data series --series euro-area-inflation --as-of 2026-10-11 --json
node bin/od.mjs data series --series euro-area-inflation --as-of 2026-10-11 --cache DIGEST --json
```

Use an initialized external vault. Only `data fetch` accesses the network. Each
fixed HTTPS URL requests at most 24 observations, refuses redirects, times out
after 15 seconds and caps its body at 500 kilobytes. Unexpected keys, units,
multipliers, duplicate periods, malformed values and future periods fail without
replacing any cached data. No credentials are used or accepted.

Each immutable digest-addressed vintage stores raw source content, capture time,
source URL, units, metadata, adjustment statement and source terms. Reports can
select an exact digest offline. The shared `data series` operation and MCP
`economic_data` tool are read-only; neither fetches nor applies financial records.
Backups include the cache. No scheduled acquisition or external messages occur.

Missing values stay null; preliminary/estimated and unknown source status codes
stay distinct. An observation's reference period is not a publication timestamp.
An as-of view excludes later retrievals from automatic selection and from revision
detection. Explicitly selecting a future vintage labels it future. Revisions
compare both values and source flags only across vintages available by the as-of
date. A failed fetch returns an error while preserving previous vintages. Empty
caches, future-only caches and stale observations are distinguishable.

Reviewed 2026-10-11 against [ECB API CSV examples](https://data.ecb.europa.eu/help/api/data-examples),
[deposit-rate series](https://data.ecb.europa.eu/data/datasets/FM/FM.D.U2.EUR.4F.KR.DFR.LEV),
[current HICP series](https://data.ecb.europa.eu/data/datasets/HICP/HICP.M.U2.N.000000.4D0.ANR)
and [ECB reuse terms](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html).
The [former ICP dataset was discontinued](https://data.ecb.europa.eu/data/datasets/ICP/data-information?showDatasetModal=false)
in February 2026. This implementation uses HICP and never silently joins the old
series across that methodology change. Attribute ECB and the underlying Eurostat
source as appropriate; source terms are not replaced by the project license.

Fixtures contain invented values with documented series identifiers and units.
Direct public endpoint layout inspection is not a financial correctness or ongoing
availability guarantee. Issuer holdings, fees, security prices and other countries'
economic series remain separate pending capabilities.
