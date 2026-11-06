import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync } from 'node:fs'
let role = 'owner', conflict = false, unavailable = false, failAfterSave = false, abortWrite = false, holdWrite
const actions = [], errors = []
const fixture = {
  brand: {name:'DataCenterDread',origin:'https://datacenterdread.org'},
  draftsEnabled: true, publishingEnabled: true, configured: true, pageId: '12345',
  channel: { paused: true, revision: 2, initialized: true, pageName: 'Datacenterdread', verified: true, lastSentAt: null },
  posts: [{ id: 'fixture', kind: 'catalog', status: 'draft', current: true, revision: 0, created_at: Date.now(), attempts: 0,
    message: 'DataCenterDread map update: 2 reviewed facilities.\n\nAdded to the map: Synthetic facility — proposed.\n\nNew to the map does not necessarily mean newly opened.',
    link: 'https://datacenterdread.org/', sources: [] }],
}
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  if (path === '/') { response.setHeader('Content-Type', 'text/html'); return response.end(`<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/admin.css"><main><section id="social" class="workspace-panel is-current"></section></main><script type="module">import {setupSocial} from '/social.js';setupSocial({role:${JSON.stringify(role)}})</script>`) }
  if (['/social.js', '/admin.css'].includes(path)) { response.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'text/javascript'); return response.end(readFileSync('public' + path)) }
  response.statusCode = 404; response.end('Not found')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome', executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/admin/social/**', async route => {
    if (route.request().method() === 'GET') {
      if (unavailable) return route.fulfill({ status: 503, contentType: 'text/plain', body: 'Synthetic backend unavailable' })
      return route.fulfill({ json: new URL(route.request().url()).searchParams.get('channel') === 'data-facebook' ? {...fixture,brand:{name:'DataCenterData',origin:'https://datacenterdata.net'},posts:[]} : fixture })
    }
    const payload = route.request().postDataJSON(); actions.push(payload)
    if (holdWrite) await holdWrite
    if (abortWrite) return route.abort('failed')
    if (conflict) return route.fulfill({ status: 409, json: { error: 'Draft changed. Reload before saving.' } })
    if (payload.action === 'edit') Object.assign(fixture.posts[0], { message: payload.message, link: payload.link, status: 'draft', revision: fixture.posts[0].revision + 1 })
    if (payload.action === 'approve') Object.assign(fixture.posts[0], { status: 'approved', revision: fixture.posts[0].revision + 1 })
    if (failAfterSave) unavailable = true
    return route.fulfill({ json: { ok: true } })
  })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const panel=page.locator('#social > section').filter({has:page.getByRole('heading',{name:'DataCenterDread Facebook',exact:true})})
  await expect(page.getByRole('heading', { name: 'DataCenterData Facebook',exact:true })).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'DataCenterDread Facebook',exact:true })).toBeVisible()
  await panel.getByLabel('Reason for this action').fill('Reviewed synthetic map update.')
  await panel.getByLabel('Post text', { exact: true }).fill('New reviewed facility <script>unsafe()</script> added to the map.')
  await expect(panel.getByRole('button', { name: 'Approve saved draft' })).toBeDisabled()
  // A failed read must leave the visible draft and reason available for recovery.
  unavailable = true
  await panel.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Retry loading' })).toBeVisible()
  await expect(panel.getByLabel('Post text', { exact: true })).toHaveValue('New reviewed facility <script>unsafe()</script> added to the map.')
  await expect(panel.getByLabel('Reason for this action')).toHaveValue('Reviewed synthetic map update.')
  await expect(panel.getByRole('alert')).toContainText('unavailable')
  unavailable = false
  // Save the retained edits rather than discarding them through a reload.
  let finishWrite
  holdWrite = new Promise(resolve => { finishWrite = resolve })
  await panel.getByRole('button', { name: 'Save changes (requires approval)' }).click()
  await expect.poll(() => actions.length).toBe(1)
  await expect(panel.getByLabel('Post text', { exact: true })).toBeDisabled()
  await panel.getByRole('button', { name: 'Save changes (requires approval)' }).evaluate(button => button.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  const dataPanel = page.locator('#social > section').last()
  await expect(dataPanel.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
  finishWrite(); holdWrite = null
  await expect(panel.getByRole('button', { name: 'Approve saved draft' })).toBeEnabled()
  assert.equal(actions.length, 1)
  assert.equal(actions.at(-1).action, 'edit'); assert.equal(actions.at(-1).expectedRevision, 0)
  await expect(page.locator('#social script')).toHaveCount(0)
  await panel.getByLabel('Reason for this action').fill('Reviewed saved synthetic draft.')
  conflict = true
  await panel.getByRole('button', { name: 'Approve saved draft' }).click()
  await expect(panel.getByRole('alert')).toContainText('Draft changed')
  conflict = false
  await panel.getByRole('button', { name: 'Approve saved draft' }).click()
  await expect(page.getByRole('heading', { name: 'Map update · approved' })).toBeVisible()
  assert.equal(actions.at(-1).expectedRevision, 1)
  // The write succeeds, but its following read fails. Do not allow a duplicate write.
  await panel.getByLabel('Reason for this action').fill('Reviewed synthetic delivery recovery.')
  await panel.getByLabel('Post text', { exact: true }).fill('Saved synthetic announcement after a temporary read failure.')
  failAfterSave = true
  const before = actions.length
  await panel.getByRole('button', { name: 'Save changes (requires approval)' }).click()
  await expect(panel.getByRole('alert')).toContainText('saved')
  await expect(panel.getByRole('button', { name: 'Save changes (requires approval)' })).toBeDisabled()
  await expect(panel.getByLabel('Post text', { exact: true })).toHaveValue('Saved synthetic announcement after a temporary read failure.')
  assert.equal(actions.length, before + 1)
  mkdirSync('test-results/social', { recursive: true })
  await page.screenshot({ path: 'test-results/social/saved-refresh-failure.png', fullPage: true })
  unavailable = false; failAfterSave = false
  await panel.getByRole('button', { name: 'Retry loading' }).click()
  await expect(panel.getByRole('button', { name: 'Approve saved draft' })).toBeEnabled()
  assert.equal(actions.length, before + 1)
  abortWrite = true
  await panel.getByLabel('Reason for this action').fill('Reviewed synthetic ambiguous write.')
  await panel.getByRole('button', { name: 'Save changes (requires approval)' }).click()
  await expect(panel.getByRole('alert')).toContainText('Could not confirm whether the action was saved')
  await expect(panel.getByRole('button', { name: 'Save changes (requires approval)' })).toBeDisabled()
  abortWrite = false
  const uncertainCount = actions.length
  await panel.getByRole('button', { name: 'Retry loading' }).click()
  await expect(panel.getByRole('button', { name: 'Approve saved draft' })).toBeEnabled()
  assert.equal(actions.length, uncertainCount)
  await page.screenshot({ path: 'test-results/social/desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/social/mobile.png', fullPage: false })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  role = 'readonly'; await page.reload()
  await expect(page.locator('#social')).toBeHidden()
  assert.deepEqual(errors, [])
  console.log('PASS: both Facebook channels, retained drafts on failed reads, independent controls, duplicate-write guard, acknowledged/uncertain write recovery without resubmission, edit invalidation, approval, conflict, XSS, mobile and roles.')
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
