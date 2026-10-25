import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
const base = 'https://admin.pigeonumbragroup.com'
test('Facebook routes require owner/admin, verified Access, correct methods and same origin', async () => {
  for (const role of ['owner', 'admin', 'readonly', 'editor', 'moderator']) {
    const calls = []
    const env = { DATACENTER: { fetch: async request => {
      const path = new URL(request.url).pathname
      if (path === '/api/admin/session') return Response.json({ role, reviewer: 'synthetic@example.test' })
      calls.push(request)
      return Response.json({ ok: true })
    } } }
    const request = (action, method = 'POST', origin = base) => new Request(base + '/api/admin/social/' + action, {
      method, headers: { 'Cf-Access-Jwt-Assertion': 'synthetic', Origin: origin, 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify({ reason: 'Reviewed fixture action' }) } : {}),
    })
    for (const action of ['state', 'scan', 'verify', 'pause', 'create', 'post']) {
      const r = await worker.fetch(request(action, action === 'state' ? 'GET' : 'POST'), env)
      assert.equal(r.status, ['owner', 'admin'].includes(role) ? 200 : 403)
      assert.equal(r.headers.get('Cache-Control'), 'no-store')
    }
    if (['owner','admin'].includes(role)) {
      assert.equal((await worker.fetch(request('state?channel=data-facebook','GET'),env)).status,200)
      assert.equal(new URL(calls.at(-1).url).searchParams.get('channel'),'data-facebook')
    }
    const before = calls.length
    assert.equal((await worker.fetch(request('pause', 'POST', 'https://evil.test'), env)).status, 403)
    assert.equal((await worker.fetch(request('delete'), env)).status, 404)
    if (['owner', 'admin'].includes(role)) {
      assert.equal((await worker.fetch(request('post', 'GET'), env)).status, 405)
      assert.equal((await worker.fetch(request('state', 'POST'), env)).status, 405)
    }
    assert.equal(calls.length, before)
  }
  assert.equal((await worker.fetch(new Request(base + '/api/admin/social/state'), {})).status, 403)
})
