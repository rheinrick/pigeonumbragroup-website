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

**Phase 12 of 19 complete. Deployed behind Access; real owner login, comment hiding/restoration and report resolution with audit records are accepted.** The owner completed Zero Trust Free onboarding, configured the exact hostname and sole owner-email Allow policy, and selected One-time PIN only. Authenticated API inspection verified that configuration before deployment. Anonymous page, asset and administrator API requests redirect to the correct Access login. No unprotected console was published.

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

## Google accepted and email acceptance started

The owner completed real public Google login and chose display name **RDOGG**. The live account page confirms Google authentication and verified email ownership; this console's Users queue confirms the matching active, verified account with zero comments. No moderation mutation has been performed.

Companion configuration commit **7f078df** enables email sign-in for its first real delivery/login test. Control version **c7afc583-ecff-4a7f-8e47-1507dc36fb64** preserves Access, provider secrets and the approved email sender. Live Google/email flags are true; community posting and contact delivery stay false. This admin Worker remains **420a1334-2064-498c-9b8b-939559dfbf4c**. The next owner action is to sign out on the public account page and request an email link using the same address as Google, then verify the same account. No email was sent by the agent. See companion `docs/evidence/phase-12-google-email-activation.json` for sanitized evidence. Email delivery/login, posting and moderator mutation acceptance remain pending within Phase 12 of 19.

## Email login accepted; matching-account check pending

The owner reported successful email sign-in. Read-only companion D1 checks corroborate a new verified **Community member** account with a session and no Google link. Its normalized email differs from the original RDOGG Google account; private emails and session tokens were not returned. The available Chrome profile remained signed out, and the browser used for email redemption is unconfirmed. Real email login is accepted for the separate address; the next check is email login using the exact RDOGG address and verification of the original account. No accounts were merged, no database writes or emails were performed by the agent, and posting remains disabled. Control/admin versions are unchanged. Companion evidence: `docs/evidence/phase-12-email-acceptance.json`. Phase 12 of 19 still requires same-account login and real comment/moderation acceptance.

## Same-account login accepted; first comment test ready

The owner confirmed email login using the original RDOGG address. A read-only query confirms a new session on the original account, its preserved Google link and unchanged total of two accounts. The email-redemption browser itself was not inspected; acceptance is based on the owner's report and database evidence. This console was reopened as the expected owner and loaded the comments queue successfully. The existing live Access verifier passed without changing any policy.

Companion configuration commit **1e5bac5** enables posting for guided beta acceptance, deployed as control **0f991b1e-2792-4a2b-a96e-d3af1b9eefde**. All three community/security integration tests, generated types and dry run passed. Anonymous posting stays denied and public admin endpoints stay unavailable. Posting now admits all active verified accounts; actual live comment and moderator mutations remain pending. The next owner step is a clearly labeled beta test comment on Digital Realty PHX10, followed by moderation/audit testing. The admin Worker remains **420a1334-2064-498c-9b8b-939559dfbf4c**. See companion `docs/evidence/phase-12-comment-activation.json` and its posting-only rollback. Phase 12 of 19 remains in progress.

## Final acceptance — Phase 12 complete

The owner completed real posting, replying, editing, reply deletion, reporting from the second public account, comment hiding/restoration, report resolution and logout. Public responses and read-only D1 queries verified the result, including cleared deleted text and the three expected audit records. The test comment remains clearly labeled and the report is resolved with a no-violation reason. Mobile public/account/map checks passed after the final backend deployment. Required Phase 12 live acceptance is complete; additional account-moderation variants retain automated coverage rather than a claim of manual production testing.

Final companion code commit **1bf31ed** fixes cleanup of Better Auth ISO-text expiry rows, with a failing-before/passing-after real-D1 regression. Four community tests, Worker typecheck, targeted lint and dry run passed. Current private control version is **aeb1742d-2aec-43ce-9c4e-cca101d079ea**; this admin Worker remains **420a1334-2064-498c-9b8b-939559dfbf4c**. The final cron tick was not directly observed. Preserve the Access gate and use flag-based posting pause on current control code when needed, retaining the cleanup fix.

The complete handoff and consolidated evidence are in companion `docs/phase-12-handoff.md` and `docs/evidence/phase-12-final-acceptance.json`. No further provider credentials are needed for the accepted beta scope. Renew the temporary admin deployment token privately before later deployments after its September 16, 2026 expiry; the running console does not depend on that token. R2 managed publication remains separate. Phase 13 is not started.
