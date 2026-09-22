# DataCenter admin workspace layout

The DataCenter console previously stacked all fourteen modules on one page, with full moderation forms and audit details repeated for every record. The revised interface displays one selected section at a time. A persistent sidebar and a mobile-friendly Jump to section selector expose every section available to the current administrator. Section URLs retain their destination on reload; switching sections retains the current filters.

Community comments, reports and accounts use compact tables with expandable Review controls. Full text, thread inspection, identifiers and existing moderation forms remain available. Report resolution and comment visibility are separately labeled, and the reported comment status is shown in its review. Sources, contacts and audit history use expandable tables. Engagement runs/deliveries/watches and operational checks use tables; emergency controls are available in an explicit disclosure. Tables stack into labeled rows at narrow widths.

No backend routes, authorization rules, account data, delivery behavior, billing gates or provider settings are changed by this work. Earlier uncommitted DrLoGiCo work in this checkout was preserved and is outside this change.

## Validation

- JavaScript syntax checks, focused lint and all six existing Worker/deployment-policy tests passed.
- Local browser checks through Codex computer use covered all fourteen section destinations, direct section reload, retained record type, empty reports, full thread text, keyboard review toggles, compact/expanded tables and a 390px viewport without page overflow.
- Synthetic moderation requests retained target ID, revision, action and reason. A simulated 409 preserved the form and enabled retry; retry succeeded. Read-only users had no moderation actions; an editor deep-link to Community fell back to Overview with restricted navigation absent. Publishing remained disabled under fixture capabilities.
- Wrangler deployment dry run passed with the existing private service bindings. The standalone browser regression script was updated for section navigation and expandable records; it was syntax checked, not executed through a separate browser driver in this run.

## Release status

Prepared and locally verified; **not deployed**. The existing scripts/deploy.mjs guard stopped because CLOUDFLARE_API_TOKEN is not available in the process environment. It requires an authorized token with Access Read and Worker deploy permissions so it can validate the live narrow Access policy before uploading. The guard was not changed or bypassed. Supply the credential privately through the local environment, then complete guarded deployment and live owner acceptance.

Preview uses synthetic records only. No production report or comment was changed by Codex. The owner-reported hide confirmation and email receipt are recorded in the companion DataCenter beta acceptance ledger; actual public hiding, restoration, report resolution and audit inspection remain separate checkpoints.
