import { node, recordTable, recordRow, expandableRow, displayDate } from './records.js'
const allowedRoles = ['owner', 'admin', 'readonly']
const field = (form, label, value, type = 'text') => {
  const wrap = node('label', label + ' '), input = node(type === 'textarea' ? 'textarea' : 'input')
  if (type !== 'textarea') input.type = type
  input.value = value ?? ''
  wrap.append(input); form.append(wrap)
  return input
}
const reason = form => {
  const input = field(form, 'Review reason', '')
  input.required = true; input.minLength = 12; input.maxLength = 500
  return input
}
function safeSource(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return node('span', 'Source URL unavailable')
    const link = node('a', 'Open source'); link.href = parsed.href; link.target = '_blank'; link.rel = 'noopener noreferrer'
    return link
  } catch { return node('span', 'Source URL unavailable') }
}
export function setupDread(account) {
  const box = document.getElementById('dread')
  if (!box) return
  box.hidden = !allowedRoles.includes(account.role)
  if (box.hidden) { box.replaceChildren(); return }
  const notice = node('p'); notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite')
  let loading = false, saving = false
  async function request(path = 'state', payload) {
    const response = await fetch('/api/admin/dread/' + path, { cache: 'no-store', ...(payload === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) })
    const result = await response.json()
    if (!response.ok) throw Error(result.error || 'Dread administration is unavailable.')
    return result
  }
  async function save(path, payload) {
    if (saving) return
    saving = true
    box.querySelectorAll('button,input,select,textarea').forEach(input => { input.disabled = true })
    notice.textContent = 'Saving reviewed Dread changes…'
    try {
      await request(path, payload)
      await load()
      notice.textContent = 'Saved. Dread policy and ingestion status refreshed.'
    } catch (error) {
      // Refresh the revision after a conflict; retain the error until a later action.
      await load()
      notice.textContent = error.message
    } finally { saving = false }
  }
  async function load() {
    if (loading) return
    loading = true
    try {
      const state = await request()
      const canWrite = account.role !== 'readonly' && state.canWrite === true
      box.replaceChildren(node('h2', 'DataCenterDread // Delta Access'), node('p', 'Public Access, Gate 1 Delta and reserved Gate 2 Omega. Dread Gate policies are separate from DataCenterData Free, Pro and Intelligence.'), notice)
      const refresh = node('button', 'Refresh Dread'); refresh.type = 'button'; refresh.onclick = () => void load(); box.append(refresh)
      const gates = recordTable('Dread Gates', ['Gate', 'Availability', 'Product'])
      for (const [id, gate] of Object.entries(state.gates ?? {})) gates.add(recordRow([gate.name ?? id, id === 'omega' ? 'Reserved · unavailable' : gate.available ? 'Implemented' : 'Unavailable', 'DataCenterDread']))
      box.append(gates.wrap)
      const layers = recordTable('Dread layers and source quality', ['Layer', 'Domain', 'Gate', 'State', 'Records', 'Last published', 'Details'])
      for (const layer of state.layers ?? []) {
        const detail = node('div'), metadata = node('dl'), version = layer.currentVersion
        for (const [label, value] of Object.entries({ Provider: layer.source, 'Source class': layer.evidenceClass, Verification: layer.verificationStatus, 'Source quality': layer.sourceQuality, 'Coverage quality': layer.coverageQuality, Geography: layer.geography, Period: version?.period ?? version?.data_period ?? 'Not published', Coverage: version?.coverage ?? layer.coverage, Cadence: layer.updateCadence, License: layer.license, Methodology: layer.methodologyNotes, Limitations: version?.limitations ?? layer.limitations, 'Last published': displayDate(layer.lastSuccess), 'Last validated': displayDate(layer.lastValidated), 'Last attempt': displayDate(layer.lastAttempt?.started_at), 'Last duration': layer.durationMs == null ? 'Not measured' : `${layer.durationMs} ms`, 'Changed records': layer.changedRecords ?? 'Not measured', Freshness: layer.stale ? `Stale or unpublished · threshold ${layer.staleThresholdDays} days` : 'Current', 'Last error': layer.error ?? layer.lastAttempt?.error ?? 'None' })) metadata.append(node('dt', label), node('dd', value))
        detail.append(metadata, safeSource(layer.sourceUrl))
        if (canWrite) {
          const form = node('form'), gateWrap = node('label', 'Minimum Gate '), gate = node('select')
          gate.setAttribute('aria-label', layer.name + ' minimum Gate')
          for (const id of layer.gate === 'public' ? ['public'] : ['delta', 'omega']) gate.append(new Option(id === 'omega' ? 'Omega · reserved' : id, id))
          gate.value = layer.minimumGate; gateWrap.append(gate); form.append(gateWrap)
          const enabled = field(form, 'Enabled', '', 'checkbox'); enabled.checked = !!layer.enabled
          const applyGate = () => { enabled.disabled = gate.value === 'omega' || layer.status === 'BLOCKED'; if (gate.value === 'omega') enabled.checked = false }
          gate.onchange = applyGate; applyGate()
          const why = reason(form); form.append(node('button', 'Save Dread layer policy'))
          form.onsubmit = event => { event.preventDefault(); void save('layer', { id: layer.id, minimumGate: gate.value, enabled: enabled.checked, expectedRevision: layer.revision, reason: why.value }) }
          detail.append(form)
        }
        layers.add(...expandableRow([layer.name, layer.domain, layer.minimumGate, layer.enabled ? 'Enabled' : 'Disabled', layer.records ?? 'Not published', displayDate(layer.lastSuccess)], 'Inspect Dread layer', detail))
      }
      box.append(layers.wrap)
      const domains = recordTable('Dread domains', ['Domain', 'Order', 'Enabled', 'Details'])
      for (const domain of state.domains ?? []) {
        const detail = node('div'); detail.append(node('p', domain.description))
        if (canWrite) {
          const form = node('form'), description = field(form, 'Description', domain.description, 'textarea'), ordering = field(form, 'Order', domain.ordering, 'number'), enabled = field(form, 'Enabled', '', 'checkbox'), why = reason(form)
          description.required = true; description.maxLength = 500; ordering.min = 0; ordering.max = 100; ordering.step = 1; ordering.required = true; enabled.checked = !!domain.enabled
          form.append(node('button', 'Save Dread domain'))
          form.onsubmit = event => { event.preventDefault(); void save('domain', { id: domain.id, description: description.value, ordering: Number(ordering.value), enabled: enabled.checked, expectedRevision: domain.revision, reason: why.value }) }
          detail.append(form)
        }
        domains.add(...expandableRow([domain.name, domain.ordering, domain.enabled ? 'Yes' : 'No'], 'Inspect Dread domain', detail))
      }
      box.append(domains.wrap)
      const versions = recordTable('Dread dataset versions', ['Dataset', 'Version', 'Records', 'State', 'Publication'])
      for (const version of state.versions ?? []) {
        const layer = state.layers.find(item => item.id === version.dataset_id), action = node('div')
        if (canWrite && layer?.state && layer.state.current_version !== version.id && ['staged', 'published'].includes(version.status)) {
          const form = node('form'), why = reason(form)
          form.append(node('p', 'Publish only after source coverage, suppression and reporting periods have been reviewed.'), node('button', 'Publish reviewed Dread version'))
          form.onsubmit = event => { event.preventDefault(); void save('publish', { versionId: version.id, expectedRevision: layer.state.revision, reason: why.value }) }
          action.append(form)
        } else action.append(node('span', layer?.state?.current_version === version.id ? 'Current publication' : 'No publication action'))
        versions.add(...expandableRow([version.dataset_id, version.id, version.record_count, version.status], 'Review Dread version', action))
      }
      box.append(versions.wrap)
      const runs = recordTable('Dread ingestion runs', ['Dataset', 'Started', 'Duration', 'State', 'Records', 'Error'])
      for (const run of state.runs ?? []) runs.add(recordRow([run.dataset_id, displayDate(run.started_at), run.finished_at ? `${run.finished_at - run.started_at} ms` : 'Running', run.status, run.record_count ?? 'Not recorded', run.error ?? 'None']))
      box.append(runs.wrap)
    } catch (error) {
      box.replaceChildren(node('h2', 'DataCenterDread // Delta Access'), notice)
      notice.textContent = error.message
      const retry = node('button', 'Retry Dread'); retry.onclick = () => void load(); box.append(retry)
    } finally { loading = false }
  }
  void load()
}
