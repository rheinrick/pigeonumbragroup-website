# Phase 13 of 19 — DataCenter billing administration

Branch: `codex/phase-13-stripe-entitlements`, starting from clean `11851a6`.

Adds a DataCenter Billing section: TEST/LIVE mode, public checkout gates, complete totals, and the latest 100 customers/subscriptions/purchases/webhook records. Customer rows include application user ID/name, plan, Stripe association, subscription status and purchase count. Subscriptions show period/cancellation; purchases show facility, amount/status/refund; webhooks show processed/failed state and sanitized errors.

Owner/admin can reconcile one mapped customer or known subscription with a reason. Readonly can inspect; editor/moderator cannot read billing. Private control independently verifies Access identity and role, and mutations require exact admin Origin. The front Worker allows only `/api/admin/billing/state` and `/api/admin/billing/reconcile`, alongside existing routes. All service-binding authorization and deployment Access guards remain intact. Billing failure does not break other console modules.

`public/billing.js` renders via textContent, never raw HTML. Tables scroll inside their section on mobile. Shared product navigation remains unchanged. UI/API mocks and the existing admin security/browser suite cover the new section and unchanged administration. Actual authenticated production billing-panel acceptance is distinct from these mocks and requires the owner's browser session.

Full schema, Stripe configuration, idempotency, entitlement policy, test plan, limits and rollback: `../datacenterdata-website/docs/phase-13.md`.

Deployment must use `npm run deploy` with the existing private Cloudflare token in the environment. The script checks the exact live Access app/policy before invoking Wrangler. No new Access/DNS configuration or paid service is required. Do not expose a workers.dev/preview fallback.

Pre-phase admin rollback version: `420a1334-2064-498c-9b8b-939559dfbf4c`. Re-verify narrow Access protection before any rollback. Preserve backend billing/community/audit tables. Both public checkout gates remain false and real Stripe test acceptance is pending credentials; do not label Phase 13 complete or begin Phase 14.
