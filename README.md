# Pigeon Umbra Group — central admin console

This repository now contains the private console intended for `admin.pigeonumbragroup.com`. It does not replace or publish an apex-domain PUG marketing website.

## Implemented

- PUG workspace navigation with a DataCenterData workspace.
- Explicit Main/Dread/Good/ALL layer decisions, approval table, review reasons, publication/rollback controls and audit history.
- Private contact inbox with notification-delivery state and retry controls.
- Worker service binding to `datacenterdata`, with same-origin mutations and independent identity verification performed by that backend. Static console assets are not served before a verified administrator identity is returned. Merely supplying a JWT header is insufficient.
- Private, no-store responses, restrictive CSP, disabled workers.dev/preview URLs.

## Local checks

Use Node 24.19+ and npm. `npm ci` installs pinned dependencies; `npm run check` checks browser/server syntax and access-isolation tests. `npm exec wrangler deploy -- --dry-run` checks the deployment bundle without publishing. The API needs the matching DataCenterData Phase 8 backend; the old placeholder Worker cannot serve it.

## Required live configuration

The target administrator is `sudopug1337@datacenterdata.net`. Configure a narrowly scoped Cloudflare Access application for the central admin hostname, and use its team domain and application audience in the DataCenterData backend. Do not reuse an unrelated application's audience or broaden its policy. The backend independently verifies the signed JWT and explicit email allowlist.

Deploy the DataCenterData publication/contact backend with its dedicated D1 and R2 resources, both SQL migrations, and the configured Access audience. Email sending stays disabled until its destination/domain are verified and a real notification is observed. Both projects must remain in the same Cloudflare account for the service binding. The central proxy preserves the original request URL/Origin so the backend can enforce same-origin writes. No customer sign-in or Stripe integration is included; these are deferred beyond beta.

The `admin.pigeonumbragroup.com` custom-domain route is recorded, but no DNS change, Access setup, resource provisioning or deployment has occurred. `npm run deploy` intentionally stops with these prerequisites; replace that gate only after live configuration is ready and approved. Verify authorized/unauthorized sign-in, contact delivery, mobile keyboard use and shared-backend mutation history in staging before release. Do not treat local checks as production acceptance.
