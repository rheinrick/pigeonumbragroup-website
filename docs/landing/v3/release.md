# Version 3 public release — November 1, 2026

The later [footer cleanup](footer-cleanup-release.json), following the [desktop spacing and logo adjustment](desktop-adjustment.md), is now the active release. The record below describes the initial version 3 publication.

The approved full-width reaper design with the extended cloud sky is live at <https://pigeonumbragroup.com/> and <https://www.pigeonumbragroup.com/>. Both earlier designs remain available at `/v2/` and `/v1/` through the footer.

- Source commit: `f500df271a47f9181542dae2ccce4d2546e73a42` on `codex/pug-reaper-homepage-v3`, pushed to origin.
- Worker: `pug-public`, deployed through `npm run deploy:public` using `wrangler.public.jsonc`.
- Deployed: `2026-11-01T16:33:28.385509Z` (9:33 a.m. America/Phoenix).
- Active version: `5da97a88-eee5-47c9-bed3-394939005ff7`, confirmed at 100% by the provider's deployment list.
- Deployment ID: `bf8cc7e8-94fd-4e5e-8f61-71221be94835`.
- Previous version for rollback: `6e568c3d-cd5a-4b6b-ba11-f015c6237432`.
- Binding: `ASSETS` only. Six new or modified public assets were uploaded. Admin Worker, DNS and Access configuration were not changed.

The [pre-deployment check](pre-deploy-check.json) confirmed the previous live homepage body matched the preserved version 2 archive. All nine existing syntax/unit/deployment-boundary checks and the public deployment dry-run had passed for this source before publication.

All 23 [live HTTP checks](live-checks.json) passed. The homepage, both archives, CSS and all three new images returned exact source bytes on both domain addresses (14 source matches). Archive slash redirects preserve query strings; HEAD returns no body; POST returns 405. Unlisted and administrative paths are denied on the public domain, and the administration hostname continues redirecting anonymous users to Cloudflare Access.

Live browser checks confirmed the logo over the cloud extension, the full-width original illustration, mobile layout without horizontal overflow, and working footer navigation to both archive pages. No browser warning/error logs were recorded. Screenshots: [desktop](live-desktop.jpg) and [mobile](live-mobile.jpg). [Provider deployment evidence](deployment.json) records the active version and source commit.

Physical-device/Safari acceptance and the complete older audio/browser suites were not repeated for this release. Existing audio and motion code was unchanged.
