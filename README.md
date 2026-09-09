# Pigeon Umbra Group — central administration

Phase **10 of 19**, integration branch `codex/phase-10-control-plane`. Only DataCenter is implemented; Dashboard links to it. CliniType, Newborn Horoscope, HIETool, Heinrick and Pigeon Umbra Group show “Administration module not yet activated.” No other applications are integrated or modified.

## Current deployment boundary (2026-09-09)

**Console implemented and tested locally, not deployed to its hostname.** Cloudflare Access is not initialized. Its Free checkout requires terms acceptance and authorization for over-limit charges; this was left unaccepted under the no-new-paid-activation instruction. `admin.pigeonumbragroup.com` has no Worker custom domain configured. Never deploy unprotected console assets while waiting.

The `DATACENTER` service binding now targets the private `datacenterdata-control` Worker, not the public Main landing page. The private backend and its dedicated D1 exist. R2 and email bindings remain absent, Access issuer/audience empty: it fails closed. See sibling DataCenter [Phase 10 handoff](../datacenterdata-website/docs/phase-10.md) for IDs, versions, exact rollback and test evidence.

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

## Activation sequence

1. Owner completes Cloudflare Access onboarding after reviewing billing consent. Create a self-hosted app for this exact hostname with only the existing administrator's email, no bypass or broad domain rules.
2. Configure that app's team domain and audience in the sibling `wrangler.control.jsonc`; redeploy the private backend. Keep public Main and Dread Workers unchanged.
3. Run guarded console deployment. Verify unauthenticated redirect/denial and a real authorized owner session. No external console hostname is created by local tests.
4. R2 and notification delivery require separate activation/verification. Console browsing and D1 decisions can operate without R2, but stage/upload/validate/activate/rollback remain unavailable. No public forms or commerce are enabled here.

Use `npm run release:upload-admin` in the DataCenter repository only after R2 and Access exist; it uploads through the protected console and stages a complete immutable release without activating it. The old public publisher uploader is not wired to this private control plane.
