# DrLoGiCo blog publishing

Activated and verified October 13, 2026 (America/Phoenix).

## Use the editor

Open https://admin.pigeonumbragroup.com/drlogico.html or choose **DrLoGiCo** in the PUG Workspaces menu. Sign in with the existing Central Admin owner account.

Choose **New post**, enter a title, short description, category, optional tags and plain-text body, then **Save draft**. The URL slug becomes fixed after the first save. Use **Open** to return to an existing post. **Save draft** preserves the current public version; **Publish** makes the current edits public; **Unpublish** removes the public post and retains its draft. Blank lines separate paragraphs. HTML is displayed as text. There are no image uploads, rich-text editing, scheduling or deletion controls.

## Accepted release

Source checkout: `/Users/rheinrick/Development/pug-drlogico-admin`, branch `codex/drlogico-blog-activation`, based on accepted PUG source `8723bddedd89860507ed3e4fd390b8f58f4e1b77`. This is the current combined console; older PUG and Baby-only checkouts must not be redeployed without integrating this change.

PUG version: `93b560a6-8e81-4e06-8bec-82fa12e30f4c`. Provider code equals the reviewed dry-run bundle, SHA-256 `846fd121be5ff873485a6d05551d85fb5b5896bb800edb89f6d078ab1884c322`. The DRLOGICO service targets `drlogico`. DATACENTER, BABY_BETA, BABY_STAGING and the existing Baby editorial secret binding were preserved and verified through provider readback. Only four assets changed: index.html and the three blog editor assets.

DrLoGiCo backend version `d643f377-5ec6-4807-9e6b-c06d9600bea9` and the existing dedicated blog D1 were reused. No database recreation, schema change, public-site code deployment or DataCenter/Baby content mutation was needed.

## Acceptance

33 current Admin tests and all frontend/Worker syntax checks passed using the npm lockfile dependencies, plus six DrLoGiCo tests and its build. The real local editor passed save/reload, publish, draft-edit isolation, update publishing, public rendering/filtering and unpublish. The current console bundles successfully.

The owner completed Access sign-in. The initial 404 was the missing pre-deployment editor; reloading the new version resolved it. Through that real owner session, the agent saved the explicitly approved **Blog connection test**, reloaded and reopened it, published it, saved changed text privately, confirmed that the live copy stayed unchanged, published the update and verified it in Chrome, then unpublished it. The homepage, blog index, category/tag listing and detail URL reflected publication; all removed it after unpublish. D1 readback confirms revision 5, unpublished status, and five audit actions: save, publish, save, publish, unpublish. The test draft remains available in the private editor.

Dashboard and Workspaces links reach the working editor. Existing DataCenter and Baby navigation remains available. Anonymous PUG dashboard/editor/API requests redirect to Access; direct anonymous DrLoGiCo admin API access returns 403. This is agent-driven live acceptance using the owner's session, not a claim that the owner manually authored a post.

Evidence: [acceptance](evidence/drlogico-20261013/acceptance.json), [provider readback](evidence/drlogico-20261013/provider.json), [Access review result](evidence/drlogico-20261013/guard-result.json), [public removal](evidence/drlogico-20261013/unpublished.json), [live editor](evidence/drlogico-20261013/editor-live.png).

## Access review and future deployments

Keep `scripts/deploy.mjs` and `scripts/access-policy.mjs` unchanged. The normal deployment path requires an environment-supplied Cloudflare credential with Access Read and Worker deployment permission.

The existing OAuth credential still returned zero Access applications and 403 for the known application, despite the current dashboard showing four applications. For this release only, a fresh authenticated dashboard review covered all application destinations, the single Central Admin owner Allow rule, application audience and organization domain. The unchanged `verifyAccess` validator passed these observed values against fresh live backend identity settings. The prior code hash and existing service/secret bindings were rechecked immediately before deployment. No policy, identity access, or permanent deployment-guard exception was added. Private review material stays outside the repository; the sanitized result is linked above. Do not reuse a historical review as a future guard pass.

## Rollback

The pre-release console version is `a6f2fe2b-bce8-4f7f-af30-de398934ea42`. A reviewed `wrangler rollback` to that version removes the blog UI/connection while preserving the earlier Baby/DataCenter console. Verify provider bindings, Access denial and owner navigation afterwards. Do not restore or delete blog D1 or audit history for a console rollback. Republishing posts is a separate deliberate editorial action.
