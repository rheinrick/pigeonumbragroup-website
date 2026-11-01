# Pigeon Umbra Group — version 3.0

Prepared November 1, 2026 on `codex/pug-reaper-homepage-v3` in the public landing checkout. This version is saved locally and has not been committed, pushed or deployed.

The supplied black-metal wordmark sits over an extended cloudy sky. The artwork canvas is 25% taller than the original square, with additional clouds above the original reaper image. The flat header and fade to white have been removed. The original full-width illustration, its proportions and the lower fade to black are preserved. A small footer retains the company description and copyright, with links to versions 2.0 and 1.0. The new homepage needs no JavaScript or third-party resources.

## Source and assets

- Homepage: `public/landing/index.html`; styling: `public/landing/home-v3.css`.
- The owner's `Pigeon Umbra Group Black Metal Logo.png` was converted to a transparent 1200 × 400 WebP, quality 92 (258,456 bytes).
- The owner's `Reaper’s Flight of Shadows.png` was converted to a 1254 × 1254 WebP, quality 90 (575,234 bytes).
- Sky extension: created with the built-in image-generation tool using the original reaper artwork as the edit target. The selected generated asset is `public/landing/media/reapers-sky-v3.webp`, 1122 × 1402, quality 85 (453,182 bytes). The [complete generation prompt](cloud-extension-prompt.txt) requests upward outpainting and preservation of the original composition. The original generated PNG remains at `/Users/rheinrick/.codex/generated_images/01a197de-aca1-7f30-a0b8-94e9cbc9dfac/exec-4a2e0756-c742-4f4f-9ed2-9a59f83cafa7.png`.
- Only the new sky is shown from that generated asset. The original reaper WebP is layered over the lower portion, blending across its uppermost 4% of cloud texture. The original reaper, birds and ground are retained. The lower gradient is mapped to the same positions within the original square image. The logo remains a separate transparent image over the clouds.
- Originals remain in the owner's Downloads directory. Conversion used the already-installed Sharp package; no dependency was added. Compression may change fine texture slightly. The fades are CSS overlays, so they do not alter the image files.
- Version 2 is archived at `/v2/`. Its body is identical to the previous homepage; its title and canonical/Open Graph URLs identify the archive. Version 1 and both versions' original CSS, scripts and media remain unchanged.
- The public route allowlist adds only the four new assets and `/v2/`, including its slash redirect. Only `public/landing/` is staged for the public Worker.

## Verification

- `npm run check`: all nine syntax/unit/deployment-boundary checks passed. Archive tests cover both versions, GET/HEAD, redirects with query strings, POST denial and unknown-file denial.
- `npm run build:public`: public Worker dry-run passed with only the `ASSETS` binding.
- Browser inspection covered 1440 × 900, 768 × 1024, 390 × 844, 320 × 568 and 844 × 390. Images loaded, there was no horizontal overflow, and footer links retained 44px touch targets.
- Final desktop and mobile screenshots were captured against the actual local Wrangler public Worker. Both archive links were followed successfully, keyboard focus was visible, and no browser warning/error logs were recorded.
- Full-width follow-up: artwork edges match the viewport at 320, 390, 768, 1440 and 1920px, with no horizontal overflow and no side mask. The image retains its square proportions.
- Cloud extension follow-up: browser inspection at 320, 390, 768, 1440 and 1920px verified the full-width artwork, proportional original image, transparent logo header, absent white overlay, and no horizontal overflow. No browser warning/error logs were recorded. All nine checks and the public build dry-run passed again.
- [Current desktop preview](desktop-clouds.jpg), [current mobile preview](mobile-clouds.jpg), and [cloud layout measurements](cloud-layout-checks.json). The earlier full-width and initial previews remain alongside these for comparison.

Physical-device and Safari testing, the complete older audio/browser suites, and production deployment were not performed. The original administration checkout was not changed.

To preview again, use Node 24 and run `npm run dev:landing` in this checkout. The deployment target for a future release is `pug-public` through `wrangler.public.jsonc`.
