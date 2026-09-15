# Optional lobby soundtrack

## Asset and rights (verified 2026-09-14)

- **Devonshire Waltz Andante — Kevin MacLeod (incompetech.com)**, ISRC USUAN2100015, published July 12, 2021. This is a contemporary original waltz, not a vintage recording or an adaptation of the Caretaker reference.
- [Creator's track page](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2100015). The rendered track page explicitly provides the title, creator and **Creative Commons Attribution 4.0** attribution code. Instrumentation: piano, bass, strings, French horn, trumpet, flutes, clarinets, kit; 84 BPM; 6:28.
- [Original download](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Devonshire%20Waltz%20Andante.mp3).
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) permits commercial redistribution and adaptations, including self-hosted website background playback and loop edits. Credit the creator, link the license/source, identify edits and do not imply endorsement. No purchase, subscription, or further permission is required for this licensed use.
- [Creator's FAQ](https://incompetech.com/music/royalty-free/faq.html) confirms that his music is copyrighted, distributed under the attribution license, and may be edited; credits may be behind a discoverable credits option. We rely on the creator's license for both his composition and recording, not an assumption that old music is public domain.
- No Caretaker recording or melody was copied or sampled.
- Source catalog entry is preserved in `source-metadata.json`, retrieved from https://incompetech.com/music/royalty-free/pieces.json.
- Original SHA-256: `589c04c03bf467fc365165745a406d9c09061576825a603c656005948bcc53a5`.
- Edited MP3 SHA-256: `39b24d8da18242ed16616641e6b80a423abee9ebae117adf5f2c93fbf566459b`.

## Edit

80-second mono, 96 kbps MP3 (approximately 0.96 MB). Excerpt starts at original 8.571429 seconds; slowed to 82% (~69 BPM, pitch lowered), high-pass 180 Hz, low-pass 2300 Hz, gentle 0.22 Hz pitch variation, short room echoes, quiet generated pink-noise hiss. A 3-second tail/head crossfade joins the circular loop; the track does not fade to silence at each boundary. `build-loop.py` records the FFmpeg/NumPy recipe with a sample-aligned circular crossfade; invoke from repository root with `FFMPEG=/path/to/ffmpeg sh docs/landing/audio/build-loop.sh /path/to/original.mp3`. Noise uses a fixed random seed and a periodic spectrum. Rebuilding requires Python with NumPy and FFmpeg; use `PYTHON=/path/to/python` if necessary. Encoder versions can change output hashes.

## Hosting, credits and replacement

- Controlled asset: `public/landing/media/lobby-waltz-v1.mp3`, served at `/landing/media/lobby-waltz-v1.mp3` by the existing public Worker.
- Listening link after deployment: https://pigeonumbragroup.com/landing/media/lobby-waltz-v1.mp3
- Visible **Music credits** link opens `/landing/credits/`, with title, artist, source, license, edit description and listening link.
- To replace: confirm both composition/recording rights, add a new versioned audio file under `public/landing/media/`, set `data-audio-src` on `#audio-control` in `public/landing/index.html`, add its exact path to `worker/landing.js`, update credits and this document, run checks and deploy the public config. Do not overwrite the same cached asset name.
- Set `data-audio-src=""` to leave the integration installed but hide audio and credits controls. No placeholder music is loaded.

## Playback

No audio element, fetch, AudioContext or persisted sound preference on arrival. Only the audio button enables playback. Web Audio decodes once and loops one independent buffer source with sample-accurate wrapping. Gain ramps from zero to 0.2 over 2.5 seconds; mute immediately zeros gain, disconnects output and suspends the context. Suspension preserves position through tab switches. Hidden tabs also cancel pending downloads. Page exit resets intent, including back/forward-cache restoration. Failed load/resume resets to Enable audio and announces a retry message. During loading, Cancel audio allows immediate cancellation. CSP permits only same-origin audio fetches. No external embeds or runtime dependencies.

## Verification

See `tests/audio-browser.mjs` and `tests/landing-browser.mjs`. Run `npm run check`, `npm run test:landing`, `npm run test:audio` against the public local preview via `LANDING_URL`. Visibility tests inject browser visibility events to exercise the actual handler deterministically. Automated Chrome kept both tabs marked visible during attempted native tab switching, so actual OS tab switching is not certified by this run. Mobile checks emulate touch/320×568 in Chrome; they are not physical iOS/Safari certification. Loop checks cross a real decoded buffer boundary at accelerated playback speed. Music's subjective aesthetic suitability remains open to the owner's listening judgment.

### Results — 2026-09-14

- Repository syntax/security checks: 7/7 passed.
- Existing landing browser checks passed at 1440×900, 1366×600, 390×844 and 320×568, including motion, reduced motion, poster fallback, focus and no overflow.
- New audio browser suite passed desktop keyboard and emulated mobile touch: zero audio requests on arrival or unrelated clicks; explicit opt-in; 2.5-second ramp; immediate disconnected output on mute; source reused independently of motion; reload/back arrival silent; credits navigation silent; visibility pause/resume/mute intent; failed load, denied resume, cancelled loading and unconfigured-asset fallback.
- Actual MP3 decoded to exactly 80 seconds. An offline browser audio render across the loop boundary measured seam jump 0.00850 at full asset gain (0.00170 at playback gain), with nonzero adjacent audio RMS of 0.0451 and 0.0518. Native source looping also crossed the boundary at accelerated speed without recreation.
- Public Worker dry-run passed. Admin Worker/configuration unchanged.
- Limitation: physical iOS/Safari and actual OS tab switching were not certified. Automated Chrome reported both tabs visible; native UI inspection timed out. Visibility-event behavior was verified directly in the browser.
