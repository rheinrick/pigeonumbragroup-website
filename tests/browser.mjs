import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, mkdirSync } from 'node:fs'
const fixture = {
  reviewer: 'owner@example.test',
  role: 'owner',
  revision: 0,
  release_id: null,
  capabilities: {
    stage: false,
    validate: false,
    publish: false,
    rollback: false,
    decision: true,
    retryContact: false,
  },
  system: {
    deployments: {
      observedAt: '2026-09-09',
      dread: { mode: 'build-pinned review beta', version: 'fixture-dread' },
      main: { mode: 'landing only', version: 'fixture-main' },
    },
    datasetTimestamp: '2026-09-08',
    catalogSnapshot: 'fixture',
    facilityCount: 1,
    siteCount: 1,
    contextualLayerCount: 43,
    publicationStatus:
      'R2 unavailable. Managed publication disabled; public review beta remains build-pinned.',
  },
  facilities: [
    {
      id: 'fixture-1',
      name: 'Reviewed facility',
      slug: null,
      confidence: null,
      lastVerified: '2026-09-08',
      operator: 'Example operator',
      status: 'unknown',
      location: {
        coordinates: [-112, 33],
        accuracy: 'address_approximate',
        uncertaintyM: null,
      },
      address: null,
      city: 'Phoenix',
      countyGeoid: '04013',
      stateFips: '04',
      sourceIds: ['source-1'],
      notes: '<script>alert("unsafe")</script>',
    },
  ],
  sources: [
    {
      id: 'source-1',
      organization: 'Primary source',
      url: 'https://example.test/source',
      publishedAt: null,
    },
  ],
  layers: [
    { id: 'datacenters', name: 'Datacenters' },
    { id: 'poverty', name: 'Poverty' },
  ],
  decisions: [],
  releases: [],
  contacts: [],
  audit: [],
}
const server = createServer((req, res) => {
  const files = {
    '/': 'index.html',
    '/admin.js': 'admin.js',
    '/admin.css': 'admin.css',
  }
  const file = files[req.url]
  if (!file) {
    res.writeHead(404)
    res.end()
    return
  }
  res.setHeader(
    'Content-Type',
    file.endsWith('.js')
      ? 'text/javascript'
      : file.endsWith('.css')
        ? 'text/css'
        : 'text/html',
  )
  res.end(readFileSync(`public/${file}`))
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
})
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/admin/state*', (route) =>
    route.fulfill({ json: fixture }),
  )
  let saved
  await page.route('**/api/admin/decision', (route) => {
    saved = route.request().postDataJSON()
    return route.fulfill({ json: { saved: true } })
  })
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.getByText('Open DataCenter administration →').waitFor()
  for (const name of [
    'CliniType',
    'Newborn Horoscope',
    'HIETool',
    'Heinrick',
    'Pigeon Umbra Group',
  ]) {
    await page
      .getByRole('navigation', { name: 'Products' })
      .getByRole('link', { name, exact: true })
      .click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    assert.equal(
      await page
        .getByText('Administration module not yet activated.')
        .isVisible(),
      true,
    )
    assert.equal(await page.locator('#content').isVisible(), false)
  }
  await page
    .getByRole('navigation', { name: 'Products' })
    .getByRole('link', { name: 'DataCenter', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Activate release', exact: true }),
  ).toBeDisabled()
  assert.equal(
    await page
      .getByRole('button', { name: 'Stage release', exact: true })
      .isDisabled(),
    true,
  )
  assert.ok(
    (await page.locator('#facility-detail').textContent()).includes(
      'Not recorded',
    ),
  )
  assert.ok(
    (await page.locator('#facility-detail').textContent()).includes('<script>'),
  )
  await page.locator('#reason').fill('Reviewed the current source policy.')
  await page.getByRole('button', { name: 'Save decision', exact: true }).click()
  await page.getByText('Saved. The workspace has been refreshed.').waitFor()
  assert.equal(saved.expectedRevision, 0)
  assert.equal(saved.layerId, 'poverty')
  await expect(
    page.getByRole('button', { name: 'Activate release', exact: true }),
  ).toBeDisabled()
  mkdirSync('test-results', { recursive: true })
  await page.screenshot({
    path: 'test-results/admin-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  await page.screenshot({
    path: 'test-results/admin-mobile.png',
    fullPage: true,
  })
  assert.deepEqual(errors, [])
  console.log(
    'PASS: seven-module navigation, placeholders, capability gates after save, revision payload, missing provenance, escaped content, desktop/mobile layout.',
  )
} finally {
  await browser.close()
  server.close()
}
