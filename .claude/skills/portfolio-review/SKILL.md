---
name: portfolio-review
description: X-ray the user's current portfolio and write prioritized attention points to data/attention.json. Use for "review my portfolio", "what should I fix", or before optimizing.
---

# Portfolio review (diagnosis before prescription)

1. Refresh prices if any quote is older than 1 day or missing: run the `market-data` skill.
2. Get the numbers: `node app/portfolio.mjs` prints the snapshot (values, weights, by class, by currency, stale and missing prices). Read `data/profile.md`.
3. Run every check in `knowledge/methodology.md` § Attention checks. Use the profile; when it lacks something a check needs, raise an attention point asking for it instead of guessing.
4. Overwrite `data/attention.json` with all current points (max ~10, most important first):

```json
[{"id": "reserve-short", "severity": "high", "title": "Emergency reserve covers 2 of 6 months",
  "detail": "Short why + what to do, with the numbers used.", "date": "YYYY-MM-DD"}]
```

`severity`: `high` (risk of real harm or forced selling), `medium` (meaningful drag or drift), `low` (hygiene / missing info). Use stable ids so points can be tracked across reviews.

5. Save the full review to `data/recommendations/YYYY-MM-DD-review.md`: snapshot date, quote dates, each finding with numbers, assumptions, what data was missing.
6. Reply in chat with the top 3 points only (Level 1), and offer to optimize.
