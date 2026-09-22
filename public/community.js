import { recordTable, expandableRow, preview, statusLabel, displayDate } from './records.js'
const $ = (id) => document.getElementById(id)
const node = (tag, value) => {
  const el = document.createElement(tag)
  el.textContent = value
  return el
}
let current,
  cursor = null,
  kind = 'comments',
  requestVersion = 0,
  tableBody = null
async function api(path, payload) {
  const r = await fetch(`/api/admin/community/${path}`, {
    cache: 'no-store',
    ...(payload
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      : {}),
  })
  const data = await r.json()
  if (!r.ok) throw Error(data.error ?? 'Community request failed.')
  return data
}
function field(label, control) {
  control.setAttribute('aria-label', label)
  const el = node('label', label)
  el.append(control)
  return el
}
function actionForm(type, row, choices) {
  const form = document.createElement('form'),
    select = document.createElement('select'),
    reason = document.createElement('input'),
    button = node('button', 'Apply moderation')
  for (const [value, label] of choices) select.append(new Option(label, value))
  form.setAttribute('aria-label', type === 'report' ? 'Report resolution' : type === 'comment' ? 'Comment visibility' : 'Account status')
  reason.required = true
  reason.minLength = 3
  reason.maxLength = 1000
  form.append(
    field('Action', select),
    field('Moderation reason', reason),
    button,
  )
  form.onsubmit = async (e) => {
    e.preventDefault()
    button.disabled = true
    try {
      await api(type, {
        id: row.id,
        revision: row.revision,
        previousStatus: row.status,
        status: select.value,
        reason: reason.value,
      })
      $('community-notice').textContent = 'Saved and recorded in the audit log.'
      await load()
      $('community-notice').scrollIntoView({ block: 'nearest' })
    } catch (e) {
      $('community-notice').textContent = e.message
    } finally {
      button.disabled = false
    }
  }
  return form
}
async function thread(id, after = 0, append = false) {
  try {
    const data = await api(
        `thread?id=${encodeURIComponent(id)}&after=${after}`,
      ),
      box = $('thread-context')
    if (!append) box.replaceChildren(node('h3', 'Thread context'))
    for (const c of data.items) {
      const item = node('article', '')
      item.append(
        node('strong', `${c.author} · ${c.status}`),
        node('p', c.deleted_at ? 'Comment deleted by user.' : c.body),
        node('small', `${c.created_at} · ${c.id}`),
      )
      box.append(item)
    }
    if (data.next) {
      const more = node('button', 'More thread context')
      more.onclick = () => {
        more.remove()
        void thread(id, data.next, true)
      }
      box.append(more)
    }
  } catch (e) {
    $('community-notice').textContent = e.message
  }
}
function render(row, canModerate) {
  const item = document.createElement('article')
  if (kind === 'users') {
    item.append(
      node('h3', row.name),
      node(
        'p',
        `${row.status} · ${row.emailVerified ? 'verified email' : 'email unverified'} · ${row.comment_count} comments`,
      ),
      node(
        'small',
        `ID ${row.id} · Created ${new Date(row.createdAt).toLocaleString()}`,
      ),
    )
    const history = node('button', 'View comment history')
    history.onclick = () => {
      $('community-kind').value = 'comments'
      $('community-user').value = row.id
      void load()
    }
    item.append(history)
    if (canModerate && row.status !== 'deleted')
      item.append(
        actionForm('user', row, [
          ['suspended', 'Suspend account'],
          ['banned', 'Ban account'],
          ['active', 'Restore account'],
        ]),
      )
  } else {
    item.append(
      node(
        'h3',
        kind === 'reports'
          ? `${row.reason} · ${row.status}`
          : `${row.author} · ${row.status}`,
      ),
      node('p', row.deleted_at ? 'Comment deleted by user.' : row.body),
      node('small', `Facility ${row.facility_id} · ${row.created_at}`),
    )
    const context = node('button', 'Inspect thread')
    context.onclick = () =>
      void thread(kind === 'reports' ? row.comment_id : row.id)
    item.append(context)
    if (kind === 'reports') {
      item.append(
        node(
          'p',
          `Reporter: ${row.reporter} (${row.reporter_user_id}) · Author: ${row.author} (${row.author_id})`,
        ),
        node('p', row.details),
        node('p', row.resolution ?? 'No resolution yet.'),
        node('p', `Comment status: ${row.comment_status ?? 'Inspect thread for current status'}`),
      )
      if (canModerate && row.status === 'open')
        item.append(
          actionForm('report', row, [
            ['dismissed', 'Dismiss report'],
            ['resolved', 'Resolve report'],
          ]),
        )
      if (canModerate)
        item.append(
          actionForm(
            'comment',
            { id: row.comment_id, revision: row.comment_revision },
            [
              ['hidden', 'Hide reported comment'],
              ['removed', 'Remove reported comment'],
            ],
          ),
        )
    } else if (canModerate && !row.deleted_at)
      item.append(
        actionForm('comment', row, [
          ['hidden', 'Hide comment'],
          ['removed', 'Remove comment'],
          ['visible', 'Restore comment'],
        ]),
      )
  }
  return item
}
function compactRows(row, canModerate) {
  const facility = current.facilities?.find(f => f.id === row.facility_id)?.name ?? row.facility_id ?? '—'
  const values = kind === 'users'
    ? [row.name, row.comment_count, displayDate(row.createdAt), statusLabel(row.status)]
    : [preview(row.body || (row.deleted_at ? 'Comment deleted by user.' : 'No text')), kind === 'reports' ? row.reason : row.author, facility, displayDate(row.created_at), statusLabel(row.status)]
  return expandableRow(values, kind === 'reports' ? 'Review report' : kind === 'users' ? 'Review account' : 'Review comment', render(row, canModerate))
}
async function load(append = false) {
  const version = ++requestVersion
  try {
    kind = $('community-kind').value
    const params = new URLSearchParams({
      facility: $('community-facility').value,
      user: $('community-user').value,
      status: $('community-status').value,
      q: $('community-query').value,
    })
    if (append && cursor) params.set(kind === 'users' ? 'after' : 'before', cursor)
    const data = await api(`${kind}?${params}`)
    if (version !== requestVersion) return
    cursor = data.next
    if (!append || !tableBody) {
      const columns = kind === 'users'
        ? ['Account', 'Comments', 'Created', 'Status', 'Details']
        : ['Comment', kind === 'reports' ? 'Reason' : 'Author', 'Facility', 'Received', 'Status', 'Details']
      const table = recordTable(kind === 'reports' ? 'Reported comments' : kind === 'users' ? 'Community accounts' : 'Community comments', columns)
      tableBody = table
      $('community-results').replaceChildren(data.items.length ? table.wrap : node('p', 'No matching records.'))
      $('thread-context').replaceChildren()
    }
    for (const row of data.items) tableBody.add(...compactRows(row, data.canModerate))
    $('community-more').hidden = !cursor
  } catch (e) {
    if (version === requestVersion) $('community-notice').textContent = e.message
  }
}
export function setupCommunity(state) {
  if (current) return
  current = state
  const canRead = ['owner', 'admin', 'moderator', 'readonly'].includes(
    state.role,
  )
  $('community').hidden = !canRead
  if (!canRead) return
  for (const f of state.facilities ?? [])
    $('community-facility').append(new Option(f.name, f.id))
  $('community-search').onsubmit = (e) => {
    e.preventDefault()
    $('community-notice').textContent = ''
    void load()
  }
  $('community-kind').onchange = () => {
    $('community-status').value = ''
    void load()
  }
  $('community-more').onclick = () => void load(true)
  void load()
}
