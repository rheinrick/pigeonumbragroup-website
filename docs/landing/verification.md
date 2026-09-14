# Landing verification — September 14, 2026

- Local preview: http://127.0.0.1:4329/ using `npm run dev:landing`.
- Node 24.19.0, Wrangler 4.130.0, Playwright 1.62.1, installed Chrome.
- `npm run check`: all six tests passed; JavaScript syntax checks passed.
- `npm run build`: Wrangler dry-run passed; no deployment performed.
- `npm run test:landing`: desktop 1440×900, laptop 1366×600, mobile 390×844, small mobile 320×568 passed. Screenshots inspected; short-screen type reduced to keep the pigeon clear.
- Real H.264 playback advanced; manual pause/resume and keyboard activation passed. Visible focus outline and 44px control height.
- Reduced-motion and save-data initial loads requested no MP4. Explicit play loads exactly one video URL. Preference change detaches the video source.
- Visibility handler tested with deterministic document visibility events: pause when hidden, resume when allowed, retain manual pause. These are simulated events, not OS background-app tests.
- Rejected play promise, failed video request, disabled JavaScript, and static preference modes retain the poster and heading.
- No document overflow at tested sizes or unexpected JavaScript exceptions in normal flow. The intentionally aborted-video case naturally produces a failed network request.
- Existing admin synthetic browser suite passed after restoring its two missing module file mappings. Original admin application files and hosting configuration are unchanged.
- Worker tests confirm unauthenticated/forged identities cannot receive admin assets; verified synthetic backend identity can. Public root bypasses admin service calls; public asset allowlist excludes admin files/APIs. Live owner sign-in was not attempted.
- Video inspected as a 17-second monochrome H.264 stream with no audio, fast-start metadata, one-second loop dissolve. Poster and social image inspected.
- Existing checkout remains untouched, including pending DrLoGiCo work. Full fetch encountered a pre-existing malformed ref (`codex/phase-16-deep-dive 2`); direct remote lookup verified the Phase 19 starting commit.

## Screenshots

[Desktop](desktop.png) · [Short laptop](laptop.png) · [Mobile](mobile.png)

## Asset sizes

| Asset | Bytes | MiB |
| --- | ---: | ---: |
| `pigeons-poster-v1.jpg` | 100,578 | 0.096 |
| `pigeons-v1.mp4` | 4,321,997 | 4.122 |
| `social-v1.jpg` | 79,146 | 0.075 |

The single video is within the requested 3–6 MB target. Font is a separate 56 KB WOFF2; no third-party runtime requests.

## Handoff boundaries

No verified public inquiry email was available; link omitted. Production DNS/custom-domain routing and deployment are separate work. The original admin hostname remains the only configured production route. Full live acceptance will be needed after that step.
