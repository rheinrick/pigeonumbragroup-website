# DataCenter admin workspace layout

The DataCenter console previously stacked all fourteen modules on one page, with full moderation forms and audit details repeated for every record. The revised interface displays one selected section at a time. A persistent sidebar and a mobile-friendly Jump to section selector expose every section available to the current administrator. Section URLs retain their destination on reload; switching sections retains the current filters.

Community comments, reports and accounts use compact tables with expandable Review controls. Full text, thread inspection, identifiers and existing moderation forms remain available. Report resolution and comment visibility are separately labeled, and the reported comment status is shown in its review. Sources, contacts and audit history use expandable tables. Engagement runs/deliveries/watches and operational checks use tables; emergency controls are available in an explicit disclosure. Tables stack into labeled rows at narrow widths.

The initial layout change did not alter backend routes, authorization rules, account data, delivery behavior, billing gates or provider settings. The registered-user directory extension below adds a protected backend projection. Earlier uncommitted DrLoGiCo work in this checkout was preserved and is outside this change.

## Validation

- JavaScript syntax checks, focused lint and all six existing Worker/deployment-policy tests passed.
- Local browser checks through Codex computer use covered all fourteen section destinations, direct section reload, retained record type, empty reports, full thread text, keyboard review toggles, compact/expanded tables and a 390px viewport without page overflow.
- Synthetic moderation requests retained target ID, revision, action and reason. A simulated 409 preserved the form and enabled retry; retry succeeded. Read-only users had no moderation actions; an editor deep-link to Community fell back to Overview with restricted navigation absent. Publishing remained disabled under fixture capabilities.
- Wrangler deployment dry run passed with the existing private service bindings. The standalone browser regression script was updated for section navigation and expandable records; it was syntax checked, not executed through a separate browser driver in this run.

## Release status

Prepared and locally verified; **not deployed**. The existing scripts/deploy.mjs guard stopped because CLOUDFLARE_API_TOKEN is not available in the process environment. It requires an authorized token with Access Read and Worker deploy permissions so it can validate the live narrow Access policy before uploading. The guard was not changed or bypassed. Supply the credential privately through the local environment, then complete guarded deployment and live owner acceptance.

Preview uses synthetic records only. No production report or comment was changed by Codex. The owner-reported hide confirmation and email receipt are recorded in the companion DataCenter beta acceptance ledger; actual public hiding, restoration, report resolution and audit inspection remain separate checkpoints.

## Registered users extension — September 22, 2026

The owner requested a list behind the account count. **Registered users** is now a dedicated fifteenth section for owner/admin roles, also linked from Operations. Its compact table shows display name, email, account status and registration date. Expandable details show account ID, email verification, last sign-in, last update and comment count. Search accepts display name, email or exact account ID; status filtering, clear filters, totals and cursor pagination are supported. These are shared Main/Dread accounts, not separate per-site user lists, and display names are not unique usernames.

The companion control Worker extends GET /api/admin/community/users with email and email-search access only for owner/admin roles. Moderator/readonly responses continue to omit email and cannot infer it through email search or matching counts. Deleted accounts have no email projection. Anonymous callers, ordinary public sessions, forged identity headers and editors remain denied. Public profiles and comments are unchanged. Responses remain no-store; no schema migration is needed.

Validation: the real Worker/D1 community suite (five tests, including the new directory authorization, search, count and 28-account pagination coverage), Worker type-check, focused lint, frontend syntax checks and local admin Worker/deployment-policy tests passed. Browser checks through Codex computer use covered menu navigation, Operations shortcut, direct reload, email search, status filtering, empty results, failed-request retry, two-page loading, unsubmitted-search isolation, account details, unverified/missing-login labels, escaped display-name markup, and restricted-role navigation. The 390px mobile check had no page overflow. Both admin and control Worker deployment dry runs passed. The clean admin release snapshot also passed its four committed Worker/deployment-policy tests; the working-tree check additionally exercised two preserved DrLoGiCo tests. The standalone browser test fixture was updated but the separate browser driver was not run.

The preview contains clearly labeled synthetic accounts. It does not verify the owner's reported live count of four. **Both the control Worker and admin UI changes remain undeployed.** Publish the backend first, then the clean admin branch using its existing Access-verification deployment guard once the authorized credential is supplied. Preserve unrelated DrLoGiCo working-tree changes. Resume D3 public hide/restore, report resolution and audit verification after live acceptance; this directory side task does not complete D3.
