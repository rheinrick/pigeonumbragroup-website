# Pigeon Umbra Group — version 2.0

Prepared November 1, 2026 from public landing commit `f4af4e005dfe9254746a1bd33a96ed8247d8b71c` on branch `codex/pug-dark-homepage-v2`.

The public homepage centers the owner's supplied winged emblem over a dark monochrome conservatory. A small footer retains the business name and independent-project description, provides a motion pause button, and links to `/v1/`. The new page has no audio, video download, external fonts or third-party browser requests.

The former page is archived at `/v1/`. Its body is byte-for-byte identical to the live homepage downloaded before editing; only its title and canonical/Open Graph URL change. Original CSS, video, poster, optional soundtrack, audio/motion scripts and credits remain available at their original asset URLs. `/v1` redirects to `/v1/` with its query string preserved. The original source remains in Git at the commit above.

## Assets

- Logo: supplied by the owner through [this shared image](https://chatgpt.com/s/m_6ae75dabc4c081919e51365b1a9a317c), titled “Pigeon Umbra Group: Crimson Winged Emblem.” The original is retained in `source/pug-logo.png`. The deployed `public/landing/media/pug-logo-v2.webp` preserves its transparency and is 968,250 bytes at quality 94.
- Background: generated with the built-in image-generation tool, retained in `source/night-conservatory.png`. The deployed `public/landing/media/night-conservatory-v2.webp` is 126,084 bytes at quality 82. Full prompt is in [background-prompt.txt](background-prompt.txt).
- WebP conversion uses the already-installed Sharp package. No package or dependency was added. Originals remain available; compression can change fine texture slightly.

## Motion and access

The background uses a slow CSS pan/zoom, paused until JavaScript selects motion. It pauses in hidden tabs and preserves manual pauses. Reduced-motion visitors receive a stationary background and no animation control. Data-saving mode starts paused. Without JavaScript, the complete page and archive link remain usable.

The explicit public route/asset allowlist is retained. Both homepages revalidate; media keeps the existing one-day cache policy. The build stages only `public/landing/`. Admin files, service bindings, database operations and Access configuration are not part of this release.

## Local verification

- All nine syntax/unit/deployment-boundary checks passed, including new archive routing, method handling, unknown-file denial, preferences, tab visibility and manual-pause tests.
- Public Worker deployment dry-run passed with only the `ASSETS` binding.
- Browser review covered the default desktop viewport, 390 × 844 and 320 × 568. New homepage images loaded, motion paused correctly and there was no horizontal or vertical overflow. Desktop and mobile screenshots are alongside this note.
- Browser navigation reached the v1 archive, and its original pigeon video played. Unchanged audio logic was not re-exercised end-to-end during this redesign.
- The existing landing/audio browser scripts now target `/v1/` so their historical checks continue to describe the preserved page. The complete old browser suites and physical-device/Safari tests were not run for this change.

The local PUG dependency tree stalled during Wrangler startup. Validation and preview used the already-installed Wrangler 4.130.0 in the DrLoGiCo checkout with this project's explicit `wrangler.public.jsonc`; no files in DrLoGiCo were changed. Node was 24.22.1. The checks ran via `pnpm run check` because `npm` was absent from the shell PATH.

## Release boundary and rollback

Only `pug-public` is the deployment target, through `wrangler.public.jsonc`; never use the admin deployment configuration for this page. Before this release, the latest public deployment was version `453d2dd5-a5d5-4c85-81da-96d520be1065`. Exact release results are recorded separately after deployment. No DNS or Access changes are needed.
