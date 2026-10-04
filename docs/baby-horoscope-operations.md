# Baby Horoscope operations — Phase 3

October 4, 2026. Baby Horoscope is a read-only operations module in the existing private Central Admin console. The public site remains browser-local and independent of the console and SSH machines.

## Source and boundaries

Use `codex/baby-horoscope-phase3` in the private `rheinrick/pigeonumbragroup-website` repository. The isolated working checkout is `/Users/rheinrick/Documents/ChatGPT/baby-horoscope-admin`. It starts at `ad9de4e670b7800bedf78397d8d9398f80b547e6` from `codex/dread-delta-admin`. The live baseline Worker bundle was byte-for-byte equal to a Wrangler 4.130.0 dry-run of that source; SHA-256 `cdaec94c9c137f338a4bd7de77eceba0f58c28ef75e84ab1aeb5f61bc66e44a7`.

Do not deploy the older, dirty `pigeonumbragroup-website` checkout as a substitute. It contains separate unfinished work. Keep DataCenter's paused Delta work and all existing project modules separate.

The endpoint is exactly `GET /api/admin/baby-horoscope/overview`. The existing backend verifies the original Cloudflare Access JWT before the handler permits owner/admin/readonly roles. No write operations, user URL parameters, CORS changes, database or new service binding are introduced. The `global_fetch_strictly_public` compatibility flag routes public Worker-to-Worker observations through Cloudflare’s public front door, honoring public security controls. Existing DataCenter service-binding calls are unchanged. Public requests use four fixed URLs (release and reading manifests on canonical and staging). Redirects are rejected; reads have an eight-second deadline and 512 KiB body limit. Only approved release fields and catalog aggregates return to the browser. JWTs, cookies and private profile fields are never forwarded to the public site. Responses remain no-store/noindex with the existing CSP.

## Routine

Before a release or when investigating a report:

1. Open `https://admin.pigeonumbragroup.com/#baby-horoscope`, refresh its public manifests, and compare canonical/staging source, artifact, mode, indexing and content edition with the candidate evidence.
2. Run `node scripts/baby-health.mjs`. Exit 1 means a manifest is unavailable or the canonical clean noindex-beta policy differs. This checks manifests, not every route, real use or provider deployment.
3. Run the Baby repository's guarded release verification for served hashes and critical journeys; record actual provider version/deployment and live UI separately.
4. Review support and privacy inboxes each active beta testing day. The inbox operator is the project owner until explicitly delegated. Track anonymized defects in the private issue tracker. Record severity, browser/OS, affected page, reproduction steps, candidate artifact and correction/retest result.

The hosted verification workflow runs on source changes and PRs, requires no secrets and does not deploy or send messages. No recurring health scheduler or new failure recipient is created. Cloudflare remains the public host; Potato is optional. A later monitor requires a specific cadence, tested failure/recovery behavior and a confirmed notification destination.

## Reply drafts — do not send automatically

Support: “Thanks for reporting this. Which browser and device are you using, which page were you on, and what steps led to the problem? Please leave out your child's name, exact dates and profile backup. If a screenshot helps, crop or cover personal details.”

Privacy: “Baby Horoscope keeps profiles in your browser when you choose to save them. We cannot inspect those profiles through our admin console. Settings includes stop-saving and deletion controls; downloaded backups and shared pictures remain separate copies. Please describe the request without sending a profile export or child details.”

Urgent storage/privacy defect: preserve the report without private content, reproduce with synthetic data, record P0/P1 and stop the affected release/promotion. Prepare an accurate operator reply, fix/retest or restore the identified previous compatible release. Sending a reply or launch invitation requires explicit instructions.

## Deployment and recovery

Keep `scripts/deploy.mjs` and its exact Access guard. The normal path requires an existing Cloudflare API token with Access Read and Worker deploy capabilities via the environment, never a committed secret. Verify all guard assertions against current provider state, including the application audience/issuer, the sole owner allow rule, no overlapping application, and matching backend roles. Do not change policy or widen identity access to solve a tooling limitation.

Baseline rollback version: `2b2fa565-01eb-42b2-82b3-f6090ebb61e9` for `pug-admin`, deployment `a29b00dd-6765-4fc2-aeb0-64e29f13be3d`. Confirm the current version before rollback, use `wrangler rollback <version>` from this isolated checkout, then recheck authenticated Baby/DataCenter navigation and anonymous denial. It restores the whole console; it does not change the public Baby site or its browser storage.

Local validation: `node --test tests/*.test.mjs`, `node tests/browser.mjs`, `node tests/dread-browser.mjs`, `node tests/baby-browser.mjs`, then Wrangler dry-run. Node 24.19.0 and Wrangler 4.130.0 are the accepted toolchain. Hosted CI installs the exact npm lockfile and bundled Chromium; local Mac testing uses Chrome.
