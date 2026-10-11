# Experimental read-only reporting connection

IBKR Flex has an experimental, user-mapped CSV cash-reporting path. It is not a
verified live connection. Plaid, positions/trades, automatic account discovery and
native Windows credential integration remain unavailable. File imports work
without connection setup. No connection is configured or started by installation.

## Prerequisites and scope

You need an eligible IBKR account, a configured cash-reporting Flex query, and an
unexpired reporting token. Eligibility and charges follow your provider agreement;
Open-decade does not promise free access. Enrollment, generating tokens, selecting
provider-side scope and real consent/sync/revocation testing are separate actions.

Reviewed 2026-10-11 against official [token setup](https://www.interactivebrokers.com/docs/web-api/flex-web-service/client-portal-configuration/enable-and-create-access-token),
[report generation](https://www.interactivebrokers.com/docs/web-api/api-reference/send-request),
[report retrieval](https://www.interactivebrokers.com/docs/web-api/api-reference/get-statement),
[error codes](https://www.interactivebrokers.com/docs/web-api/flex-web-service/error-codes),
and [cash-report fields](https://www.ibkrguides.com/reportingreference/reportguide/cash%20transactionsfq.htm).
Only SendRequest and GetStatement are used; no trading/payment/account-management
endpoint is implemented. Provider-supplied URLs are ignored in favor of fixed HTTPS
endpoints. Redirects are rejected and credential-bearing request URLs are never
logged or returned in errors.

Configure CSV output, a single account/currency, stable source identifiers and an
explicit supported date/decimal convention. The normalized mapping must describe
actual cash movements. The synthetic fixture uses illustrative column names and
is **not** evidence that an IBKR template exports those exact fields. If your
report lacks stable identifiers, has timestamped/unsupported dates, mixed accounts,
multiple tables, XML, positions or trades, use file/host extraction. No template or
live country/product coverage is certified by the transport tests.

## Configure without exposing credentials

The [connection schema](../schemas/connection-v1.json) permits only non-secret
configuration. Start from [the synthetic example](../fixtures/connections/ibkr-config.json)
and replace the query ID, declared expiry, scope confirmation, external account and
local account mapping with your reviewed settings. The provider's configured
period window is 1–365 days. Do not put a token in this file, vault records, agent
messages, environment variables or command arguments.

```bash
node bin/od.mjs connection configure --file /path/to/nonsecret-config.json --json
node bin/od.mjs connection status --json
```

Status supplies a deterministic `credentialService` label for this vault path.
On Linux, provision the token directly through the OS Secret Service using
`secret-tool store --label='Open-decade IBKR reporting' service SERVICE_LABEL` in
your own terminal; enter the token at the utility's prompt. A working, unlocked
Secret Service session and the utility are required. On macOS, create a generic
password in Keychain Access with service `SERVICE_LABEL` and account `open-decade`.
The application only invokes the system lookup/delete utilities. Windows and WSL
without an available Linux Secret Service use file imports. Restoring to a new
vault path requires provisioning its separate service label.

No application tool accepts a secret setter, and browser/MCP operations do not
read credentials or start a network sync. Recorded tests substitute an in-memory
store; they do not certify an installed OS credential manager.

## Fetch, review, confirm

```bash
node bin/od.mjs connection sync --json
node bin/od.mjs connection preview --cache PROPOSAL_DIGEST --json
node bin/od.mjs connection apply --cache PROPOSAL_DIGEST --confirm CONFIRMATION_DIGEST --json
```

Sync explicitly requests the configured rolling window. Each operation has bounded
retries (at most three per endpoint), ten-second waits, fifteen-second request
timeouts and a two-megabyte body cap. Transient/not-ready/rate-limit responses retry;
invalid/expired credentials require manual renewal. Sensitive errors are replaced
with fixed messages. Responses echoing the token are rejected before storage.

Fetched raw CSV and normalized proposals live in the private vault and are included
in backups. Sync does not apply records. Preview uses the current vault state and
returns the same proposal-bound confirmation as file import. The browser/agent can
read `connection status` / `connection preview`; MCP exposes `connection_status`
and `connection_preview`, followed by the existing explicitly confirmed
`import_apply`. CLI `connection apply` also uses the same persistence operation.

Repeated windows reuse stable IDs. Changes require an explicit mapping
`corrections` entry from source ID to active local record ID and a new configure,
sync and preview. No missing row is treated as deletion. No automatic history
coverage or balance observation is asserted. The sync status records what was
fetched and that sync itself did not apply it; it is not a later journal audit.
Concurrent reconfiguration/disconnect invalidates the fetched proposal before save.
An already in-flight network request may finish; local disconnect is not remote
revocation or a guarantee of transport cancellation.

## Expiry, reconnect and revocation

The declared expiry is a user-entered upper bound; the server may reject a token
earlier. Renew in Client Portal, replace the token in the OS store, update the
non-secret configuration and configure again to reconnect.

```bash
node bin/od.mjs connection disconnect --json
```

Disconnect first disables this local connection, then attempts to remove its OS
credential. A deletion failure remains explicit. **It does not revoke the remote
token.** Revoke or disable Flex access in Client Portal yourself. Previously
confirmed records and cached proposals remain local history. Real consent, sync,
reconnect and remote revocation must pass before production coverage can be claimed.
