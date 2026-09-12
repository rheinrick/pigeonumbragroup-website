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
  $('sources').replaceChildren(
    ...state.sources.map((source) => {
      const item = document.createElement('details')
      item.append(
        text('summary', source.organization ?? source.name ?? source.id),
        text('pre', JSON.stringify(source, null, 2)),
      )
      return item
    }),
  )
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
  $('contacts').replaceChildren(
    ...(state.contacts?.length
      ? state.contacts.map((c) => {
          const item = document.createElement('article')
          item.append(
            text('h3', c.subject),
            text(
              'small',
              `${c.created_at} · ${c.topic} · Notification: ${c.notification}`,
            ),
            text('p', c.message),
            text(
              'p',
              c.email ? `Reply address: ${c.email}` : 'No reply address',
            ),
          )
          if (c.source) item.append(text('p', `Source: ${c.source}`))
          if (c.notification !== 'sent' && state.capabilities.retryContact) {
            const retry = text('button', 'Retry notification')
            retry.onclick = () =>
              void save('retry-contact', {
                id: c.id,
                reason: 'Retrying the saved contact notification.',
              })
            item.append(retry)
          }
          return item
        })
      : [text('p', 'No submissions yet.')]),
  )
  applyCapabilities()
  setupCommunity(state)
  setupBilling(state)
  setupDeepDives(state)
  setupEngagement(state)
  setupParticipation(state)
  setupInventory()
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
window.addEventListener('hashchange', navigate)
navigate()
void load().catch((e) => {
  $('notice').textContent = e.message
})

function navigate() {
  const links = [...document.querySelectorAll('nav a')]
  const key = location.hash || '#dashboard'
  const selected =
    links.find((link) => link.getAttribute('href') === key) ?? links[0]
  for (const link of links) {
    if (link === selected) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
  const module = selected.getAttribute('href')
  $('module-title').textContent = selected.textContent
  $('dashboard').hidden = !state || module !== '#dashboard'
  $('content').hidden = !state || module !== '#datacenter'
  $('placeholder').hidden = module === '#dashboard' || module === '#datacenter'
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
  $('history').replaceChildren(
    ...records.map((a) => {
      const item = text('li', `${a.action} · ${a.created_at}`)
      item.append(
        text(
          'p',
          `Actor: ${a.reviewer} · Target: ${a.target ?? 'Legacy record; see detail'} · Revision: ${a.previous_revision ?? 'not recorded'} → ${a.resulting_revision ?? 'not recorded'}`,
        ),
        text('p', a.reason),
      )
      const details = document.createElement('details')
      details.append(text('summary', 'Audit detail'), text('pre', a.detail))
      item.append(details)
      return item
    }),
  )
  $('older-audit').hidden = records.length < 100
}
