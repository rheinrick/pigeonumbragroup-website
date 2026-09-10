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

**Deployed behind Access; real owner login is accepted. Moderation mutations remain pending.** The owner completed Zero Trust Free onboarding, configured the exact hostname and sole owner-email Allow policy, and selected One-time PIN only. Authenticated API inspection verified that configuration before deployment. Anonymous page, asset and administrator API requests redirect to the correct Access login. No unprotected console was published.

Activation: owner completes Cloudflare Zero Trust onboarding, configures a self-hosted app for the exact admin hostname allowing only `sudopug1337@datacenterdata.net`, and supplies matching Access team domain/audience in companion control configuration. Deploy control, then run this repo's `npm run deploy` with an Access Read + Worker deploy token supplied privately through the environment. Do not invoke Wrangler deployment directly to bypass this gate. Verify anonymous denial and real owner access, then exercise comments/reports/user moderation before enabling public posting. R2 publication activation is separate and not needed for moderation.

The initial implementation **8f530b5** and companion **834cace** were pushed to `origin/codex/phase-12-accounts-comments`. Initial provider-gated deployments were documented before guided setup; the current deployment ledger follows. Phase 13 is not started.

## Guided Access deployment

The owner supplied a scoped API token through a private local file, restricted to owner-only access and never printed or committed. Live API inspection confirmed a single self-hosted **Central Admin** application for `admin.pigeonumbragroup.com`, one exact-email Allow policy for `sudopug1337@datacenterdata.net`, One-time PIN as the sole provider, a 24-hour session and no bypass/service-auth or overlapping app. The companion control issuer/audience were configured and verified after deployment; the owner email/role mapping remains explicit.

The first deployment attempt stopped before Wrangler because the script passed a file Buffer to `jsonc-parser`. Commit **4b47a91** fixes UTF-8 decoding and adds an entrypoint regression with a JSONC fixture that confirms missing Access prevents deployment. All four security tests and both Worker dry runs passed. The actual guarded `scripts/deploy.mjs` then verified live Access and deployed the console successfully.

- Central version: **420a1334-2064-498c-9b8b-939559dfbf4c**.
- Private control version: **b7f407d5-d51d-49d5-ac0d-76ef657bb584**, companion configuration commit **46f11b2**.
- Main remains **be4f09dc-f5ed-49e2-b12f-93ddb26fb1e9**; Dread remains **5a2fc6e9-95b7-4848-a986-49eec7216502**.
- Admin hostname DNS/HTTPS verified; anonymous console, JavaScript, CSS and administrator APIs redirect to Access. A forged assertion header also remains blocked.
- Admin/control `workers.dev` and preview URLs remain disabled. Provider secrets and email sender binding remain present; public auth, email login, contact delivery and community posting flags remain false.

Next: the owner opens `https://admin.pigeonumbragroup.com`, signs in with the exact owner email and enters the Access PIN privately. Real owner login, public Google/email login and posting/moderation are not yet accepted. No test email, user/comment or moderation record was created during this deployment. Sanitized evidence is in the companion `docs/evidence/phase-12-access-configuration.json`.

There is no earlier central version. To roll back only Access activation, restore companion control version **dbb1012a-31e5-4ea8-9916-bac7e6ab247a** and its blank Access issuer/audience; this console then fails closed. Preserve Access protection, DNS, secrets and D1/audit records.

## Real owner acceptance and public-account next step

The owner completed Access One-time PIN sign-in and reported success. Inspection of the existing authenticated Chrome tab confirmed the exact owner identity/role and working DataCenter Comments, Reports and Users views, with empty queues and no community error. No cookie/token was read; no moderation mutation or public account was created. Owner login and community read access are accepted; mutation acceptance still requires the later test comments/reports.

The companion control is now **829aea77-57ad-4bf8-bd12-fb4ba68f633d** from configuration commit **0746b56**, enabling Google sign-in for guided acceptance. Email login, contact delivery and community posting remain disabled. This admin Worker remains **420a1334-2064-498c-9b8b-939559dfbf4c**. The next owner step is **Continue with Google** at `https://datacenterdread.org/account`. Evidence and the narrower Google-flag rollback are recorded in companion `docs/phase-12.md` and `docs/evidence/phase-12-owner-google-activation.json`. Real public Google/email login and moderation mutations remain pending; Phase 12 is not complete.
