# Contributing

Start with [README.md](README.md) for current availability and
[the architecture](docs/architecture.md) for design boundaries. This is the
complete contribution process for people and agents, using the published source
and documented prerequisites.

## Working today

The project is in documentation-only development. There are no install, build,
lint, or test commands yet. Do not run invented npm scripts or claim runtime
behavior has been validated. Review documentation for consistency, working local
links, and an explicit distinction between planned and implemented behavior.

When runtime code first lands, document its pinned Node version, lockfile,
installation command, and actual checks here. That change must introduce the
test entry point and CI rather than leaving these instructions aspirational.

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

An issue should describe the requested outcome and a synthetic example. A PR
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
