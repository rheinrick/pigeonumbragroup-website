const api = '/api/admin/inventory-discovery'
const create = (tag, text) => {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  return node
}
const label = (text, input) => {
  const node = create('label', text)
  input.setAttribute('aria-label', text)
  node.append(input)
  return node
}
const select = (options) => {
  const node = create('select')
  for (const [value, text] of options) node.add(new Option(text, value))
  return node
}
const decisionLabel = (value) => ({ approve: 'Accepted for preparation', defer: 'Deferred', reject: 'Rejected', needs_review: 'Needs review' })[value] ?? 'Needs review'
const shown = (value) => value === undefined || value === null ? 'Absent' : typeof value === 'string' ? value : JSON.stringify(value)
function sourceLink(url, text) {
  const link = create('a', text)
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return create('span', 'Source link unavailable')
    link.href = parsed.href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    return link
  } catch { return create('span', 'Source link unavailable') }
}
function diffTable(before = {}, after = {}) {
  const wrap = create('div'), table = create('table'), head = create('thead'), body = create('tbody'), tr = create('tr')
  wrap.className = 'discovery-diff'
  for (const title of ['Field', 'Previous observation', 'Current observation']) tr.append(create('th', title))
  head.append(tr)
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  for (const key of keys) {
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue
    const row = create('tr')
    for (const value of [key, shown(before[key]), shown(after[key])]) row.append(create('td', value))
    body.append(row)
  }
  table.append(head, body)
  if (body.childElementCount) wrap.append(table)
  else wrap.append(create('p', 'No source tag changes.'))
  return wrap
}
async function result(response) {
  const value = await response.json()
  if (!response.ok) {
    const error = Error(value.error ?? 'Discovery service unavailable')
    error.status = response.status
    throw error
  }
  return value
}

export function setupInventoryDiscovery(host) {
  if (!host || host.querySelector('#inventory-discovery')) return
  const panel = create('div')
  panel.id = 'inventory-discovery'
  panel.className = 'inventory-discovery'
  const heading = create('h3', 'Weekly discovery inbox')
  heading.tabIndex = -1
  const notice = create('p'), summary = create('div'), provenance = create('details'), filters = create('form'), actions = create('div'), cards = create('div'), pager = create('p'), nav = create('div')
  notice.setAttribute('role', 'status')
  notice.setAttribute('aria-live', 'polite')
  notice.className = 'discovery-notice'
  summary.className = 'discovery-summary'
  filters.className = 'discovery-filters'
  actions.className = 'discovery-actions'
  nav.className = 'discovery-actions'
  const q = create('input'), change = select([['', 'All observations'], ['new_listing', 'New'], ['listing_changed', 'Changed'], ['listing_missing', 'Missing from source']]), decision = select([['', 'All review decisions'], ['needs_review', 'Needs review'], ['approve', 'Accepted for preparation'], ['defer', 'Deferred'], ['reject', 'Rejected']]), priority = select([['', 'Published facilities first'], ['published_catalog', 'Published facilities only'], ['discovery', 'Unpublished candidates only']])
  q.type = 'search'
  q.maxLength = 200
  filters.append(label('Search discovery observations', q), label('Observation change', change), label('Discovery review decision', decision), label('Facility priority', priority), create('button', 'Filter discovery inbox'))
  const refresh = create('button', 'Refresh discovery inbox'), download = create('button', 'Export discovery ledger'), previous = create('button', 'Previous discovery page'), next = create('button', 'Next discovery page')
  for (const button of [refresh, download, previous, next]) button.type = 'button'
  actions.append(refresh, download)
  nav.append(previous, next)
  panel.append(heading, create('p', 'Weekly observations are leads for review. Accepting a lead prepares evidence for a separately validated facility release; it does not publish, confirm operation, or delete a facility. A missing source record does not establish closure.'), notice, summary, provenance, actions, filters, pager, nav, cards)
  host.insertBefore(panel, host.children[2] ?? null)
  let page = 0, data = null, loading = false, requestSequence = 0
  const setPaging = () => {
    previous.disabled = loading || !data || page === 0
    next.disabled = loading || !data || (page + 1) * data.pageSize >= data.total
    download.disabled = loading || !data
  }
  async function load() {
    const sequence = ++requestSequence
    loading = true
    cards.replaceChildren()
    notice.textContent = 'Loading discovery observations…'
    refresh.disabled = true
    filters.querySelector('button').disabled = true
    setPaging()
    try {
      const params = new URLSearchParams({q:q.value, change:change.value, decision:decision.value, priority:priority.value, page:String(page)})
      const value = await result(await fetch(api + '?' + params, {cache:'no-store'}))
      if (sequence !== requestSequence) return
      data = value
      page = value.page ?? page
      summary.replaceChildren()
      const counts = value.counts ?? {}
      summary.append(create('p', `Public facility release: ${value.release ?? 'Unreported'} · ${value.total} matching observations · ${counts.pending ?? counts.needs_review ?? 0} need review · ${counts.approve ?? 0} accepted for preparation · ${counts.defer ?? 0} deferred · ${counts.reject ?? 0} rejected`))
      const batch = value.batch
      if (!batch) summary.append(create('p', 'No successful discovery batch has been imported. The scheduled scan is not yet verified here.'))
      else summary.append(create('p', `Imported discovery batch: ${batch.id ?? batch.batchId ?? 'Unreported'} · ${batch.provenance?.kind === 'manual_initial' ? 'Manual initial observation; this is not a scheduled-run receipt.' : 'See provenance for the acquisition and ingestion receipts.'}`))
      const attempt = value.latestAttempt
      if (attempt && ['failed', 'failure', 'rejected'].includes(attempt.status)) summary.append(create('p', 'Latest discovery ingestion failed. The last successful batch is retained; this failure does not establish a facility change.'))
      provenance.replaceChildren(create('summary', 'Discovery provenance and latest ingestion attempt'), create('pre', JSON.stringify({batch, latestAttempt:attempt}, null, 2)))
      pager.textContent = `Discovery page ${page + 1} · ${value.total} matching observations · Published facilities are reviewed first.`
      cards.replaceChildren(...value.rows.map(renderRow))
      if (!value.rows.length) cards.append(create('p', 'No matching discovery observations.'))
      actions.querySelector('.discovery-import')?.remove()
      if (value.canImport) actions.append(importControl())
      notice.textContent = value.canReview ? 'Discovery inbox loaded. Review decisions preserve the public catalog.' : 'Discovery inbox loaded. Your role has read-only access.'
    } catch (error) {
      if (sequence !== requestSequence) return
      data = null
      summary.replaceChildren()
      provenance.replaceChildren()
      actions.querySelector('.discovery-import')?.remove()
      notice.textContent = error.message
    } finally {
      if (sequence === requestSequence) {
        loading = false
        refresh.disabled = false
        filters.querySelector('button').disabled = false
        setPaging()
      }
    }
  }
  function renderRow(row) {
    const card = create('details'), title = create('summary')
    card.className = 'discovery-card'
    card.dataset.discoveryId = row.id
    title.textContent = `${row.name ?? row.sourceKey} · ${{new_listing:'New observation',listing_changed:'Changed observation',listing_missing:'Missing from source'}[row.change] ?? row.change} · ${decisionLabel(row.review?.decision)}`
    const facilities = row.facilityIds ?? []
    card.append(title, create('p', facilities.length ? `Published facility: ${facilities.join(', ')}` : 'Unpublished discovery candidate'), create('p', `Source identity: ${row.sourceKey} · Priority: ${facilities.length ? 'Published catalog' : 'Discovery candidate'}`), sourceLink(row.sourceUrl, 'Open original source observation'), create('h4', 'Changed source tags'), diffTable(row.before?.tags, row.after?.tags), create('h4', 'Observed geometry'), create('p', `Previous: ${shown(row.before?.coordinates)} → Current: ${shown(row.after?.coordinates)}. A moved or missing observation does not confirm relocation or closure.`))
    const duplicates = create('details')
    duplicates.append(create('summary', 'Possible duplicates and building / campus identity'))
    if (row.possibleDuplicates?.length) {
      for (const item of row.possibleDuplicates) duplicates.append(create('p', typeof item === 'string' ? item : JSON.stringify(item)))
    } else duplicates.append(create('p', 'No duplicate leads recorded. Identity still requires review.'))
    card.append(duplicates)
    const history = create('details')
    history.append(create('summary', 'Review history and audit'))
    const events = row.history ?? row.review?.history ?? []
    if (row.review) history.append(create('p', `Current decision: ${decisionLabel(row.review.decision)}`), create('pre', JSON.stringify(row.review, null, 2)))
    if (events.length) for (const event of events) history.append(create('pre', JSON.stringify(event, null, 2)))
    else history.append(create('p', 'No earlier review decisions recorded for this content fingerprint.'))
    card.append(history)
    if (data.canReview) card.append(reviewForm(row))
    return card
  }
  function reviewForm(row) {
    const form = create('form'), decision = select([['defer','Defer pending evidence'],['approve','Accept for preparation'],['reject','Reject this observation']]), reason = create('textarea'), identity = select([['unresolved','Unresolved'],['single_building','Single building'],['campus','Campus'],['multiple_buildings','Multiple buildings'],['tenant','Tenant within a building']]), notes = create('textarea'), citations = create('div'), add = create('button', 'Add dated evidence citation'), save = create('button', 'Save discovery review'), message = create('p')
    form.className = 'discovery-review'
    message.setAttribute('role','status')
    reason.required = notes.required = true
    reason.minLength = notes.minLength = 20
    reason.maxLength = notes.maxLength = 1000
    decision.value = row.review?.decision ?? 'defer'
    reason.value = row.review?.reason ?? ''
    notes.value = row.review?.identity?.notes ?? ''
    identity.value = row.review?.identity?.kind ?? 'unresolved'
    add.type = 'button'
    citations.className = 'discovery-citations'
    function addCitation(value = {}) {
      const group = create('div'), url = create('input'), date = create('input'), kind = select([['operator','Operator'],['jurisdiction','Jurisdiction']]), remove = create('button','Remove citation')
      group.className = 'discovery-citation'
      url.type = 'url'
      url.placeholder = 'https://…'
      url.maxLength = 1000
      url.value = value.url ?? ''
      date.type = 'date'
      date.value = value.date ?? ''
      kind.value = value.kind ?? 'operator'
      url.dataset.citation = 'url'; date.dataset.citation = 'date'; kind.dataset.citation = 'kind'
      remove.type = 'button'
      remove.onclick = () => { group.remove(); updateRequirements() }
      group.append(label('Primary evidence URL',url), label('Evidence date',date), label('Evidence source',kind),remove)
      citations.append(group)
      updateRequirements()
    }
    function updateRequirements() {
      for (const input of citations.querySelectorAll('input')) input.required = decision.value === 'approve'
      identity.setCustomValidity(decision.value === 'approve' && identity.value === 'unresolved' ? 'Resolve building, campus or tenant identity before accepting for preparation.' : '')
    }
    for (const evidence of row.review?.evidence ?? []) addCitation(evidence)
    if (!citations.childElementCount) addCitation()
    decision.onchange = updateRequirements
    identity.onchange = updateRequirements
    add.onclick = () => { if(citations.childElementCount < 10) addCitation(); else message.textContent = 'A review supports up to 10 evidence citations.' }
    form.append(label('Discovery decision',decision),label('Discovery review reason',reason),create('p','Acceptance requires dated operator or jurisdiction evidence and resolved identity. It does not approve a public facility release.'),citations,add,label('Building / campus identity',identity),label('Identity reconciliation notes',notes),save,message)
    form.onsubmit = async (event) => {
      event.preventDefault()
      updateRequirements()
      const evidence = [...citations.children].map(group=>Object.fromEntries([...group.querySelectorAll('[data-citation]')].map(input=>[input.dataset.citation,input.value.trim()]))).filter(item=>item.url || item.date)
      if (decision.value === 'approve' && !evidence.length) { message.textContent = 'Add a dated primary evidence citation before accepting for preparation.'; return }
      if (!form.reportValidity()) return
      save.disabled = true
      message.textContent = 'Saving discovery review…'
      try {
        const value = await result(await fetch(api+'-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({batchId:data.batch.id ?? data.batch.batchId,id:row.id,fingerprint:row.fingerprint,expectedRevision:data.revision,decision:decision.value,reason:reason.value.trim(),evidence,identity:{kind:identity.value,notes:notes.value.trim()}})}))
        await load()
        notice.textContent = value.note ?? 'Discovery review saved in audit. Public inventory remains unchanged.'
      } catch (error) {
        message.textContent = error.status === 409 ? `${error.message} Refresh the discovery inbox before reviewing again.` : error.message
      } finally { save.disabled = false }
    }
    return form
  }
  function importControl() {
    const detail = create('details'), form = create('form'), file = create('input'), save = create('button','Import prepared discovery package'), message = create('p')
    detail.className = 'discovery-import'
    detail.append(create('summary','Owner / admin: import an existing observation package'),create('p','Select the prepared JSON package containing the existing report and source observation. This does not acquire new data or run a scheduled scan. A manually seeded initial batch must retain that label.'))
    file.type = 'file'; file.accept = '.json,application/json'; file.required = true
    message.setAttribute('role','status')
    form.append(label('Prepared discovery package',file),save,message)
    detail.append(form)
    form.onsubmit = async event => {
      event.preventDefault()
      const selected = file.files[0]
      if (!selected || selected.size > 14_000_000) { message.textContent = 'Select a JSON package no larger than 14 MB.'; return }
      save.disabled = true
      try {
        const prepared = JSON.parse(await selected.text())
        if (!prepared.report || typeof prepared.observationBase64 !== 'string') throw Error('The package must contain report and observationBase64.')
        const payload = JSON.stringify({report:prepared.report,observationBase64:prepared.observationBase64,expectedRevision:data.revision})
        if(new Blob([payload]).size > 14_000_000) throw Error('Prepared import exceeds 14 MB.')
        const value = await result(await fetch(api+'-import',{method:'POST',headers:{'Content-Type':'application/json'},body:payload}))
        await load()
        notice.textContent = value.note ?? 'Existing observation package imported. Public inventory remains unchanged.'
      } catch(error) { message.textContent = error.message }
      finally {save.disabled=false}
    }
    return detail
  }
  filters.onsubmit = event => { event.preventDefault(); page = 0; void load() }
  refresh.onclick = () => void load()
  previous.onclick = () => { page = Math.max(0,page-1); void load() }
  next.onclick = () => { page++; void load() }
  download.onclick = async () => {
    download.disabled = true
    let objectUrl
    try {
      const value = await result(await fetch(api+'-export',{cache:'no-store'}))
      objectUrl = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}))
      const link=create('a');link.href=objectUrl;link.download='inventory-discovery-ledger.json';link.click()
      notice.textContent = 'Discovery ledger exported. It is not a normalized public facility release.'
    } catch(error) {notice.textContent=error.message}
    finally {if(objectUrl) URL.revokeObjectURL(objectUrl);setPaging()}
  }
  void load()
}
