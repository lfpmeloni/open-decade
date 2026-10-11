# Optional ECB reference FX acquisition

This experimental adapter makes one explicit HTTPS request to the ECB daily XML
endpoint. It sends no vault records, credentials or account identifiers. Normal
reports, UI startup, diagnostics and agent reads make no data-provider requests.
The endpoint is fixed, redirects are rejected, the request times out after fifteen
seconds and decoded responses are limited to 200 kilobytes.

```bash
node bin/od.mjs data fetch --json
node bin/od.mjs data status --as-of 2026-10-09 --json
node bin/od.mjs data preview --cache CACHE_DIGEST --json
node bin/od.mjs data apply --cache CACHE_DIGEST --confirm CONFIRMATION --json
```

Fetch writes an immutable cache only. Preview/apply works offline and requires
schema 2. Repeated rates reuse recorded objects; a changed rate for an already
recorded date proposes an explicit correction. Review the proposal before applying.
The cache retains raw XML, observation date, retrieval timestamp, raw and manifest
hashes, source URL, transformations and a terms reference. Reports cite the cache
through source provenance. Backups include all cached vintages.

Status distinguishes missing, future, cached and stale data; differing observations
for the same date are marked revised. The seven-calendar-day stale threshold is an
application display policy, not an ECB publication guarantee. An unavailable fetch
fails without altering previous caches or records. Cache presence does not establish
comprehensive currency coverage. Existing report FX freshness checks still apply.

The [ECB reference-rate page](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)
identifies EUR as the base and describes these as information rates, unsuitable for
transaction pricing. [ECB terms](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html)
require attribution and disclosure of transformations; check their additional
conditions before redistribution. Terms reviewed 2026-10-09. No copied dataset is
bundled in the public package. Tests use synthetic responses, not certified live
coverage. Changed XML layouts fail closed.

Interest-rate/inflation series, issuer disclosures and licensed prices remain
planned. Provider credentials and financial account connections are not part of
this adapter.
