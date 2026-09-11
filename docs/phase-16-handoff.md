# Phase 16 central admin handoff

The central admin console now includes a Facility Deep Dives overview and searchable facility inspection. It displays report availability, release/source metadata, generation failures and performance, and aggregate purchase/entitlement counts. Regeneration remains an offline preparation, review and deployment workflow.

Branch: `codex/phase-16-deep-dive`. Baseline: `0b0a31a`. Implementation: `0fc6a88`; phase label: `073eeed`. This handoff is included in the final documentation commit. The paired atlas/control implementation uses the same branch name in the private DataCenter repository.

## Files

- `public/deep-dives.js`: safe DOM rendering, search and inspection.
- `public/admin.js`, `public/index.html`: section integration and Phase 16 label.
- `worker/index.js`: forwards the protected `/api/admin/deep-dives` route through the existing private service binding.
- `tests/browser.mjs`, `package.json`: added browser assertions and validation integration.

No database schema or migration change. This public repository contains no report numeric payload, provider acceptance ledger, browser session, or secret.

## Access and validation

The existing Cloudflare Access application protects the console. The control backend independently verifies the Access identity and permitted inspection role. Existing moderation, inventory, publication and billing workflows remain intact. Rendering uses DOM text nodes, including untrusted facility strings.

`npm run check` and the extended browser checks passed, including report search/inspection, safe rendering, role visibility and existing admin workflows. A genuine owner Access login and live report overview/inspection passed after deployment. The Phase 16 label was checked on the deployed console.

The final private project handoff records deployment IDs, provider TEST purchase/refund results, exact rollback versions and effective commerce gates. Public real-money checkout remains disabled. Do not enable it from this UI milestone or start Phase 17 without its work order.

Rollback uses the previously recorded admin Worker version before rolling back the paired control backend. Do not restore D1 or discard payment/audit history for a UI rollback. Verify Access and existing admin routes after rollback.
