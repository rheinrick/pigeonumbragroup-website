# Desktop spacing and logo adjustment — November 1, 2026

Published to <https://pigeonumbragroup.com/> and <https://www.pigeonumbragroup.com/> at `2026-11-01T16:43:51.360498Z` (9:43 a.m. America/Phoenix).

Above the existing 600px mobile breakpoint, the logo now occupies 90% of the viewport width and uses a 2172px source image. The sky extension is reduced from 25% to 18% of the viewport width. At 1440px this moves the original artwork upward by approximately 101px. The background position and lower fade are adjusted to preserve the original artwork's cloud seam and lower shading. The stylesheet URL includes `?v=3.1` so returning visitors load the new CSS.

The mobile CSS and smaller logo asset are unchanged. Browser comparison of the 390px layout before and after publication found identical hero, artwork, logo and footer geometry. Responsive boundary checks covered 600px, 601px and 1920px; no horizontal overflow was present. The live desktop logo measured 1296px in a 1440px viewport, with the new image loaded.

- Source commit: `0bddaa76ddf6aa3fa5d546e647a667af7bc94e44`, pushed on `codex/pug-reaper-homepage-v3`.
- Active public Worker version: `91c343f6-bf55-4496-8a0b-c78a9d6a2c90`, provider-confirmed at 100%.
- Rollback version: `5da97a88-eee5-47c9-bed3-394939005ff7`.
- All nine existing checks and the public build dry-run passed. All eight live HTTP/source-byte checks passed across both domain addresses. Browser error/warning logs were empty.
- Only three public assets changed in the upload: the homepage, stylesheet and new desktop logo. Admin, DNS and Access configuration were unchanged.

Evidence: [provider and HTTP verification](desktop-adjustment-release.json), [baseline](desktop-adjustment-baseline.json), [local responsive comparison](desktop-adjustment-checks.json), [live desktop](live-desktop-adjustment.jpg), and [live mobile](live-mobile-adjustment.jpg).

Physical-device and Safari testing were not repeated for this change.
