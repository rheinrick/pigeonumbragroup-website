# Phase 18 admin — engagement operations

Branch: `codex/phase-18-retention-alerts`, based on `ee21594`. Adds the protected DataCenter Engagement section and a narrow proxy for its operations. Owner/admin access remains enforced by Cloudflare Access and the existing backend role check.

Aggregate metrics cover watchlist users/facilities, areas, saved views, notifications/unread counts, provider-accepted deliveries, failed/uncertain deliveries, daily digests and exports. Recent run and delivery states support troubleshooting. Watcher identities, account emails, private company evidence and billing details are absent from this aggregate view. Manual runs and known-failed retries require the protected backend and record audit history; retries require a reason and stop at three attempts. Uncertain provider outcomes cannot be blindly resent.

A temporary isolated acceptance button was enabled only while a separate test database binding existed. Deployed provider acceptance, actual inbox receipt, repeat-run idempotency and post-unwatch suppression passed; that binding was removed and the control endpoint closed. No public catalog/report/comment or entitlement fixture was written. Admin syntax/tests (4 cases) and real protected owner UI passed. Public admin routes on Dread remain closed.

Changed: `public/engagement.js`, `public/admin.js`, `public/index.html`, `worker/index.js`, `package.json`, this handoff. Final implementation commit and active deployment are recorded in the private atlas Phase 18 handoff. No production commerce activation, new provider or Phase 19 work.

Admin-only rollback: with the existing authorized deployment credential, run `node node_modules/wrangler/bin/wrangler.js rollback 002f12e6-693b-41c4-b50d-f18a116cb331 --config wrangler.jsonc --yes --message 'Rollback Phase 18 admin'` from this repository. Preserve Access and D1. Full coordinated rollback is in the private atlas handoff; never drop additive retention history for a code rollback.
