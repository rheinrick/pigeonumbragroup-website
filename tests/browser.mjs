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
    {
      id: 'poverty',
      name: 'Poverty',
      accessTier: 'free',
      comparisonEligible: true,
      facilityAnalysisEligible: true,
      release: 'r1',
      source: 'US Census Bureau ACS',
      updated: '2026-09-08',
    },
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
    '/community.js': 'community.js',
    '/records.js': 'records.js',
    '/users.js': 'users.js',
    '/billing.js': 'billing.js',
    '/inventory.js': 'inventory.js',
    '/deep-dives.js': 'deep-dives.js',
    '/participation.js':'participation.js',
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
  channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
})
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/admin/billing/state', (route) =>
    route.fulfill({
      json: {
        mode: 'test',
        gates: { pro: false, deepDive: false },
        canReconcile: true,
        customers: [],
        subscriptions: [],
        purchases: [],
        webhooks: [],
        customersCount: 0,
        purchasesCount: 0,
        overview: {},
        product: {
          entitledUsers: 1,
          freeLayers: 43,
          proLayers: 0,
          comparisonLayers: 43,
          analyticsLayers: 5,
          release: 'r1',
        },
      },
    }),
  )
  await page.route('**/api/admin/state*', (route) =>
    route.fulfill({ json: fixture }),
  )
  await page.route('**/api/admin/deep-dives', (route) =>
    route.fulfill({ json: {
      release: 'deep-dive-fixture', generatedAt: '2026-09-11',
      facilityRelease: 'inventory-fixture', contextReleases: ['acs-fixture'],
      reports: 1, registry: [{ deepDiveEligible: true }], failures: [],
      purchases: [{status: 'paid', count: 1}], entitlements: {count: 1},
      generationWorkflow: 'Offline validated preparation.',
      facilities: [{facilityId: 'fixture-1', name: '<script>unsafe()</script> Deep Dive fixture',
        operator: 'Example', available: true, status: 'deep_dive_limited',
        reasons: ['approximate_anchor'], categories: ['Population'],
        contextCategories: ['Electricity'], missingMeasures: ['Median income'],
        validationStatus: 'passed', generationStatus: 'generated'}],
    }}),
  )
  const inventoryRow = {
    id: 'candidate-fixture',
    fingerprint: 'current-fingerprint',
    sourceUrl: 'https://example.test/source',
    sourceOriginal: { name: '<script>unsafe()</script>' },
    normalized: {
      name: 'Inventory fixture',
      address: '10 Example Street',
      confidence: 'low',
    },
    validationIssues: [],
    duplicates: [],
    review: null,
  }
  const inventoryActions = []
  const inventory = {
    revision: 0,
    release: 'inventory-fixture',
    coverage: {
      published: 1,
      candidates: 1,
      note: 'Uneven coverage',
      states: {},
      markets: {},
      operators: {},
    },
    registry: [
      { name: 'Permitted source', rightsStatus: 'approved_with_conditions' },
    ],
    counts: { needs_review: 1, defer: 0, reject: 0 },
    total: 1,
    pageSize: 30,
    rows: [inventoryRow],
  }
  await page.route('**/api/admin/inventory**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('inventory-review')) {
      const value = route.request().postDataJSON()
      inventoryActions.push(value)
      inventoryRow.review = value
      inventory.revision++
      return route.fulfill({
        json: {
          saved: true,
          note: 'Review recorded in audit. Public inventory remains unchanged.',
        },
      })
    }
    if (path.endsWith('inventory-export'))
      return route.fulfill({
        json: { schemaVersion: 1, reviews: [inventoryRow.review] },
      })
    return route.fulfill({
      json: { ...inventory, canReview: fixture.role !== 'readonly' },
    })
  })
  const comment = {
    id: 'comment-fixture',
    revision: 1,
    facility_id: 'fixture-1',
    user_id: 'user-fixture',
    author: 'Community member',
    body: '<script>alert(1)</script> A review comment',
    status: 'visible',
    created_at: '2026-09-09T12:00:00Z',
  }
  const report = {
    id: 'report-fixture',
    revision: 1,
    comment_id: comment.id,
    comment_revision: 1,
    facility_id: comment.facility_id,
    author: comment.author,
    author_id: comment.user_id,
    reporter: 'Reporter',
    reporter_user_id: 'reporter-fixture',
    body: comment.body,
    status: 'open',
    reason: 'Off-topic',
    details: 'Review details',
    created_at: comment.created_at,
  }
  const actions = []
  await page.route('**/api/admin/community/**', (route) => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1)
    if (route.request().method() === 'POST') {
      actions.push({ path, ...route.request().postDataJSON() })
      return route.fulfill({ json: { saved: true } })
    }
    const items =
      path === 'reports'
        ? [report]
        : path === 'users'
          ? [
              {
                id: comment.user_id,
                name: 'Community member',
                status: 'active',
                emailVerified: 1,
                email: 'member@example.test',
                last_login_at: null,
                comment_count: 1,
                createdAt: Date.now(),
              },
            ]
          : [comment]
    return route.fulfill({
      json: { items, next: null, total: items.length, canViewEmails: ['owner', 'admin'].includes(fixture.role), canModerate: fixture.role === 'owner' },
    })
  })
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
  const section = (name) => page.locator('#section-jump').selectOption(`#datacenter/${name}`)
  await section('deep-dives')
  await expect(page.locator('#deep-dives')).toContainText('deep-dive-fixture')
  await expect(page.locator('#deep-dives')).toContainText('1 active entitlements')
  await expect(page.locator('#deep-dives')).toContainText('<script>unsafe()</script>')
  await expect(page.locator('#deep-dives script')).toHaveCount(0)
  await page.getByLabel('Find facility').fill('does not exist')
  await expect(page.locator('#deep-dives summary')).toHaveCount(1)
  await page.getByLabel('Find facility').fill('Deep Dive fixture')
  await expect(page.locator('#deep-dives summary')).toHaveCount(2)
  await section('billing')
  await expect(page.locator('#billing')).toContainText(
    'TEST · Pro checkout disabled · Deep Dive checkout disabled',
  )
  await expect(
    page
      .locator('#billing')
      .getByRole('button', { name: 'Reconcile', exact: true }),
  ).toBeVisible()
  await section('publication')
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
  await section('layers')
  await page.locator('#reason').fill('Reviewed the current source policy.')
  await page.getByRole('button', { name: 'Save decision', exact: true }).click()
  await page.getByText('Saved. The workspace has been refreshed.').waitFor()
  assert.equal(saved.expectedRevision, 0)
  assert.equal(saved.layerId, 'poverty')
  await expect(
    page.getByRole('button', { name: 'Activate release', exact: true }),
  ).toBeDisabled()
  await section('community')
  const community = page.locator('#community')
  await expect(
    community.getByRole('heading', { name: 'Community', exact: true }),
  ).toBeVisible()
  await expect(community.locator('script')).toHaveCount(0)
  await expect(community.locator('#community-results')).toContainText(
    '<script>alert(1)</script>',
  )
  await community.getByRole('button', { name: 'Review comment', exact: true }).click()
  await community.getByRole('button', { name: 'Inspect thread' }).click()
  await expect(community.locator('#thread-context')).toContainText(
    'Thread context',
  )
  await community
    .getByLabel('Moderation reason')
    .fill('Reviewed browser acceptance comment')
  await community.getByRole('button', { name: 'Apply moderation' }).click()
  await expect(community.locator('#community-notice')).toContainText(
    'audit log',
  )
  assert.equal(actions.at(-1).path, 'comment')
  assert.equal(actions.at(-1).status, 'hidden')
  assert.equal(actions.at(-1).revision, 1)
  await page.locator('#community-kind').selectOption('reports')
  await community.getByRole('button', { name: 'Review report', exact: true }).click()
  await expect(community.locator('#community-results')).toContainText(
    'Review details',
  )
  const reportForm = community.locator('form').filter({
    has: page.getByRole('option', { name: 'Dismiss report', exact: true }),
  })
  await reportForm
    .getByLabel('Moderation reason')
    .fill('Reviewed report details')
  await reportForm.getByRole('button', { name: 'Apply moderation' }).click()
  await expect.poll(() => actions.at(-1)?.path).toBe('report')
  await page.locator('#community-kind').selectOption('users')
  await community.getByRole('button', { name: 'Review account', exact: true }).click()
  await expect(
    community.getByRole('button', { name: 'View comment history' }),
  ).toBeVisible()
  await community
    .getByLabel('Action', { exact: true })
    .selectOption('suspended')
  await community.getByLabel('Moderation reason').fill('Reviewed user behavior')
  await community.getByRole('button', { name: 'Apply moderation' }).click()
  await expect.poll(() => actions.at(-1)?.path).toBe('user')
  await community.getByRole('button', { name: 'Review account', exact: true }).click()
  await community.getByRole('button', { name: 'View comment history' }).click()
  await expect(page.locator('#community-user')).toHaveValue('user-fixture')
  await section('inventory')
  const inv = page.locator('#inventory')
  await expect(inv).toContainText('1 discovery candidates')
  await inv
    .getByText('Inventory fixture · needs_review · low', { exact: true })
    .click()
  await inv.getByText('Original source fields', { exact: true }).click()
  await expect(inv).toContainText('<script>unsafe()</script>')
  await expect(inv.locator('script')).toHaveCount(0)
  await inv
    .getByLabel('Review reason', { exact: true })
    .fill('Keep deferred until an operator source confirms this identity.')
  await inv.getByRole('button', { name: 'Record review', exact: true }).click()
  await expect(inv.getByRole('status')).toContainText(
    'Public inventory remains unchanged',
  )
  assert.equal(inventoryActions[0].expectedRevision, 0)
  assert.equal(inventoryActions[0].fingerprint, 'current-fingerprint')
  assert.equal(inventoryActions[0].decision, 'defer')
  await page.reload()
  await inv
    .getByText('Inventory fixture · defer · low', { exact: true })
    .click()
  await expect(inv.getByLabel('Review reason', { exact: true })).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await inv.getByRole('button', { name: 'Export review ledger' }).click()
  const download = await downloaded
  assert.equal(download.suggestedFilename(), 'inventory-review-export.json')
  const ledger = JSON.parse(readFileSync(await download.path(), 'utf8'))
  assert.equal(ledger.reviews[0].decision, 'defer')
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
  await section('community')
  await page
    .locator('#community')
    .screenshot({ path: 'test-results/admin-community-mobile.png' })
  await page.screenshot({
    path: 'test-results/admin-mobile.png',
    fullPage: true,
  })
  fixture.role = 'readonly'
  await page.reload()
  await section('deep-dives')
  await expect(page.locator('#deep-dives')).toBeVisible()
  await section('community')
  await expect(page.locator('#community-results')).toContainText(
    'A review comment',
  )
  await expect(
    page
      .locator('#community')
      .getByRole('button', { name: 'Apply moderation' }),
  ).toHaveCount(0)
  await expect(inv.getByRole('button', { name: 'Record review' })).toHaveCount(
    0,
  )
  fixture.role = 'editor'
  await page.reload()
  await expect(page.locator('#deep-dives')).toBeHidden()
  await expect(page.locator('#community')).toBeHidden()
  assert.equal(await page.locator('#section-links a[href="#datacenter/community"]').count(), 0)
  assert.deepEqual(errors, [])
  console.log(
    'PASS: seven-module navigation, placeholders, capability gates after save, revision payload, missing provenance, escaped content, desktop/mobile layout; community moderation, report resolution, user suspension, thread/history, readonly and editor gates.',
  )
} finally {
  await browser.close()
  server.close()
}
