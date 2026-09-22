import { node, recordTable, expandableRow, statusLabel, displayDate } from './records.js'

export function setupUsers(state) {
  const $ = (id) => document.getElementById(id)
  const panel = $('users')
  panel.hidden = !['owner', 'admin'].includes(state.role)
  if (panel.hidden || panel.dataset.ready) return
  panel.dataset.ready = 'true'
  let version = 0, cursor = null, loaded = 0, table, filters

  async function load(append = false) {
    const requestVersion = ++version
    if (!append) {
      filters = new URLSearchParams({ q: $('users-query').value.trim(), status: $('users-status').value })
      loaded = 0
      cursor = null
      table = recordTable('Registered users', ['Display name', 'Email', 'Status', 'Registered', 'Details'])
      $('users-results').replaceChildren()
    }
    const params = new URLSearchParams(filters)
    if (append && cursor) params.set('after', cursor)
    $('users-more').disabled = true
    $('users-notice').textContent = 'Loading registered users…'
    try {
      const response = await fetch(`/api/admin/community/users?${params}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw Error(data.error ?? 'Could not load registered users. Try searching again.')
      if (requestVersion !== version) return
      if (!data.canViewEmails) throw Error('Email details are not available from the current backend.')
      for (const user of data.items) {
        const details = node('dl')
        details.className = 'user-details'
        for (const [label, value] of [
          ['Account ID', user.id],
          ['Email verification', user.status === 'deleted' ? 'Not applicable' : user.emailVerified ? 'Verified' : 'Unverified'],
          ['Last sign-in', displayDate(user.last_login_at)],
          ['Last updated', displayDate(user.updatedAt)],
          ['Comments', user.comment_count],
        ]) details.append(node('dt', label), node('dd', value))
        table.add(...expandableRow(
          [user.name, user.status === 'deleted' ? 'Removed' : user.email, statusLabel(user.status), displayDate(user.createdAt)],
          'View details', details,
        ))
      }
      loaded += data.items.length
      cursor = data.next
      $('users-results').replaceChildren(loaded ? table.wrap : node('p', 'No registered users match these filters.'))
      const matching = filters.get('q') || filters.get('status') ? ' matching your filters' : ''
      $('users-notice').textContent = `Showing ${loaded} of ${data.total} registered users${matching}.`
    } catch (error) {
      if (requestVersion === version) $('users-notice').textContent = error.message
    } finally {
      if (requestVersion === version) {
        $('users-more').hidden = !cursor
        $('users-more').disabled = false
      }
    }
  }
  $('users-search').onsubmit = (event) => { event.preventDefault(); void load() }
  $('users-reset').onclick = () => { $('users-search').reset(); void load() }
  $('users-more').onclick = () => void load(true)
  void load()
}
