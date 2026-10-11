# Contributing

Start with [README.md](README.md) for current availability and
[the architecture](docs/architecture.md) for design boundaries. This is the
complete contribution process for people and agents, using the published source
and documented prerequisites.

## Working today

Use Node **24.20.0**, npm **11.19.0**, and `npm ci` with the committed lockfile.
Runtime dependencies are pinned exactly. Run `npm test` for synthetic acceptance
checks and `npm run check` for syntax, local documentation links, package contents,
and a fresh public-only offline installation/CLI smoke test. After installation,
checks need no network, private files, credentials, models or personal records.
CI installs locked dependencies, then runs those offline checks with read-only
repository permissions. No test may use the personal default vault.

## One workflow for an improvement

1. **Describe the gap.** State the requested outcome, current behavior, and any
   supported workaround. Check existing issues when a project remote is available.
   Use synthetic examples; follow [SECURITY.md](SECURITY.md) for public material.
2. **Scope one change.** Define observable acceptance criteria and explicit
   exclusions. Discuss changes to public contracts or product boundaries before
   implementation; small compatible fixes can proceed directly.
3. **Isolate the work.** Check repository status and preserve unrelated edits.
   Use a focused branch or worktree. Point every development run
   at an external temporary vault containing synthetic records.
4. **Use the existing boundary.** Extend an adapter, domain operation, schema,
   workflow, or knowledge method. Prefer a small module over a new framework or
   plugin system. Review any new dependency for necessity and maintenance cost.
5. **Verify the behavior.** Run checks relevant to the change, then the required
   repository checks. Demonstrate success, incomplete input, and meaningful
   failure handling. Do not label a feature available until its checks pass.
6. **Update the owning sources.** Update the relevant contract or method,
   capability entry, user example, and release note. Link to existing policy
   rather than copying it into another file.
7. **Review and commit.** Inspect the complete diff and outgoing commit history;
   stage explicit paths. Check for unrelated files and private content. Use a
   message describing the change, such as `feat: import example bank CSV`.
8. **Submit when requested.** Push to an appropriate contribution branch or fork
   and open a focused PR. Use a draft if the work is incomplete. Never treat a
   private branch name as protection on a public repository.
9. **Maintain the result.** Resolve review findings and record remaining limits.
   If an adapter later breaks, expose that failure, assign follow-up work, and
   deprecate it honestly rather than silently returning partial data as complete.

A financial question does not authorize a platform change. Explain the missing
capability and offer a focused task. A request to implement it authorizes the
local development work. Follow the user's instructions for committing and
publishing; do not repeatedly ask for authorization already given. If a remote
or credentials are unavailable, leave a reviewable local result and state the
blocker. Merge and release remain maintainer decisions.

## Scope and protected contracts

Tie each improvement to an accepted [roadmap follow-up](docs/roadmap.md#follow-up-selected-during-use),
a concrete regression, or a [maintenance need](workflows/maintenance.md). For a new
topic, open a scoped issue with the outcome and exclusions before implementation.
The completed 0–16 roadmap is not an authorization to expand every capability.
Fixes and compatible extensions may proceed through existing interfaces.

Core contracts are deterministic decimal calculations, immutable provenance,
proposal-bound confirmation, atomic writes, explicit migration, honest missing-data
results, local security boundaries, and the exclusion of financial execution.
Their owning definitions remain in [the architecture](docs/architecture.md),
[contracts](docs/contracts.md), [methods](knowledge/methods.md), and
[SECURITY.md](SECURITY.md). Obtain explicit maintainer agreement on scope and
compatibility before changing those contracts. Include old-data and migration
acceptance where applicable; an agreement does not waive regression checks.

Keep the smallest coherent diff. A new abstraction or dependency must solve a
current acceptance requirement; speculative frameworks, duplicated policy, and
unrelated cleanup do not belong in the improvement. Reviewers check scope and
simplicity against the issue and acceptance example rather than an automated
classifier. An uncovered larger gap becomes a separate scoped task.

## AI-assisted development

People and agents follow the same contribution process. Inspect implemented
behavior and authoritative instructions before proposing changes. Define
observable acceptance criteria first; for a bug, reproduce it with synthetic
input and a failing regression test before fixing it. Check financial examples
independently rather than deriving expected values from the implementation.

Use existing boundaries, review the complete diff, and retain regression coverage.
Do not remove tests, loosen assertions, or change expected results simply to make
checks pass. An intentional behavior change needs an explained, approved contract
change. The contributor remains responsible for understanding and validating
AI-generated code; a passing check or AI review does not replace maintainer review.
No paid model, mandatory AI reviewer, or generated-code framework is required.

## Requirements by change type

| Change | Include |
|---|---|
| Source adapter / connector | Supported source and format, access/cost requirements, data-use terms, synthetic or redistributable fixture, normalized output, duplicate handling, source failures, and network limits where relevant |
| Data structure | Schema and examples, compatibility impact, migration and restore plan if persisted data changes, old-data tests |
| Calculation | Formula, units, input requirements, assumptions, independently checked example, edge cases, missing-data behavior |
| Knowledge | Primary sources, applicable context, review date, uncertainty, and examples of when the method should not be used |
| Agent integration | Documented instruction discovery, a tested interaction, environment limitations, and a thin adapter without copied policy |

Public code and documentation must be original or appropriately licensed.
Include the provenance and redistribution permission of external fixtures.
Do not submit private documents or another product's extracted instruction corpus.

## Validation

For documentation-only changes, check local links, source ownership, commands
against actual availability, and contradictions. Add no test framework solely
for prose edits.

With runtime code, offline checks must run without personal records, account
credentials, model subscriptions, or live provider access. The relevant feature
must cover these scenarios before release:

- Read-only diagnostics and repeatable initialization.
- Import preview without canonical writes; invalid input with no partial apply.
- Duplicate imports, record corrections, and reconciliation discrepancies.
- Internal transfers, debt principal versus interest, and account/holding overlap.
- Ownership shares, missing FX, stale estimates, and unknown classifications.
- Interrupted writes and concurrent writers leaving committed data usable.
- Deterministic results with input and method provenance.
- Untrusted input remaining data rather than instructions; output suitable for
  its destination, including safe spreadsheet exports.
- Migration/restore and unsupported schema versions when those features exist.

Introduce CI with the first runtime change. Use synthetic fixtures for PR checks;
keep optional live-source checks separate. Forked PR code must run without
privileged repository secrets or write tokens. A saved fixture test validates
the parser against that fixture, not the continuing availability of a live source.

## Issues and pull requests

An issue should describe the requested outcome, scope exclusions, and a synthetic example.
A PR identifies its accepted roadmap follow-up, maintenance need, or scoped issue. A PR
should explain the concrete problem and resulting behavior. Use this outline
when it helps; omit sections that are irrelevant to a small change:

```text
Problem and intended outcome:
Change and scope:
Acceptance example:
Validation performed and results:
Compatibility or migration impact:
Known limitations:
```

An example improvement request is: "Support this synthetic bank CSV so repeated
imports do not duplicate transactions. Implement it on a branch, run the relevant
checks, and prepare a PR." The same process applies to an asset type, calculation,
or knowledge document. Never paste a real statement into the request.

## Review and releases

Felipe Meloni is the initial maintainer and decides merges and releases. Discuss
changes in issues or PRs with evidence and respectful, specific feedback. Record
the rationale for accepted contract changes in the architecture or relevant
method, rather than requiring access to a private discussion. Expand governance
when sustained shared maintenance warrants it.

The first code release must add a version and changelog. Each release records
new capabilities, known limits, supported runtime/agent environments, and schema
compatibility. Validate its example flow from a fresh public clone with a
synthetic external vault and only the documented prerequisites. Required checks
must work without maintainer-only tools or agent configuration. Inspect the
actual release/package contents for private material;
gitignore alone does not determine what a packager or archive includes.

Preserve local changes during upgrades; never reset a user's checkout to force an
update. Schema changes require explicit migration with a verified backup and a
tested restore path. Rolling back code does not roll back data automatically.

## Browser acceptance

For browser changes, install Chromium once with `npx playwright install chromium`
(or `--with-deps` on a fresh Linux runner), then run `npm run test:browser`. The test
uses a synthetic external vault and verifies initialization, unresolved import,
correction, masking, keyboard navigation and report export parity. Browser binaries
are setup prerequisites; the acceptance flow itself uses no external network.
`npm run check` builds the React/Vite bundle and rebuilds it in the public-only
installation. Bundle outputs are generated and included in package inspection.

After changing capability status, run `npm run docs`; the package check rejects an
outdated generated listing. Synthetic planning examples also run through a clean
public installation, including schema-2 creation, spending, tax routing, saved
reviews and spreadsheet export. Provider-response fixtures are not evidence of
live coverage. Export reader interoperability was checked separately with pypdf and
openpyxl; those optional verification tools are not installation prerequisites.

Use [the local maintenance queue](workflows/maintenance.md) to inspect public source
review dates and synthetic import-format checkpoints. It does not contact providers
or certify live formats. Platform release gates require actual per-platform results;
local passing tests do not close unexecuted Windows/macOS gates.

## Final release check

The full gate is required before release, rather than as a new requirement for
every PR. Existing PR CI remains in place; contributors run the relevant checks
and browser acceptance when their changes affect the UI or service boundary.
Install the pinned dependencies and Chromium as described above, then run:

```bash
npm run check:release
```

This command first runs the existing package/build/install checks, then the full
Node integration/regression suite and Chromium acceptance from that verified
public-only installation. Rebuilding must reproduce the packaged browser bundle.
Tests use external temporary synthetic vaults; acceptance needs no network,
provider credentials, private records, or model subscription. Temporary package
installations and vaults are removed after the run.

`release-results/summary.json` records source commit/dirty status, artifact SHA-256,
Node/npm/Chromium versions, stage results, cleanup, and evidence locations. The tested
archive (`package.tgz`), file manifest, logs, HTML reports, attached screenshots,
and failure traces remain in `release-results/`.
Ordinary browser runs write their reports to `test-results/browser/`. Generated
outputs are ignored and excluded from the public package. Traces may contain the
short-lived synthetic service session; the service is stopped before review or
artifact upload. Never run this suite against a personal vault.

A failed prerequisite, failed/incomplete test summary, skipped test, focused test,
or unexpected browser error prevents acceptance. Retries are disabled. Negative
scenarios explicitly assert their expected errors, unchanged committed state,
and recovery; they are not blanket error exemptions. Missing coverage remains
visible, and each report selector has an explicit expected result. Browser
acceptance retains the bounded accessibility and platform scope in
[release acceptance](docs/release-acceptance.json); it does not certify live providers.

A dirty checkout may finish diagnostic checks, but returns nonzero and cannot be
release-ready. Commit only the intended, reviewed work when authorized, then rerun
on the unchanged clean source. The manually triggered Final release acceptance CI
job runs the same command with read-only permissions and retains evidence for 14
days. It does not tag, publish, or alter capability status.

Before a maintainer approves release, inspect the populated-screen screenshots,
narrow-screen views, package contents and outgoing diff/history; record the actual
result in the release acceptance record. Automated passing results are necessary
but do not replace this review. Any source change requires a new gate run.
