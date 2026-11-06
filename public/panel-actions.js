import { node } from './records.js'

// These panels share one write/read cycle; retries only read, never repeat writes.
export function panelActions(box, endpoint, label, title, render) {
  const notice = node('p'), refresh = node('button', 'Refresh ' + label), content = node('div')
  notice.setAttribute('role', 'status')
  notice.setAttribute('aria-live', 'polite')
  refresh.type = 'button'
  box.replaceChildren(node('h2', title), notice, refresh, content)
  let saving = false, loading = false, refreshRequired = false, outcome = ''
  const disabled = new Map()
  function controls() {
    const locked = saving || loading || refreshRequired
    for (const input of content.querySelectorAll('button,input,select,textarea')) {
      if (locked) {
        if (!disabled.has(input)) disabled.set(input, input.disabled)
        input.disabled = true
      } else if (disabled.has(input)) {
        input.disabled = disabled.get(input)
        disabled.delete(input)
      }
    }
    refresh.disabled = saving || loading
    refresh.textContent = (refreshRequired ? 'Retry ' : 'Refresh ') + label
    box.setAttribute('aria-busy', String(saving || loading))
  }
  async function request(path, payload) {
    const response = await fetch(endpoint + path, {
      cache: 'no-store',
      ...(payload === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const error = Error(data?.error || label + ' is unavailable. Retry loading.')
      error.status = response.status
      throw error
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('The response could not be verified.')
    return data
  }
  function failure(message) {
    return outcome === 'saved'
      ? 'Saved, but status could not refresh. Retry loading before another change.'
      : outcome === 'uncertain'
        ? 'Could not confirm whether the change was saved. Retry loading before another change.'
        : message
  }
  async function load() {
    if (loading) return false
    loading = true; controls()
    try {
      const data = await request('state')
      const next = render(data)
      content.replaceChildren(next)
      disabled.clear(); refreshRequired = false; outcome = ''
      notice.textContent = 'Status refreshed. Review the current state before making another change.'
      return true
    } catch (error) {
      refreshRequired = true
      notice.textContent = failure(error.message)
      return false
    } finally { loading = false; controls() }
  }
  async function save(path, payload, done = 'Saved. Status refreshed.') {
    if (saving || loading || refreshRequired) return
    saving = true; outcome = ''; notice.textContent = 'Saving…'; controls()
    try {
      await request(path, payload)
      outcome = 'saved'; refreshRequired = true
      if (await load()) notice.textContent = done
    } catch (error) {
      refreshRequired = !error.status || error.status === 409 || error.status >= 500
      if (!error.status || error.status >= 500) outcome = 'uncertain'
      notice.textContent = failure(error.message)
    } finally { saving = false; controls() }
  }
  refresh.onclick = () => { if (!saving) void load() }
  return { load, save, notice }
}
