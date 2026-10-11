# Asset evidence and unresolved instruments

Version 1.0.0. Reviewed 2026-10-09; review due 2027-04-09. Applies globally to
supplied records, not to product eligibility or tax treatment. Primary project
sources: [schema 2](../docs/schema-2.md) and [analytical methods](methods.md).

The application separates identity, observed market value, quantity, cash activity,
fees and ownership. A ticker alone may be ambiguous across markets; preserve its
market alongside any supplied ISIN, CUSIP, SEDOL or provider identifier. A fund's
holdings disclosure has its own date and coverage, which may differ from the user's
holding valuation. Missing constituents remain unknown exposure.

Implementation specification for future asset guidance: collect issuer, legal
instrument type, currency, maturity, liquidity restrictions, valuation date,
disclosed costs and source documents. Equity, sovereign debt, corporate debt,
inflation-linked debt, funds, property, gold and crypto require different evidence;
labels must not imply guarantees. Factor tilts, emerging-market exposure and
structured/alternative instruments must retain their specific risks and unresolved
terms. A product outside tested coverage remains visible without an invented
classification, risk score or suitability conclusion.

No universal preferred asset or house allocation follows from these fields.
Example: a recorded bond value without maturity or settlement terms can enter net
worth, but cannot establish that it will fund next month's bill. Corporate actions
need reconciled observations; reported before/after quantities do not establish tax
basis. Product-specific recommendations require independently reviewed primary
sources and a confirmed policy; this document does not provide them.
