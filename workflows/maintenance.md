# Local maintenance review queue

Run `node bin/od.mjs maintenance --as-of 2026-10-10 --json` without a vault, or use
Settings in the browser / the public MCP maintenance tool. This read-only operation
makes no network requests, reads no personal records and changes no feature status.

The queue includes public knowledge catalogue and country-guide review dates plus
explicit synthetic import-format checkpoints. Current, future and due reviews are
separate. Due work points to a public method or fixture/test and an action. Missing
provider coverage remains in the planned/experimental release gates; successful
synthetic tests do not promote it to live coverage.

Format dates are project review checkpoints, not evidence that an institution has
kept its exports unchanged. Re-run the specified tests, inspect an authorized
current layout when available, update the adapter contract and add changed-layout,
repeat, overlap and correction fixtures before expanding scope. The existing
mapped import and host-extraction workflows remain fallbacks.

The [release acceptance record](../docs/release-acceptance.json) closes the current
WSL2/Linux runtime and bounded Chromium accessibility gates. Maintenance shows one
supported runtime and other native environments as outside the release scope;
those entries are not unfinished roadmap work. Stdio subprocess and shared-domain
protocol acceptance covers the integration boundary; individual agent hosts remain
user-selected. Source/format reviews and optional provider capability gates remain
visible for routine maintenance and follow-up chosen during use.

There is no polling, background startup, external notification, self-update or
automatic source review. This queue is an offline maintenance aid, not a live
adapter-monitoring service. The revised round-16 gate is complete within the documented release scope.
