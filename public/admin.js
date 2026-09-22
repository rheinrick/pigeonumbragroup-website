import { recordTable, expandableRow, preview, displayDate } from './records.js'
import {setupOperations} from './operations.js'
import { setupEngagement } from './engagement.js'
import { setupParticipation } from './participation.js'
import { setupInventory } from './inventory.js'
import { setupDeepDives } from './deep-dives.js'
import { setupBilling } from './billing.js'
import { setupCommunity } from './community.js'
let state
const $ = (id) => document.getElementById(id)
const text = (tag, value) => {
  const node = document.createElement(tag)
  node.textContent = value
  return node
}
async function load() {
  const r = await fetch('/api/admin/state', { cache: 'no-store' })
  if (!r.ok)
    throw Error(
      'Could not load the admin workspace. Check your sign-in and backend configuration.',
    )
  state = await r.json()
  $('identity').textContent =
    `${state.reviewer} · ${state.role} · Revision ${state.revision}`
  renderSystem()
  renderFacilities()
  const sources = recordTable('Sources', ['Source', 'Published', 'Details'])
  for (const source of state.sources) {
    sources.add(...expandableRow(
      [source.organization ?? source.name ?? source.id, source.publishedAt ?? 'Not recorded'],
      'View source', text('pre', JSON.stringify(source, null, 2)),
    ))
  }
  $('sources').replaceChildren(sources.wrap)
  navigate()
  $('layer').replaceChildren(
    ...state.layers
      .filter((l) => l.id !== 'datacenters')
      .map((l) => new Option(l.name, l.id)),
  )
  $('approvals').replaceChildren(
    ...state.layers.map((l) => {
      const row = document.createElement('tr')
      row.append(text('th', l.name))
      for (const edition of ['main', 'dread', 'good'])
        row.append(
          text(
            'td',
            l.id === 'datacenters'
              ? 'Primary'
              : (state.decisions
                  .filter((d) => d.layerId === l.id && d.editionId === edition)
                  .at(-1)?.decision ?? 'pending'),
          ),
        )
      row.append(
        text('td', l.accessTier ?? 'Primary'),
        text('td', l.comparisonEligible ? 'Yes' : 'No'),
        text('td', l.facilityAnalysisEligible ? 'Yes' : 'No'),
        text('td', l.release ?? '—'),
        text('td', l.source ?? 'Catalog'),
        text('td', l.updated ?? '—'),
      )
      return row
    }),
  )
  $('release').replaceChildren(
    new Option('Select a complete release', ''),
    ...state.releases.map((r) => new Option(r.id, r.id)),
  )
  $('current-release').textContent =
    `Active managed release: ${state.release_id ?? 'None yet'} · Staged candidates: ${
      state.releases
        .filter((r) => r.id !== state.release_id)
        .map((r) => r.id)
        .join(', ') || 'None'
    }`
  renderAudit(state.audit)
  const contacts = recordTable('Contact inbox', ['Subject', 'Received', 'Topic', 'Notification', 'Details'])
  for (const c of state.contacts ?? []) {
    const detail = text('div', '')
    detail.append(text('p', c.message), text('p', c.email ? `Reply address: ${c.email}` : 'No reply address'))
    if (c.source) detail.append(text('p', `Source: ${c.source}`))
    if (c.notification !== 'sent' && state.capabilities.retryContact) {
      const retry = text('button', 'Retry notification')
      retry.onclick = () => void save('retry-contact', { id: c.id, reason: 'Retrying the saved contact notification.' })
      detail.append(retry)
    }
    contacts.add(...expandableRow([preview(c.subject), displayDate(c.created_at), c.topic, c.notification], 'Read message', detail))
  }
  $('contacts').replaceChildren(state.contacts?.length ? contacts.wrap : text('p', 'No submissions yet.'))
  applyCapabilities()
  setupCommunity(state)
  setupBilling(state)
  setupDeepDives(state)
  setupEngagement(state)
  setupOperations(state)
  setupParticipation(state)
  setupInventory()
  buildSectionMenu()
  navigate()
}
async function save(action, payload) {
  document.querySelectorAll('button').forEach((b) => (b.disabled = true))
  try {
    const r = await fetch(`/api/admin/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, expectedRevision: state.revision }),
    })
    const result = await r.json()
    if (!r.ok) throw Error(result.error ?? 'Save failed')
    await load()
    $('notice').textContent = 'Saved. The workspace has been refreshed.'
  } catch (e) {
    $('notice').textContent = e.message
  } finally {
    applyCapabilities()
  }
}
$('decision-form').onsubmit = (e) => {
  e.preventDefault()
  void save('decision', {
    layerId: $('layer').value,
    edition: $('edition').value,
    decision: $('decision').value,
    reason: $('reason').value,
  })
}
$('release-form').onsubmit = (e) => {
  e.preventDefault()
  void save(e.submitter?.value ?? 'validate', {
    releaseId: $('release').value,
    reason: $('release-reason').value,
  })
}
$('stage-form').onsubmit = (e) => {
  e.preventDefault()
  try {
    void save('stage', {
      release: JSON.parse($('descriptor').value),
      reason: $('stage-reason').value,
    })
  } catch {
    $('notice').textContent = 'Enter a valid release descriptor JSON.'
  }
}
$('facility').onchange = renderFacility
$('older-audit').onclick = async () => {
  try {
    const before = state.audit.at(-1)?.seq
    if (!before) return
    const response = await fetch(`/api/admin/state?before=${before}`, {
      cache: 'no-store',
    })
    if (!response.ok) throw Error('Could not load older audit records.')
    const next = await response.json()
    state.audit.push(...next.audit)
    renderAudit(state.audit)
    if (!next.audit.length)
      $('notice').textContent = 'All audit records loaded.'
  } catch (error) {
    $('notice').textContent = error.message
  }
}
window.addEventListener('hashchange', () => navigate(true))
$('section-jump').onchange = (event) => { location.hash = event.target.value }
navigate()
void load().catch((e) => {
  $('notice').textContent = e.message
})

function buildSectionMenu() {
  const panels = [...document.querySelectorAll('.workspace-panel')].filter(panel => !panel.hidden)
  $('section-links').replaceChildren(...panels.map(panel => {
    const link = text('a', panel.dataset.sectionLabel)
    link.href = `#datacenter/${panel.id}`
    return link
  }))
  $('section-jump').replaceChildren(...panels.map(panel => new Option(panel.dataset.sectionLabel, `#datacenter/${panel.id}`)))
}
function navigate(focus = false) {
  const links = [...document.querySelectorAll('nav[aria-label="Products"] a')]
  const hash = location.hash || '#dashboard'
  const key = hash.split('/')[0]
  const selected = links.find(link => link.getAttribute('href') === key) ?? links[0]
  for (const link of links) {
    if (link === selected) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
  const module = selected.getAttribute('href')
  const isDataCenter = module === '#datacenter'
  const panels = [...document.querySelectorAll('.workspace-panel')]
  const section = panels.find(panel => panel.id === hash.split('/')[1] && !panel.hidden) ?? $('system')
  for (const panel of panels) panel.classList.toggle('is-current', panel === section)
  for (const link of document.querySelectorAll('#section-links a')) {
    if (link.getAttribute('href') === `#datacenter/${section.id}`) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
  $('section-jump').value = `#datacenter/${section.id}`
  $('module-title').textContent = isDataCenter ? `DataCenter · ${section.dataset.sectionLabel}` : selected.textContent
  $('dashboard').hidden = !state || module !== '#dashboard'
  $('content').hidden = !state || !isDataCenter
  $('section-menu').hidden = !state || !isDataCenter
  $('section-toolbar').hidden = !state || !isDataCenter
  $('placeholder').hidden = module === '#dashboard' || isDataCenter
  if (focus) {
    $('module-title').focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}
function applyCapabilities() {
  document.querySelectorAll('button').forEach((button) => {
    button.disabled = false
  })
  document.querySelectorAll('[data-capability]').forEach((button) => {
    button.disabled = !state?.capabilities[button.dataset.capability]
  })
}
function card(label, value) {
  const item = document.createElement('div')
  item.append(text('small', label), text('strong', value ?? 'Unknown'))
  return item
}
function renderSystem() {
  const system = state.system
  $('publication-status').textContent = system.publicationStatus
  $('system-status').replaceChildren(
    card('Dread', system.deployments.dread.mode),
    card('Main', system.deployments.main.mode),
    card(
      'Catalog records / map sites',
      `${system.facilityCount} / ${system.siteCount}`,
    ),
    card('Contextual layers', system.contextualLayerCount),
    card('Managed dataset prepared', system.datasetTimestamp),
    card('Catalog checked', system.catalogCheckedAt),
    card('Catalog snapshot', system.catalogSnapshot),
    card(
      `Dread version · observed ${system.deployments.observedAt}`,
      system.deployments.dread.version,
    ),
    card(
      `Main version · observed ${system.deployments.observedAt}`,
      system.deployments.main.version,
    ),
  )
  $('overview').replaceChildren(
    card('DataCenter', 'Available'),
    card('Public release', 'Dread review beta'),
    card('Managed release', state.release_id ?? 'Not activated'),
  )
}
function renderFacilities() {
  const selected = $('facility').value
  $('facility').replaceChildren(
    ...state.facilities.map((f) => new Option(f.name, f.id)),
  )
  if (state.facilities.some((f) => f.id === selected))
    $('facility').value = selected
  renderFacility()
}
function renderFacility() {
  const facility = state.facilities.find((f) => f.id === $('facility').value)
  if (!facility) return
  const values = {
    ID: facility.id,
    Slug: facility.slug,
    Name: facility.name,
    Operator: facility.operator,
    Status: facility.status,
    Coordinates: facility.location.coordinates.join(', '),
    Address: facility.address,
    City: facility.city,
    'County GEOID': facility.countyGeoid,
    'State FIPS': facility.stateFips,
    'Source references': facility.sourceIds.join(', '),
    'Location accuracy': facility.location.accuracy,
    'Uncertainty (meters)': facility.location.uncertaintyM,
    Confidence: facility.confidence,
    'Last verified': facility.lastVerified,
    Notes: facility.notes,
  }
  $('facility-detail').replaceChildren(
    ...Object.entries(values).flatMap(([label, value]) => [
      text('dt', label),
      text('dd', value ?? 'Not recorded'),
    ]),
  )
}
function renderAudit(records) {
  const table = recordTable('Audit history', ['Action', 'Recorded', 'Actor', 'Reason', 'Details'])
  for (const a of records) {
    const detail = text('div', '')
    detail.append(
      text('p', `Target: ${a.target ?? 'Legacy record; see detail'} · Revision: ${a.previous_revision ?? 'not recorded'} → ${a.resulting_revision ?? 'not recorded'}`),
      text('pre', a.detail),
    )
    table.add(...expandableRow([a.action, displayDate(a.created_at), a.reviewer, preview(a.reason)], 'Audit detail', detail))
  }
  $('history').replaceChildren(records.length ? table.wrap : text('p', 'No audit records yet.'))
  $('older-audit').hidden = records.length < 100
}
