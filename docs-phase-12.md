# Phase 12 of 19 — central community moderation

Branch: `codex/phase-12-accounts-comments`, starting from clean Phase 10 commit `7432206` on 2026-09-09. Companion DataCenter branch has the same name. The complete architecture, schema, privacy, activation and rollback handoff is `datacenterdata/docs/phase-12.md` in the companion repository.

Implemented in this repository:

- DataCenter → Community, with paginated comments/reports/users, search/filter controls, thread context and user comment history.
- Hide/restore/remove comment, dismiss/resolve report, suspend/ban/restore account, reason entry and explicit saved/audit notice.
- Safe text rendering, no public-user email/session/provider tokens, keyboard labels and 390-pixel mobile layout.
- Owner/admin/moderator can moderate; readonly inspects; editor cannot enter community moderation. Backend authorization is authoritative in the private control Worker.
- Worker proxy admits only the enumerated `/api/admin/community/*` routes after existing Access JWT validation. Public auth cookies never authorize this console.
- Deployment config loading now uses `jsonc-parser@3.3.1` because the companion Wrangler configuration is JSONC. Existing Access policy/deployment guard remains intact.

New module: `public/community.js`. Updated `public/admin.js`, `public/index.html`, `public/admin.css`, `worker/index.js`, `scripts/deploy.mjs`, package files and `tests/browser.mjs`. No schema is duplicated here: companion migration `0004_community.sql` uses existing control D1 and immutable audit. No payments or other product modules implemented.

Validation: `npm run check` (worker security/proxy tests and strict Access deployment gate), `npm run test:browser` (seven-module navigation, publication capabilities, community thread/comment/report/user actions, role visibility, escaped text, desktop/mobile). Browser uses routed fixtures; actual moderation/audit/role tests execute the companion Worker against local D1 and signed test Access identities.

**Not deployed.** Live Access API continues to return 403/9999 (Access not enabled). `admin.pigeonumbragroup.com` is not activated. No billing/terms accepted, no unprotected console published, no real owner/moderator session verified.

Activation: owner completes Cloudflare Zero Trust onboarding, configures a self-hosted app for the exact admin hostname allowing only `sudopug1337@datacenterdata.net`, and supplies matching Access team domain/audience in companion control configuration. Deploy control, then run this repo's `npm run deploy` with an Access Read + Worker deploy token supplied privately through the environment. Do not invoke Wrangler deployment directly to bypass this gate. Verify anonymous denial and real owner access, then exercise comments/reports/user moderation before enabling public posting. R2 publication activation is separate and not needed for moderation.

There is no new central deployment to roll back. Revert this phase's implementation commit if necessary, retain all companion D1/audit records, and never remove Access protection. Phase 13 is not started. Final commit/push information is appended after release verification.
