# Pigeon Umbra Group — central administration

Phase **15 of 19**, branch `codex/phase-15-inventory-expansion`. Only the DataCenter module is implemented. Other application placeholders remain unactivated.

## Current deployment boundary (2026-09-10)

The console is deployed at `admin.pigeonumbragroup.com` behind Cloudflare Access. The sole configured owner remains `sudopug1337@datacenterdata.net`; JWT/issuer/audience/email checks protect assets and API calls. `DATACENTER` targets the private `datacenterdata-control` service with existing D1. Managed R2 publication and contact-inbox email import remain unavailable; public corrections still use email links.

Phase 14 adds read-only layer access tier, comparison/analysis eligibility, source/date/release columns and product counts (43 Free, 0 Pro, 43 comparison, 5 analysis). Tier changes require a reviewed configuration/publication release, never an unaudited live dropdown. The billing overview distinguishes locally entitled users from subscription status and shows TEST mode plus both disabled public checkout gates. Real sandbox grant, scheduled cancellation, revocation and audit records were checked through the protected owner session.

Phase 15 adds a private Inventory review workspace: candidates and raw/normalized evidence, duplicate review, canonical edits, coverage/source-rights tables and JSON review export. Saves require an editor role, matching fingerprints/revision, evidence and a reason; every write is audited. Saving does not publish. Offline immutable release validation and deployment remain separate.

See the sibling DataCenter [Phase 15 handoff](../datacenterdata-website/docs/phase-15-handoff.md) for deployment versions, acceptance, commit/push records and exact rollback. Main remains a landing page. Dread is a build-pinned review beta; dated deployment observations are not a monitoring feed.

## Implemented

- Facility/source inspection with explicit missing fields and retained provenance. Catalog changes require source review and a matching validated application/release build; no live static-asset editing.
- Main/Dread/Good/ALL decisions, stage/validate/activate/rollback, revision checks and append-only actor/target/revision audit history.
- Audit pagination; saved-contact inbox and capability-gated notification retries. Public beta remains email-only. Mailbox emails are not automatically imported.
- Server-enforced owner/admin/editor/moderator/readonly foundation. Only `sudopug1337@datacenterdata.net` is configured live as owner.
- Every console asset request requires a backend-verified Access identity. JWT signature, issuer, audience, expiry and email allowlist are verified by the private backend; frontend state never grants permission.
- GET/POST/PUT route allowlist; Origin checks for every write; private no-store/noindex responses; restrictive CSP; workers.dev and preview URLs disabled.
- Console clearly identifies deployment versions as dated observations. Managed policy/release changes do not change the build-pinned Dread beta. Main remains a landing page.

## Checks

Node 24.19/npm. Run `npm ci`, `npm run check`, and `npm run test:browser` (install Playwright Chromium or supply `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`). Browser tests use clearly synthetic API fixtures, exercise all navigation, disabled capabilities after save, revision payloads, missing fields, escaped untrusted content and mobile layout. Screenshots are ignored under `test-results/`.

`npm exec wrangler deploy -- --dry-run` bundles without publishing. `npm run deploy` requires `CLOUDFLARE_API_TOKEN` supplied securely in the environment. It reads the sibling backend configuration and checks live Access app, issuer/audience, sole owner allow policy, and absence of bypass/overlapping applications before deploying. The API token needs Access Read and Worker deployment permissions. Never remove the deployment gate to work around missing configuration.

## Deployment and future activation

Run the guarded `npm run deploy` with the authorized Cloudflare token supplied securely in the environment. The gate verifies the exact Access application, sole owner policy, issuer/audience and absence of bypass/overlapping application rules before uploading assets. Do not bypass it.

After deploy, verify anonymous Access redirect/denial and an actual authorized owner session, including layer tiers, Pro counts, billing gates and audit records. No live Stripe commerce is activated by deploying the console.

R2 managed publication and contact-notification delivery require their own explicit activation and acceptance. Use `npm run release:upload-admin` in the DataCenter repository only after private R2/Access bindings and a reviewed immutable release exist. Never grant public access to a future paid dataset.
