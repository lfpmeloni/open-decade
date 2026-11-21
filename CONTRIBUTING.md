# Contributing

Thank you — open-decade gets better with every user who extends it.

## The one rule

**Framework** (everything tracked by git) is shared. **Your data** (`data/`) is personal and never
part of a contribution: no holdings, amounts, account names, chats or API keys in commits.

## What to contribute

- **Market-data providers** for exchanges, countries or asset types not covered yet (`.claude/skills/market-data/providers/`)
- **Skills** for new tasks (`.claude/skills/<name>/SKILL.md`)
- **Method improvements** with reasoning and sources (`knowledge/methodology.md`)
- Fixes to the app (`app/`)

The easiest path: run `claude` in the repo and ask it to add what you need — the
[`contribute` skill](.claude/skills/contribute/SKILL.md) has the exact steps and contracts.

## Rules of thumb

- Keep it small: no npm dependencies, no build step, plain files.
- Generic: works for any user and country; country-specific logic lives in a provider or a clearly named knowledge section.
- Tests use no network: `npm test` must pass.

## Pull requests

Fork, branch, commit, open a PR against `main` and fill in the template. The maintainer reviews,
tests and decides what ships in each release. You do not need to make architecture decisions —
build what you need; integration is handled on merge.
