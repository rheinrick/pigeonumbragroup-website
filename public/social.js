const node = (tag, text = '') => Object.assign(document.createElement(tag), { textContent: text })
const date = value => value ? new Date(value).toLocaleString() : 'Never'
function field(parent, title, value = '', multiline = false) {
  const label = node('label', title), input = node(multiline ? 'textarea' : 'input')
  input.value = value
  input.required = true
  input.maxLength = multiline ? 4000 : 1000
  if (multiline) { input.rows = 7; input.minLength = 10 }
  label.append(input); parent.append(label)
  return input
}
function setupChannel(state, box, channelId) {
  if (!box) return
  box.hidden = !['owner', 'admin'].includes(state.role)
  if (box.hidden) return
  const title = channelId === 'data-facebook' ? 'DataCenterData Facebook' : 'DataCenterDread Facebook'
  const notice = node('p'); notice.setAttribute('role', 'alert')
  const retry = node('button', 'Retry loading'); retry.type = 'button'; retry.hidden = true
  retry.onclick = () => { if (!busy) void load() }
  let busy = false, loading = false, refreshRequired = false, controls = [], refresh
  box.replaceChildren(node('h2', title), notice, retry)
  function updateControls() {
    for (const { button, enabled } of controls) button.disabled = busy || loading || refreshRequired || !enabled()
    for (const input of box.querySelectorAll('input,textarea')) input.disabled = busy || loading
    if (refresh) refresh.disabled = busy || loading
    retry.disabled = busy || loading
    box.setAttribute('aria-busy', String(busy || loading))
  }
  async function request(path, payload) {
    const response = await fetch('/api/admin/social/' + path + '?channel=' + channelId, {
      cache: 'no-store',
      ...(payload ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const error = Error(data?.error || 'Facebook administration unavailable. Check your sign-in and retry loading.')
      error.status = response.status
      throw error
    }
    if (!data || typeof data !== 'object') throw Error('The Facebook administration response could not be verified.')
    return data
  }
  async function mutate(path, payload) {
    if (busy || loading || refreshRequired) return
    busy = true; notice.textContent = 'Saving…'; updateControls()
    try {
      await request(path, payload)
      refreshRequired = true
      const refreshed = await load()
      notice.textContent = refreshed ? 'Saved. Facebook status refreshed.' : 'Action saved, but status could not refresh. Retry loading before another action.'
    } catch (error) {
      refreshRequired = !error.status || error.status >= 500
      notice.textContent = refreshRequired ? 'Could not confirm whether the action was saved. Retry loading before another action.' : error.message
      retry.hidden = !refreshRequired
    } finally { busy = false; updateControls() }
  }
  async function load() {
    if (loading) return false
    loading = true; updateControls()
    try {
      const data = await request('state'), channel = data.channel
      if (!channel || !data.brand || !Array.isArray(data.posts)) throw Error('The Facebook administration response could not be verified.')
      controls = []; refreshRequired = false; retry.hidden = true; notice.textContent = ''
      box.replaceChildren(node('h2', title), node('p', data.automatic ? 'New reviewed facilities and status changes publish automatically at least ten minutes after they go live, checked every five minutes. Announcements are limited to one per hour. No post approval is needed. The first scan skips historical changes.' : 'Reviewed map changes become drafts. Approve each post here; the scheduled publisher sends at most one per hour. The first scan establishes a baseline without posting history.'))
      const status = node('p', `${channel.paused ? 'Paused' : 'Enabled'} · Draft generation ${data.draftsEnabled ? 'on' : 'off'} · Publishing ${data.publishingEnabled ? 'on' : 'off'}`)
      status.setAttribute('role', 'status'); box.append(status)
      box.append(node('p', `Page: ${channel.pageName || 'Not verified'}${data.pageId ? ' (' + data.pageId + ')' : ''} · ${channel.verified ? 'Identity verified' : 'Verification required'} · Last sent: ${date(channel.lastSentAt)}`))
      if (!data.configured) box.append(node('p', 'Connect the Facebook Page token and Page settings on the server before enabling publishing.'))
      if (!channel.initialized) box.append(node('p', 'Waiting for the first scan to establish the catalog baseline.'))
      box.append(notice, retry)
      const reason = field(box, 'Reason for this action')
      reason.minLength = 10; reason.maxLength = 500
      function button(parent, label, path, payload, enabled = true, fields = []) {
        const b = node('button', label); b.type = 'button'
        const eligible = typeof enabled === 'function' ? enabled : () => enabled
        controls.push({ button: b, enabled: eligible })
        b.onclick = async () => {
          if (busy || loading || refreshRequired || !eligible() || !reason.reportValidity() || fields.some(input => !input.reportValidity())) return
          await mutate(path, { ...payload(), reason: reason.value })
        }
        parent.append(b)
      }
      const toolbar = node('div')
      refresh = node('button', 'Refresh'); refresh.type = 'button'; refresh.onclick = () => { if (!busy) void load() }
      toolbar.append(refresh)
      button(toolbar, 'Scan for updates', 'scan', () => ({}), data.draftsEnabled)
      button(toolbar, 'Verify Facebook Page', 'verify', () => ({}), data.configured)
      button(toolbar, channel.paused ? (data.automatic ? 'Enable automatic posting' : 'Enable approved posts') : 'Pause publishing', 'pause', () => ({ paused: !channel.paused, expectedRevision: channel.revision }), !channel.paused || (data.publishingEnabled && channel.verified))
      box.append(toolbar)
      const create = node('details'); create.append(node('summary', data.automatic ? 'Queue a site announcement' : 'Draft a site announcement'))
      const newMessage = field(create, 'Announcement', '', true), newLink = field(create, 'Public site link', data.brand.origin + '/')
      button(create, data.automatic ? 'Queue announcement for publishing' : 'Save announcement draft', 'create', () => ({ expectedRevision: 0, message: newMessage.value, link: newLink.value }), true, [newMessage, newLink])
      box.append(create, node('h3', 'Recent posts'))
      if (!data.posts.length) box.append(node('p', 'No updates yet. New reviewed facilities and status changes will appear after the baseline scan.'))
      for (const post of data.posts) {
        const card = node('article'), title = node('h4', `${post.kind === 'catalog' ? 'Map update' : 'Announcement'} · ${post.status}`)
        card.append(title, node('p', `Created ${date(post.created_at)} · ${post.attempts} delivery attempts`))
        if (post.error) card.append(node('p', post.error.replaceAll('_', ' ')))
        if (!post.current && ['draft', 'approved', 'failed'].includes(post.status)) card.append(node('p', 'This draft belongs to an older catalog release. Review it and create a new announcement if still relevant.'))
        const message = field(card, 'Post text', post.message, true), link = field(card, 'Site link', post.link)
        const editable = ['draft', 'approved', 'failed'].includes(post.status)
        message.readOnly = !editable; link.readOnly = !editable
        const payload = action => ({ id: post.id, expectedRevision: post.revision, action })
        if (editable) button(card, 'Save changes (requires approval)', 'post', () => ({ ...payload('edit'), message: message.value, link: link.value }), true, [message, link])
        if (post.status === 'draft') {
          // Never approve text that differs from the visible preview.
          button(card, 'Approve saved draft', 'post', () => payload('approve'), () => post.current && post.attempts < 3 && message.value === post.message && link.value === post.link)
          message.addEventListener('input', updateControls); link.addEventListener('input', updateControls)
        }
        if (post.status === 'failed') button(card, 'Return to review', 'post', () => payload('retry'), post.current && post.attempts < 3)
        if (post.status === 'uncertain') {
          card.append(node('p', 'Facebook may have received this post. Publishing is blocked until you check the Page. Enter the existing Facebook post ID to record delivery, or dismiss after checking. This post will not be resent automatically.'))
          const receipt = field(card, 'Facebook post ID (pageId_postId)')
          button(card, 'Confirm existing Facebook post', 'post', () => ({ ...payload('reconcile'), postId: receipt.value }), true, [receipt])
        }
        if (['draft', 'approved', 'failed', 'uncertain'].includes(post.status)) button(card, 'Dismiss', 'post', () => payload('dismiss'))
        if (post.post_id) {
          const receipt = node('a', 'View Facebook post')
          receipt.href = 'https://www.facebook.com/' + encodeURIComponent(post.post_id)
          receipt.target = '_blank'; receipt.rel = 'noopener noreferrer'; card.append(receipt)
        }
        box.append(card)
      }
      return true
    } catch (error) {
      notice.textContent = error.message; retry.hidden = false
      return false
    } finally { loading = false; updateControls() }
  }
  void load()
}

export function setupSocial(state) {
  const parent = document.getElementById('social')
  if (!parent) return
  parent.hidden = !['owner', 'admin'].includes(state.role)
  parent.replaceChildren()
  if (parent.hidden) return
  for (const channelId of ['dread-facebook', 'data-facebook']) {
    const section = node('section'); parent.append(section)
    setupChannel(state, section, channelId)
  }
}
