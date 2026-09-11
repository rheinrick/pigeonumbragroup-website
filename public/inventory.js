const el = (tag, value) => {
  const n = document.createElement(tag)
  if (value !== undefined) n.textContent = value
  return n
}
export function setupInventory() {
  const host = document.getElementById('inventory')
  if (!host || host.dataset.ready) return
  host.dataset.ready = 'true'
  host.append(
    el('h2', 'DataCenter Inventory'),
    el(
      'p',
      'Review observations, canonical fields and duplicate relationships. Saving a review does not change the public map. Publishing requires a validated inventory release.',
    ),
  )
  const notice = el('p')
  notice.setAttribute('role', 'status')
  const summary = el('div'),
    coverage = el('details'),
    sources = el('details'),
    form = el('form'),
    q = el('input'),
    state = el('input'),
    decision = el('select'),
    list = el('div'),
    pager = el('p'),
    previous = el('button', 'Previous'),
    next = el('button', 'Next'),
    download = el('button', 'Export review ledger')
  for (const [label, input] of [
    ['Find a name, operator or address', q],
    ['State FIPS (optional)', state],
    ['Review status', decision],
  ]) {
    const node = el('label', label + ' ')
    node.append(input)
    form.append(node)
  }
  state.maxLength = 2
  for (const v of ['', 'needs_review', 'approve', 'defer', 'reject', 'merge'])
    decision.add(new Option(v || 'All candidates', v))
  form.append(el('button', 'Search candidates'))
  coverage.append(el('summary', 'Coverage by state, market and operator'))
  sources.append(el('summary', 'Source rights and refresh restrictions'))
  host.append(
    notice,
    summary,
    coverage,
    sources,
    form,
    download,
    pager,
    previous,
    next,
    list,
  )
  let page = 0,
    data
  async function load() {
    notice.textContent = 'Loading inventory…'
    try {
      const params = new URLSearchParams({
          q: q.value,
          state: state.value,
          decision: decision.value,
          page: String(page),
        }),
        r = await fetch('/api/admin/inventory?' + params, { cache: 'no-store' })
      data = await r.json()
      if (!r.ok) throw Error(data.error ?? 'Inventory unavailable')
      summary.replaceChildren(
        el(
          'p',
          `${data.release} · ${data.coverage.published} published records · ${data.coverage.candidates} discovery candidates · ${data.counts.needs_review} need review · ${data.counts.defer} deferred · ${data.counts.reject} rejected`,
        ),
        el('p', data.coverage.note),
      )
      if (data.participationIntake?.length) {
        const intake = el('details'); intake.append(el('summary', 'Company discovery candidates and accepted corrections'));
        for (const item of data.participationIntake) intake.append(el('p', `${item.kind}: ${item.name ?? item.facility_id} · ${item.status} · ${item.staging_status ?? 'Awaiting review'} · Request ${item.id}`));
        const link=el('a','Open private participation review / inventory export');link.href='#participation';intake.append(link);summary.append(intake);
      }
      coverage.replaceChildren(
        el('summary', 'Coverage by state, market and operator'),
      )
      for (const key of ['states', 'markets', 'operators']) {
        const d = el('details')
        d.append(el('summary', key))
        const wrap = el('div'),
          table = el('table'),
          head = el('tr'),
          body = el('tbody')
        wrap.style.overflowX = 'auto'
        for (const label of [
          'Area / operator',
          'Published',
          'Candidates',
          'Medium',
          'Low',
          'Unassessed',
          'Unlocated',
          'Unknown status',
        ])
          head.append(el('th', label))
        const thead = el('thead')
        thead.append(head)
        for (const [name, counts] of Object.entries(data.coverage[key])) {
          const tr = el('tr')
          for (const value of [
            name,
            counts.published,
            counts.candidates,
            counts.medium,
            counts.low,
            counts.not_assessed,
            counts.unlocated,
            counts.unknown,
          ])
            tr.append(el('td', String(value)))
          body.append(tr)
        }
        table.append(thead, body)
        wrap.append(table)
        d.append(wrap)
        coverage.append(d)
      }
      sources.replaceChildren(
        el('summary', 'Source rights and refresh restrictions'),
        ...data.registry.map((s) => {
          const d = el('details')
          d.append(
            el('summary', `${s.name} · ${s.rightsStatus}`),
            el('pre', JSON.stringify(s, null, 2)),
          )
          return d
        }),
      )
      pager.textContent = `Page ${page + 1} · ${data.total} matching candidates`
      previous.disabled = page === 0
      next.disabled = (page + 1) * data.pageSize >= data.total
      list.replaceChildren(...data.rows.map(render))
      notice.textContent = 'Inventory loaded.'
    } catch (e) {
      notice.textContent = e.message
    }
  }
  function render(row) {
    const card = el('details')
    card.append(
      el(
        'summary',
        `${row.normalized.name} · ${row.review?.decision ?? 'needs_review'} · ${row.normalized.confidence}`,
      ),
      el('p', row.normalized.address ?? 'No street address'),
      el(
        'p',
        row.validationIssues.join('; ') ||
          'Normalization and generalized polygon checks passed. Operational confirmation may still be missing.',
      ),
    )
    const link = el('a', 'Original source record')
    link.href = row.sourceUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    card.append(link)
    for (const [label, value] of [
      ['Original source fields', row.sourceOriginal],
      ['Normalized record and provenance', row.normalized],
      ['Current review', row.review],
      ['Possible duplicates', row.duplicates],
    ]) {
      const detail = el('details')
      detail.append(
        el('summary', label),
        el('pre', JSON.stringify(value, null, 2)),
      )
      card.append(detail)
    }
    if (!data.canReview) return card
    const f = el('form'),
      action = el('select'),
      reason = el('textarea'),
      evidence = el('textarea'),
      overrides = el('textarea'),
      target = el('input'),
      pair = el('select'),
      save = el('button', 'Record review')
    for (const v of [
      'defer',
      'approve',
      'reject',
      'edit',
      'merge',
      'same_campus',
      'unrelated',
    ])
      action.add(new Option(v.replaceAll('_', ' '), v))
    pair.add(new Option('No duplicate pair', ''))
    for (const p of row.duplicates)
      pair.add(
        new Option(`${p.a === row.id ? p.b : p.a} · score ${p.score}`, p.id),
      )
    evidence.value = row.review?.evidence?.join('\n') ?? row.sourceUrl
    overrides.value = JSON.stringify(row.review?.overrides ?? {}, null, 2)
    reason.minLength = 20
    reason.maxLength = 1000
    reason.required = true
    for (const [label, input] of [
      ['Action', action],
      ['Evidence links (one HTTPS URL per line)', evidence],
      ['Review reason', reason],
      ['Canonical name/operator/aliases/code/notes edits (JSON)', overrides],
      ['Merge target stable ID', target],
      ['Duplicate pair', pair],
    ]) {
      const l = el('label', label)
      l.append(input)
      f.append(l)
    }
    f.append(save)
    card.append(f)
    f.onsubmit = async (event) => {
      event.preventDefault()
      save.disabled = true
      try {
        const response = await fetch('/api/admin/inventory-review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: row.id,
              fingerprint: row.fingerprint,
              expectedRevision: data.revision,
              decision: action.value,
              reason: reason.value,
              evidence: evidence.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
              overrides: JSON.parse(overrides.value),
              targetId: target.value || null,
              pairId: pair.value || null,
              pairFingerprints:
                row.duplicates.find((p) => p.id === pair.value)
                  ?.pairFingerprints ?? null,
            }),
          }),
          result = await response.json()
        if (!response.ok) throw Error(result.error)
        await load()
        notice.textContent = result.note
      } catch (error) {
        notice.textContent = error.message
      } finally {
        save.disabled = false
      }
    }
    return card
  }
  form.onsubmit = (e) => {
    e.preventDefault()
    page = 0
    void load()
  }
  previous.onclick = () => {
    page--
    void load()
  }
  next.onclick = () => {
    page++
    void load()
  }
  download.onclick = async () => {
    try {
      const r = await fetch('/api/admin/inventory-export', {
        cache: 'no-store',
      })
      if (!r.ok) throw Error('Review export failed')
      const data = await r.json(),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2) + '\n'], {
            type: 'application/json',
          }),
        ),
        a = el('a')
      a.href = url
      a.download = 'inventory-review-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      notice.textContent = e.message
    }
  }
  void load()
}
