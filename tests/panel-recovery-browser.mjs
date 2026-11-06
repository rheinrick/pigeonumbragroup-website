import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, mkdirSync } from 'node:fs'

const cases = [
  { id: 'intelligence', setup: 'setupIntelligence', label: 'infrastructure', action: 'domain', button: 'Save domain', field: 'Description', reason: 'Reason',
    state: { canWrite: true, sources: [], versions: [], runs: [], projects: [], domains: [{ id: 'grid', name: 'Grid', description: 'Original', ordering: 1, enabled: true, revision: 4 }] } },
  { id: 'dread', setup: 'setupDread', label: 'Dread', action: 'domain', button: 'Save Dread domain', field: 'Description', reason: 'Review reason', expand: 'Inspect Dread domain',
    state: { canWrite: true, gates: {}, layers: [], versions: [], runs: [], domains: [{ id: 'grid', name: 'Grid', description: 'Original', ordering: 1, enabled: true, revision: 4 }] } },
  { id: 'billing', setup: 'setupBilling', label: 'billing', action: 'reconcile', button: 'Reconcile', field: 'Stripe object ID', reason: 'Reconciliation reason',
    state: { mode: 'test', gates: {}, customersCount: 0, purchasesCount: 0, customers: [], subscriptions: [], purchases: [], webhooks: [], canReconcile: true } },
  { id: 'operations', setup: 'setupOperations', label: 'operations', action: 'control', button: 'Disable reports', reason: 'reports: configured behavior — reason', expand: 'Manage emergency controls',
    state: { mode: 'test', gates: {}, revenue: 'Synthetic test account', analytics: 'Synthetic observations only', counts: {}, product: {facilities: 1, organizations: 1, reports: 0, inventory: 'Synthetic inventory'}, checks: [], controlNames: ['reports'], controls: [], metrics: [] } },
]
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost')
  const entry = [...cases, {id:'participation',setup:'setupParticipation'}].find(item => item.id === url.searchParams.get('module'))
  if (url.pathname === '/' && entry) {
    response.setHeader('Content-Type', 'text/html')
    return response.end(`<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/admin.css"><main><section id="${entry.id}" class="workspace-panel is-current"></section></main><script type="module">import {${entry.setup}} from '/${entry.id}.js';${entry.setup}({role:'owner'})</script>`)
  }
  if (['/admin.css', '/records.js', '/panel-actions.js', '/participation.js', ...cases.map(item => '/' + item.id + '.js')].includes(url.pathname)) {
    response.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript')
    return response.end(readFileSync('public' + url.pathname))
  }
  response.writeHead(404); response.end()
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome', executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
try {
  for (const item of cases) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
    const errors = [], writes = [], state = structuredClone(item.state)
    let failRead = true, writeStatus = 200, holdWrite, malformed = false, abort = false, badState = false
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/admin/' + item.id + '/**', async route => {
      if (route.request().method() === 'GET') return route.fulfill(failRead ? { status: 503, body: 'Synthetic outage' } : { json: badState ? null : state })
      writes.push({ path: new URL(route.request().url()).pathname, body: route.request().postDataJSON() })
      if (holdWrite) await holdWrite
      if (abort) return route.abort()
      if (malformed) return route.fulfill({ status: 200, body: '<html>Sign in</html>' })
      if (writeStatus !== 200) return route.fulfill({ status: writeStatus, json: { error: 'Synthetic rejection ' + writeStatus } })
      if (state.domains) state.domains[0].revision++
      return route.fulfill({ json: { saved: true } })
    })
    await page.goto(`http://127.0.0.1:${server.address().port}/?module=${item.id}`)
    const panel = page.locator('#' + item.id), notice = panel.getByRole('status')
    const retry = () => panel.getByRole('button', { name: 'Retry ' + item.label, exact: true })
    await expect(retry()).toBeEnabled()
    failRead = false
    await retry().click()
    await expect(notice).toContainText('refreshed')
    const edit = async () => {
      if (item.id === 'operations') await panel.locator('summary').filter({ hasText: item.expand }).click()
      else if (item.expand) await panel.getByRole('button', { name: item.expand, exact: true }).click()
      if (item.field) await panel.getByLabel(item.field, { exact: true }).fill('Retained synthetic draft')
      await panel.getByLabel(item.reason, { exact: true }).fill('Reviewed synthetic policy change.')
      return panel.getByRole('button', { name: item.button, exact: true })
    }
    let button = await edit()
    let releaseWrite
    holdWrite = new Promise(resolve => { releaseWrite = resolve })
    failRead = true
    await button.click()
    await expect.poll(() => writes.length).toBe(1)
    await expect(button).toBeDisabled()
    await button.evaluate(button => {
      const form = button.closest('form')
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    releaseWrite(); holdWrite = null
    await expect(notice).toContainText('Saved, but')
    assert.equal(writes.length, 1)
    assert.equal(writes[0].path, `/api/admin/${item.id}/${item.action}`)
    if (state.domains) assert.equal(writes[0].body.expectedRevision, 4)
    await expect(panel.getByLabel(item.reason, { exact: true })).toHaveValue('Reviewed synthetic policy change.')
    if (item.field) await expect(panel.getByLabel(item.field, { exact: true })).toHaveValue('Retained synthetic draft')
    await retry().click()
    await expect(notice).toContainText('Saved, but')
    await expect(button).toBeDisabled()
    failRead = false
    await retry().click()
    await expect(notice).toContainText('refreshed')
    assert.equal(writes.length, 1)
    button = await edit()
    await button.click()
    await expect(notice).toHaveText('Saved. Status refreshed.')
    if (state.domains) assert.equal(writes.at(-1).body.expectedRevision, 5)

    // A rejected request keeps its draft; a conflict requires a fresh revision.
    button = await edit()
    writeStatus = 400
    await button.click()
    await expect(notice).toContainText('Synthetic rejection 400')
    await expect(button).toBeEnabled()
    await expect(panel.getByLabel(item.reason, { exact: true })).toHaveValue('Reviewed synthetic policy change.')
    writeStatus = 409
    await button.click()
    await expect(notice).toContainText('Synthetic rejection 409')
    await expect(button).toBeDisabled()
    const beforeRetry = writes.length
    await retry().click()
    await expect(notice).toContainText('refreshed')
    assert.equal(writes.length, beforeRetry)

    // Lost responses, server failures and successful HTML responses are all uncertain.
    for (const failure of ['server', 'network', 'html']) {
      button = await edit()
      writeStatus = failure === 'server' ? 503 : 200
      abort = failure === 'network'; malformed = failure === 'html'
      await button.click()
      await expect(notice).toContainText('Could not confirm whether')
      await expect(button).toBeDisabled()
      const count = writes.length
      await retry().click()
      await expect(notice).toContainText('refreshed')
      assert.equal(writes.length, count)
      abort = false; malformed = false
    }
    // Invalid read results never destroy the visible draft.
    button = await edit(); badState = true
    await panel.getByRole('button', { name: 'Refresh ' + item.label, exact: true }).click()
    await expect(retry()).toBeEnabled()
    await expect(panel.getByLabel(item.reason, { exact: true })).toHaveValue('Reviewed synthetic policy change.')
    await expect(button).toBeDisabled()
    mkdirSync('test-results', { recursive: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.screenshot({ path: `test-results/${item.id}-recovery-mobile.png`, fullPage: true })
    assert.deepEqual(errors, [])
    await page.close()
    console.log(`PASS ${item.id}: retained drafts, initial retry, duplicate guard, confirmed/uncertain saves, read-only recovery, conflicts and current revisions.`)
  }
  const page = await browser.newPage()
  let failRead = false, writes = 0
  await page.route('**/api/admin/participation/**', route => {
    if (route.request().method() === 'POST') { writes++; return route.fulfill({json:{saved:true}}) }
    return route.fulfill(failRead ? {status:503,json:{error:'Synthetic read outage'}} : {json:{revision:1,organizations:[],submissions:[],staging:[],verifications:[],notifications:[{id:'synthetic',status:'failed',attempts:1}]}})
  })
  await page.goto(`http://127.0.0.1:${server.address().port}/?module=participation`)
  const participation = page.locator('#participation')
  await expect(participation.getByRole('status')).toContainText('Loaded 0 requests')
  await participation.locator('summary').filter({hasText:'Status notification delivery'}).click()
  failRead = true
  await participation.getByRole('button',{name:'Retry failed notification'}).click()
  await expect(participation.getByRole('status')).toContainText('Saved, but')
  failRead = false
  await participation.getByRole('button',{name:'Refresh participation'}).click()
  await expect(participation.getByRole('status')).toContainText('Loaded 0 requests')
  assert.equal(writes,1)
  await page.close()
  console.log('PASS participation: confirmed write/read outage stays visible; refresh does not resubmit.')
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
