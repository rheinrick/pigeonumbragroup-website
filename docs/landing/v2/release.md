# Public homepage release — November 1, 2026

The redesign is live at <https://pigeonumbragroup.com/> and <https://www.pigeonumbragroup.com/>. Version 1.0 remains at <https://pigeonumbragroup.com/v1/>.

- Source commit: `16ac59e` on `codex/pug-dark-homepage-v2`, pushed to origin.
- Worker: `pug-public`, using `wrangler.public.jsonc`.
- Deployed at: `2026-11-01T16:02:27.559Z`.
- Active version: `6e568c3d-cd5a-4b6b-ba11-f015c6237432`, confirmed at 100% by the deployment list.
- Previous version for rollback: `453d2dd5-a5d5-4c85-81da-96d520be1065`.
- Binding: `ASSETS` only. Upload contained six new or changed landing assets. Admin Worker, DNS and Access were not changed.

[Live HTTP checks](live-checks.json) confirmed both homepage hosts, the archive and all four new assets returned their exact source bytes. The archive's slash redirect preserves query strings, HEAD returns no body, and POST returns 405. Public requests for admin files and unlisted internal asset paths return 404. The admin hostname still redirects to Cloudflare Access.

Browser verification followed the live footer link to the archive and confirmed the original video was playing with readyState 4. Screenshots: [new homepage](live-desktop.png), [v1 archive](live-archive.png). Local responsive checks and remaining browser/audio coverage limits are in [README.md](README.md).
