# Public landing page

## Local workflow

Use Node 24.19.x and the existing npm lockfile (`npm ci`).

- `npm run dev:landing` — local Worker at http://127.0.0.1:4329/.
- `npm run check` — syntax, Worker routing/authentication, deployment-gate tests.
- `npm run build` — Wrangler dry-run bundle validation; does not deploy.
- `npm run test:landing` — Chrome screenshots and motion/fallback checks against the running local Worker. Override `LANDING_URL` if needed.
- `npm run test:browser` — existing synthetic admin browser suite.

The local upstream override is intentional: Wrangler otherwise derives the admin hostname from the existing route and presents the protected admin console. `npm run dev` retains its original behavior. Browser tests use installed Chrome, matching the existing suite; optional `PLAYWRIGHT_CHANNEL` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` overrides are supported.

## Implementation and routing

`public/landing/index.html`, `landing.css`, and `motion.js` contain the page. The original `public/index.html` remains the admin console. `worker/landing.js` serves only an explicit public file allowlist on the apex/www hostname (or localhost for development), before admin authentication. Public rendering performs no admin service requests. Unknown public paths return 404; the admin hostname retains its original identity verification, APIs, no-store and noindex headers.

**No production deployment or DNS/Access change is included.** Existing Wrangler routes remain admin-only. A separately approved production step must attach the public hostname(s), confirm their public Access policy, preserve the admin hostname's Access policy, and test live delivery. This branch starts at committed Phase 19 `1a4d1be`; pending DrLoGiCo edits in the original checkout are deliberately excluded and must be reconciled before a later release.

## Media and licensing

Acquired September 14, 2026.

- Selected footage: [Pigeon On Ground / Close-up of pigeons walking by a riverside pathway on a calm day](https://www.pexels.com/video/pigeon-on-ground-4216719/).
- Creator: [SANTSCHi FILMS](https://www.pexels.com/@santschi-films/).
- [Pexels License](https://www.pexels.com/license/) permits commercial website use and modification; attribution is not required. The footage is a decorative scene, not a trademark or logo. No endorsement is implied. Do not distribute it as standalone stock media.
- Authorized source download: `https://videos.pexels.com/video-files/4216719/4216719-uhd_2560_1440_25fps.mp4`.
- Compared against [Oktay Köseoğlu's street-corner clip](https://www.pexels.com/video/pigeons-pecking-grain-on-urban-street-corner-31628596/). The selected riverside framing keeps a pigeon in the narrow crop and avoids the other clip's background pedestrian and prominent pole.
- Font: Anton, copyright 2020 The Anton Project Authors, [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/anton). Self-hosted as WOFF2, converted from the full TTF without glyph subsetting. SIL Open Font License 1.1 is preserved at `public/landing/fonts/OFL.txt`.

Assets in `public/landing/media/`:

- `pigeons-v1.mp4`: 17 seconds, 1600 × 900, H.264/yuv420p, 25 fps, fast-start, no audio. One source for all viewports, avoiding duplicate downloads.
- `pigeons-poster-v1.jpg`: extracted first frame, 1600 × 900.
- `social-v1.jpg`: 1200 × 630, composed from the licensed still and HTML wordmark's typography.

The original clip is slowed to two-thirds speed. A one-second tail-to-head dissolve masks the cut; the resulting loop resumes at the frame following the dissolved head segment. The source master is not included.

## Replacing or adjusting the scene

Obtain and document permission for replacement footage first. Export H.264 MP4 with `-an`, `-pix_fmt yuv420p` and `-movflags +faststart`; prefer 15–30 seconds and about 3–6 MB. Extract a matching JPEG poster. Keep first and last frames visually continuous and check the full loop. Update the versioned filenames in the HTML, JavaScript and Worker allowlist, and regenerate the social image. Asset responses cache for one day; HTML revalidates. Version filenames when replacing assets.

The CSS variables `--focal-x`, `--focal-y` and `--shade` control cover cropping and the black overlay. There are separate mobile overrides. Keep birds clear of the text at both portrait and short landscape sizes.

The video has no source until the script decides motion is appropriate. Reduced-motion/data-saving visitors receive only the still until they choose Play motion. No JavaScript means the still and real heading remain complete, with no unusable button. Playback rejection/failure retains the still. Background-tab pausing preserves a manual pause; a new motion-reduction preference stops playback and detaches the source.

No verified public business email was found. To add Inquiries, first verify the address is approved for public use, then add a `mailto:` link in the footer and style its focus/touch target. Never use the admin allowlist address. No trackers or third-party browser resources are used.

## Verification

See `docs/landing/verification.md` for results and screenshots. Existing admin browser fixture mapping was missing `operations.js` and `engagement.js`; those mappings are added so its pre-existing module imports load in the test server. Admin application files are unchanged.
