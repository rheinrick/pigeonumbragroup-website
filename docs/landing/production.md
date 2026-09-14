# Public production deployment — September 14, 2026

Live URLs: https://pigeonumbragroup.com/ and https://www.pigeonumbragroup.com/.

- Worker: `pug-public`
- Version: `c3f9d852-24db-4058-ac42-b7917b294ffc`
- Configuration: `wrangler.public.jsonc`
- Routes: `pigeonumbragroup.com/*`, `www.pigeonumbragroup.com/*`
- Assets: only the nine reviewed landing files; no admin assets or service bindings.
- Commands: `npm run build:public`, `npm run deploy:public`.

The initial Custom Domain attachment was rejected because the apex had externally managed DNS records. Deployment instead uses Workers routes over the existing proxied DNS records. No DNS records, MX/TXT records, admin deployment, or Access policies were changed. Before routing, the apex returned 525; after routing it returned the expected HTML with 200.

Existing DNS retained: apex A records `15.197.148.33` and `3.33.130.190`, www CNAME to the apex (all proxied, TTL Auto). The Worker handles all public requests without forwarding to these origin addresses. Keep these hostnames proxied. Removing the routes would restore the previous origin behavior, which returned an SSL error at verification time; prefer a Worker version rollback if a future release needs recovery.

## Live acceptance

- HTTPS apex and www: 200, expected title, heading and self-hosted assets.
- Installed Chrome: visible video playback and manual pause/resume confirmed.
- `LANDING_URL=https://pigeonumbragroup.com npm run test:landing`: passed desktop, short laptop, mobile and small-mobile checks; reduced-motion/data-saving no-video initial load; autoplay and explicit play; pause/resume; focus; visibility handler; failed/blocked playback; no-JavaScript fallback; no overflow.
- The live media wait budget is 20 seconds to allow a cold network fetch; the initial local-only 5-second budget was insufficient on the first production run.
- Public `/admin.js` and `/api/admin/session`: 404.
- `https://admin.pigeonumbragroup.com/`: 302 to Cloudflare Access, before and after deployment. No authenticated admin mutation was performed.
- Seven Worker/deployment tests passed. Public-only dry-run passed before upload.

The original admin checkout and its pending DrLoGiCo work remain untouched. The public deployment does not depend on them.
