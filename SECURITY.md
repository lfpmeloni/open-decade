# Security and privacy

**Status:** this policy defines implementation requirements. No product runtime
or security controls have shipped yet. See [README.md](README.md#current-status).

## Boundaries

The project stores personal records in a user-owned vault outside code history.
It adds no telemetry, central portfolio database, or background upload service.
The storage contract is in [the architecture](docs/architecture.md#storage-and-ownership).

The chosen agent is a separate trust boundary. A cloud-backed agent may send
records, tool results, and conversation content to its provider. Open-decade
cannot enforce the host's permissions, retention, training settings, or memory
policy. Explain this boundary before asking for personal records. Local-only
inference is not a validated mode today.

Limit context to the records needed for the task. Do not deliberately copy
financial facts into shared agent memory or project instructions. Logs and error
messages should contain record references and diagnostics, not raw statements,
tokens, personal paths, or account identifiers.

## External content and credentials

Files, PDFs, CSV fields, pages, and adapter responses are untrusted data. They may
not change instructions, invoke tools, choose executable code, or escape the vault
through file paths. Validate input and constrain file access. When exports arrive,
handle spreadsheet formula injection and other output-format hazards explicitly.

The initial manual/CSV release needs no bank credentials. Future read-only
connections must disclose provider, scopes, costs, stored data, and revocation.
Authentication happens through an appropriate provider flow; credentials and
tokens stay out of model context, source files, and fixtures. Never request
trading, transfer, or other transaction authority.

Project network operations must be explicit and purpose-bound. Data acquisition,
code updates, and PR publication have different destinations and authorizations.
An allowlist in project code does not control an external agent's tools.

## Publication and backups

Use synthetic data for development, tests, issue reports, and PRs. Publication of
personal records requires an explicit request identifying what may be shared and
where; an ordinary request for analysis or a bug fix is not such authorization.
Prefer a synthetic reproduction even when a user offers their statement.

Keep the vault, private research, credentials, caches, and private logs out of
commits and release archives. Review outgoing history as well as the latest tree.
Gitignore and hooks are useful safeguards, not confidentiality guarantees. Files
already tracked, force-added, or copied to another path can still be published.

Back up the vault separately from code history, using user-controlled storage.
Use disk or backup encryption where appropriate; local files are not encrypted
merely because they are local. Before an incompatible migration, make a backup,
validate it, and test restoring to a separate vault. Explain what an export or
backup includes and where it goes. Deleting local files does not delete copies
retained by an agent provider or a backup service.

## Reporting a vulnerability

Use [GitHub's private vulnerability reporting](https://github.com/lfpmeloni/open-decade/security/advisories/new),
which is enabled for the public project. If you cannot access that channel, keep
sensitive findings local and ask the maintainer for a private alternative.

Do not open a public issue containing personal data, credentials, or a reproducible
exploit against a live account. A report should use synthetic input, identify the
affected version and behavior, and explain impact and reproduction.
