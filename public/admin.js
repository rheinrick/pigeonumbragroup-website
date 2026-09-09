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
  $('identity').textContent = `${state.reviewer} · Revision ${state.revision}`
  $('content').hidden = false
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
      return row
    }),
  )
  $('release').replaceChildren(
    new Option('Select a complete release', ''),
    ...state.releases.map((r) => new Option(r.id, r.id)),
  )
  $('current-release').textContent =
    `Current release: ${state.release_id ?? 'None yet'}`
  $('history').replaceChildren(
    ...state.audit.map((a) => {
      const item = text('li', `${a.action} · ${a.created_at} · ${a.reviewer}`)
      item.append(text('p', a.reason))
      return item
    }),
  )
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
          if (c.notification !== 'sent') {
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
    document.querySelectorAll('button').forEach((b) => (b.disabled = false))
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
  void save('publish', {
    releaseId: $('release').value,
    reason: $('release-reason').value,
  })
}
void load().catch((e) => {
  $('notice').textContent = e.message
})
