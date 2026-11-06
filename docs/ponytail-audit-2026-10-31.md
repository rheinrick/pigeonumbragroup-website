# Ponytail audit — October 31, 2026

What this repo does: This is the protected Pigeon Umbra Group administration console. Its Worker verifies identity and delegates product operations to the owning backends. The audit assumed a small group of concurrent administrators, including slow connections, repeated clicks, revision conflicts and partial outages.

The user requested an audit and updates across Development. These changes are local and build on the existing integration branch; they do not publish content or change live service settings.

**Must fix — fixed locally**

1. **Policy panels lost reliable save/recovery state** (`public/panel-actions.js`, `public/intelligence.js`, `public/dread.js`, `public/billing.js`, `public/operations.js`).
   - **What this is:** These panels submit a change and then fetch the current backend state.
   - **Problem:** A confirmed write followed by a failed read could appear wholly successful or fail without a usable recovery path. Repeated submissions could run while the first request was unresolved.
   - **Fix:** One shared lifecycle preserves drafts on failed reads, distinguishes a confirmed save from an unknown outcome, serializes writes, and makes retry a read only. It preserves controls that were already disabled by product policy and builds replacement content before discarding the existing form.
   - **If we skip it:** An administrator can lose their draft or repeat a change while unsure whether the first request committed.

2. **Refreshing the main workspace discarded drafts in other panels** (`public/admin.js:15`).
   - **What this is:** A core decision save refreshes the console's main state.
   - **Problem:** That refresh initialized independent panels again, replacing an unsaved social draft with the saved backend version.
   - **Fix:** Initialize those panels once per identity. A changed reviewer or role triggers a full reload so old permission closures are discarded.
   - **If we skip it:** An unrelated successful save can erase work in another section.

3. **Inventory and participation hid failed refreshes** (`public/inventory.js:254`, `public/inventory-discovery.js:209`, `public/inventory-discovery.js:235`, `public/participation.js:148`).
   - **What this is:** Reviews, prepared discovery imports and participation actions refresh their lists after saving.
   - **Problem:** Their read helpers caught errors, then callers overwrote those errors with an ordinary success message. Inventory also replaced its current state with the failed response body.
   - **Fix:** Read helpers report whether they succeeded. A confirmed write followed by a failed read now explicitly asks the user to refresh; failed inventory responses preserve the prior revision. No automatic write retry is added.
   - **If we skip it:** A stale list looks current after a successful mutation. These cases were reproduced with synthetic failures before the fix.

**Verification**

- `npm run check`: syntax checks and all 34 unit tests passed.
- All six browser suites passed: core console, Dread, Baby Horoscope, discovery, social and the new panel recovery suite. The changed console/discovery/recovery suites were rerun after the final status fixes.
- Recovery tests cover duplicate submission, initial outage, confirmed write/read failure, conflict, validation rejection, network/500/HTML write responses, malformed reads, retained inputs, policy-disabled controls, refreshed revisions and identity changes.
- The sibling DrLoGiCo synthetic browser suite passed against this checkout's editor, including save, publish/unpublish, filtering and XSS handling. It used in-memory test content only.
- Mobile recovery screenshots inspected. Deployment bundle dry run passed; dependency audit reports zero advisories. `git diff --check` passed.
- The verification workflow includes the sixth browser suite. No dependency was added; application code decreased by nine lines including the shared helper.

Verdict: The reproduced save/recovery defects are fixed and verified locally. Existing backend authorization, revision checks, publication controls and disabled commerce gates remain in place.

Lean: −9 application lines, 0 added dependencies. Four copies of the same request/read/write lifecycle now share one implementation.

Not checked: production Access/provider state, live payments or messages, backend load capacity, real publication, every combination of editor actions, and native assistive technology. The remaining list/editor workflows retain their own write guards; this is not a claim that every console workflow uses the new shared lifecycle. Existing untracked `output/` was preserved.
