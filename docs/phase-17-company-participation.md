# Phase 17 — protected company participation console

Implementation commit `2cd7503`, branch `codex/phase-17-company-verification`. The separate handoff commit records validation. The console is deployed behind the existing Cloudflare Access application. Final remote equality is checked at delivery.

Participation adds organization-claim, facility-association, correction, sensitive-review, candidate, official-response and public-contact queues. It supports structured filters, private review details, current/baseline/proposed comparison, role/method/expiry decisions, accepted field subsets, independent approval/publication actions, revocation, immutable history, notification retry and inventory-intake export/withdrawal. Existing inventory review links into the new queue.

Only backend-authorized owner/admin reviewers can access private participation evidence or make decisions. Company membership does not grant console access, comment moderation, canonical analytics changes, billing powers or publication authority. Generic console audit events do not embed private claim data. The upstream service remains authoritative for authorization and all writes.

Changes: `public/participation.js`, `public/admin.js`, `public/inventory.js`, `public/admin.css`, `public/index.html`, `worker/index.js`, `tests/browser.mjs`, `package.json`.

Validation: `npm run check` passed (4 tests); the existing desktop/mobile console browser regression passed. The private atlas test harness exercised the actual participation UI against local Worker/D1 routes for claim review, association, correction staging and response approval/publication. External identity in that local harness is a test fixture.

**Phase 17 live acceptance completed on September 11, 2026.** The actual owner Access session reviewed a clearly synthetic claim, assigned a temporary editor, approved a scoped facility association and correction staging, separately approved/published a response and designated contact, and revoked authority. The live UI enforced stale revisions and facility scope. Revocation removed current badges/contact and labeled the response historical. Actual status email receipt was observed in the designated test inbox.

All temporary fixture authority was revoked, projections withdrawn, staging superseded and test configuration removed; immutable review history remains. Public commerce stays disabled. The closed acceptance app and final protected-boundary checks passed. Phase 17 is complete; stop before Phase 18. Detailed private acceptance evidence remains in the atlas handoff, outside this public repository.

Deployment, private recovery, provider evidence and exact rollback versions are recorded in the private atlas repository's `docs/phase-17-company-verification.md`. No private evidence, credentials, database exports or authenticated browser storage are included in this public repository. Public commerce remains disabled; no paid verification or pay-to-suppress functionality was added.
