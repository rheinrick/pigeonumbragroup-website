const $ = id => document.getElementById(id)
const node = (tag, value) => { const el = document.createElement(tag); el.textContent = value; return el }
let current = null, role = '', dirty = false, busy = false, page = 1, hasMore = false
const canEdit = () => ['owner', 'admin', 'editor'].includes(role)
const canPublish = () => ['owner', 'admin'].includes(role)
function controls() {
  $('post-fields').disabled = busy || !canEdit()
  $('new-post').disabled = busy || !canEdit()
  $('publish-post').disabled = busy || !canPublish()
  $('unpublish-post').disabled = busy || !canPublish() || !current?.isPublished
  $('reload-posts').disabled = busy
  $('prev-posts').disabled = busy || page <= 1
  $('next-posts').disabled = busy || !hasMore
  document.querySelectorAll('[data-edit-post]').forEach(button => { button.disabled = busy })
}
async function api(query = '', payload) {
  const response = await fetch(`/api/admin/drlogico/posts${query}`, payload ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : { cache: 'no-store' })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw Error(result.error || 'Blog administration is unavailable. Check your sign-in and blog connection.')
  return result
}
function fill(post = null) {
  current = post; dirty = false
  delete $('post-slug').dataset.manual
  $('editor-title').textContent = post ? 'Edit post' : 'New post'
  for (const key of ['title', 'slug', 'excerpt', 'category', 'body']) $(`post-${key}`).value = post?.[key] || (key === 'category' ? 'Notes' : '')
  $('post-tags').value = post?.tags.join(', ') || ''
  $('post-slug').readOnly = Boolean(post)
  $('post-state').textContent = post?.isPublished ? (post.hasUnpublishedChanges ? 'Published · Draft has unpublished edits' : 'Published · Up to date') : 'Draft — not public'
  $('view-post').hidden = !post?.isPublished
  if (post?.isPublished) $('view-post').href = `https://drlogico.com/blog/${encodeURIComponent(post.slug)}/`
  $('preview').hidden = true
  controls()
}
const discard = () => !dirty || window.confirm('Discard your unsaved edits?')
async function loadList() {
  const result = await api(`?page=${page}`)
  role = result.role; hasMore = result.hasMore
  $('page-number').textContent = `Page ${page}`
  $('post-list').replaceChildren(...(result.posts.length ? result.posts.map(post => {
    const article = node('article', ''), detail = node('div', '')
    detail.append(node('h3', post.title), node('p', `${post.isPublished ? 'Published' : 'Draft'}${post.hasUnpublishedChanges ? ' · Unpublished edits' : ''} · ${post.category}`), node('small', `/blog/${post.slug}/`))
    const edit = node('button', 'Open'); edit.type = 'button'; edit.dataset.editPost = post.id
    edit.onclick = () => openPost(post.id)
    article.append(detail, edit); return article
  }) : [node('p', 'No posts here yet. Start with a new draft.')]))
  controls()
}
async function openPost(id) {
  if (busy || !discard()) return
  busy = true; controls()
  try { const result = await api(`?id=${encodeURIComponent(id)}`); role = result.role; fill(result.post); $('blog-notice').textContent = 'Saved post loaded.' }
  catch (error) { $('blog-notice').textContent = error.message }
  finally { busy = false; controls() }
}
$('new-post').onclick = () => { if (discard()) { fill(); $('post-title').focus() } }
$('post-form').oninput = () => { dirty = true }
$('post-title').addEventListener('input', () => {
  if (!current && !$('post-slug').dataset.manual) $('post-slug').value = $('post-title').value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '')
})
$('post-slug').addEventListener('input', () => { $('post-slug').dataset.manual = 'true' })
$('post-form').onsubmit = async event => {
  event.preventDefault(); if (busy) return
  const action = event.submitter?.value || 'save'
  const payload = { action, ...(current && { id: current.id, revision: current.revision }) }
  for (const key of ['title', 'slug', 'excerpt', 'category', 'body']) payload[key] = $(`post-${key}`).value
  payload.tags = $('post-tags').value.split(',').map(tag => tag.trim()).filter(Boolean)
  busy = true; controls()
  try {
    const result = await api('', payload); role = result.role; fill(result.post)
    const message = action === 'publish' ? 'Published. The post is now public.' : action === 'unpublish' ? 'Unpublished. The draft is saved and the public post is offline.' : 'Draft saved. The public version has not changed.'
    $('blog-notice').textContent = message
    try { await loadList() } catch { $('blog-notice').textContent = `${message} The list could not refresh; reload the list when ready.` }
  } catch (error) { $('blog-notice').textContent = error.message }
  finally { busy = false; controls() }
}
$('preview-post').onclick = () => {
  $('preview-title').textContent = $('post-title').value
  $('preview-meta').textContent = `${$('post-category').value} / ${$('post-tags').value}`
  $('preview-excerpt').textContent = $('post-excerpt').value
  $('preview-body').textContent = $('post-body').value
  $('preview').hidden = false; $('preview').scrollIntoView({ behavior: 'smooth', block: 'start' })
}
async function reload(nextPage = page) {
  if (busy) return
  const previous = page; page = nextPage; busy = true; controls()
  try { await loadList(); $('blog-notice').textContent = 'Post list refreshed.' }
  catch (error) { page = previous; $('blog-notice').textContent = error.message }
  finally { busy = false; controls() }
}
$('reload-posts').onclick = () => reload()
$('prev-posts').onclick = () => reload(page - 1)
$('next-posts').onclick = () => reload(page + 1)
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = '' } })
await reload()
