# DataCenter admin workspace layout

The DataCenter console previously stacked all fourteen modules on one page, with full moderation forms and audit details repeated for every record. The revised interface displays one selected section at a time. A collapsible Workspaces menu nests the available subsections beneath DataCenter. On mobile, this same menu stays available at the top and closes after selection. Section URLs retain their destination on reload; switching sections retains the current filters.

Community comments, reports and accounts use compact tables with expandable Review controls. Full text, thread inspection, identifiers and existing moderation forms remain available. Report resolution and comment visibility are separately labeled, and the reported comment status is shown in its review. Sources, contacts and audit history use expandable tables. Engagement runs/deliveries/watches and operational checks use tables; emergency controls are available in an explicit disclosure. Tables stack into labeled rows at narrow widths.

The initial layout change did not alter backend routes, authorization rules, account data, delivery behavior, billing gates or provider settings. The registered-user directory extension below adds a protected backend projection. Earlier uncommitted DrLoGiCo work in this checkout was preserved and is outside this change.

## Validation

- JavaScript syntax checks, focused lint and all six existing Worker/deployment-policy tests passed.
- Local browser checks through Codex computer use covered all fourteen section destinations, direct section reload, retained record type, empty reports, full thread text, keyboard review toggles, compact/expanded tables and a 390px viewport without page overflow.
- Synthetic moderation requests retained target ID, revision, action and reason. A simulated 409 preserved the form and enabled retry; retry succeeded. Read-only users had no moderation actions; an editor deep-link to Community fell back to Overview with restricted navigation absent. Publishing remained disabled under fixture capabilities.
- Wrangler deployment dry run passed with the existing private service bindings. The standalone browser regression script was updated for section navigation and expandable records; it was syntax checked, not executed through a separate browser driver in this run.

## Release status

**Both reviewed versions are active as of September 22, 2026 (02:08 UTC September 23); signed-in owner verification is pending.** A privately supplied token passed the existing live Access guard. Control version `ee9ea46c-d9a4-4711-b655-1a1aff4d7279` and admin version `231366da-ef88-4e62-a1cc-baf6e4a2e1f9` are each deployed at 100%.

The admin command uploaded and activated the new version, then exited with a missing Workers Routes read permission during route inspection. The existing `admin.pigeonumbragroup.com` → `pug-admin` production mapping and absence of conflicting routes were subsequently verified read-only using the existing Wrangler OAuth login. No domain changes were needed or performed. The root page, admin JavaScript and registered-user API all redirect anonymous requests to Cloudflare Access. This is a verified active release with a recorded CLI finalization caveat, not a clean command exit. Future use of this token for a complete Wrangler deploy needs its route permissions reviewed. No guard was bypassed.

Preview uses synthetic records only. No production report or comment was changed by Codex. The owner-reported hide confirmation and email receipt are recorded in the companion DataCenter beta acceptance ledger; actual public hiding, restoration, report resolution and audit inspection remain separate checkpoints.

## Registered users extension — September 22, 2026

The owner requested a list behind the account count. **Registered users** is now a dedicated fifteenth section for owner/admin roles, also linked from Operations. Its compact table shows display name, email, account status and registration date. Expandable details show account ID, email verification, last sign-in, last update and comment count. Search accepts display name, email or exact account ID; status filtering, clear filters, totals and cursor pagination are supported. These are shared Main/Dread accounts, not separate per-site user lists, and display names are not unique usernames.

The companion control Worker extends GET /api/admin/community/users with email and email-search access only for owner/admin roles. Moderator/readonly responses continue to omit email and cannot infer it through email search or matching counts. Deleted accounts have no email projection. Anonymous callers, ordinary public sessions, forged identity headers and editors remain denied. Public profiles and comments are unchanged. Responses remain no-store; no schema migration is needed.

Validation: the real Worker/D1 community suite (five tests, including the new directory authorization, search, count and 28-account pagination coverage), Worker type-check, focused lint, frontend syntax checks and local admin Worker/deployment-policy tests passed. Browser checks through Codex computer use covered menu navigation, Operations shortcut, direct reload, email search, status filtering, empty results, failed-request retry, two-page loading, unsubmitted-search isolation, account details, unverified/missing-login labels, escaped display-name markup, and restricted-role navigation. The 390px mobile check had no page overflow. Both admin and control Worker deployment dry runs passed. The clean admin release snapshot also passed its four committed Worker/deployment-policy tests; the working-tree check additionally exercised two preserved DrLoGiCo tests. The standalone browser test fixture was updated but the separate browser driver was not run.

The preview contains clearly labeled synthetic accounts. It does not verify the owner's reported live count of four. The backend and clean admin release were subsequently activated in that order; see the current release status above. Signed-in verification of the real user directory is pending. Preserve unrelated DrLoGiCo working-tree changes. Resume D3 public hide/restore, report resolution and audit verification after live acceptance; this directory side task does not complete D3.

## Nested workspace navigation — September 22, 2026

Following owner feedback, the separate DataCenter sections list and duplicate Jump to section selector are replaced by **Workspaces → DataCenter → subsections**. DataCenter expands to show its permitted sections; switching workspaces collapses it. Selecting a subsection highlights its link, displays its content, scrolls it into view and focuses its heading. Selecting an already active link also returns to its section. The desktop menu is collapsible; mobile uses the same hierarchy in a compact sticky menu that closes after selection. Existing section URLs and record filters are preserved.

Browser verification covered all fifteen owner destinations, direct-link reload, switching to another workspace and reopening DataCenter by keyboard, role-restricted links and fallback, and the 390px menu/section jump without horizontal overflow. JavaScript syntax checks and focused lint passed. The existing standalone browser script's navigation helper was adapted, but that separate browser driver was not run. No backend, role policy or live account changes were made in this navigation follow-up. The prepared admin release was subsequently activated after its Access guard passed; see the current release status above.
