# Phase 17 — protected company participation console

Implementation commit `2cd7503`, branch `codex/phase-17-company-verification`. The separate handoff commit records validation. The console is deployed behind the existing Cloudflare Access application. Final remote equality is checked at delivery.

Participation adds organization-claim, facility-association, correction, sensitive-review, candidate, official-response and public-contact queues. It supports structured filters, private review details, current/baseline/proposed comparison, role/method/expiry decisions, accepted field subsets, independent approval/publication actions, revocation, immutable history, notification retry and inventory-intake export/withdrawal. Existing inventory review links into the new queue.

Only backend-authorized owner/admin reviewers can access private participation evidence or make decisions. Company membership does not grant console access, comment moderation, canonical analytics changes, billing powers or publication authority. Generic console audit events do not embed private claim data. The upstream service remains authoritative for authorization and all writes.

Changes: `public/participation.js`, `public/admin.js`, `public/inventory.js`, `public/admin.css`, `public/index.html`, `worker/index.js`, `tests/browser.mjs`, `package.json`.

Validation: `npm run check` passed (4 tests); the existing desktop/mobile console browser regression passed. The private atlas test harness exercised the actual participation UI against local Worker/D1 routes for claim review, association, correction staging and response approval/publication. External identity in that local harness is a test fixture.

**Real owner approval/publication/revocation acceptance remains pending because the workstation was locked.** An unauthenticated live request redirects to Cloudflare Access; that verifies the perimeter, not the owner workflow. Do not call Phase 17 complete or start Phase 18 until the owner/provider acceptance is recorded in the private atlas handoff.

Deployment, private recovery, provider evidence and exact rollback versions are recorded in the private atlas repository's `docs/phase-17-company-verification.md`. No private evidence, credentials, database exports or authenticated browser storage are included in this public repository. Public commerce remains disabled; no paid verification or pay-to-suppress functionality was added.
