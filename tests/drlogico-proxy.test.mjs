import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'

test('DrLoGiCo requests require verified identity and delegate only to its own service', async () => {
  const seen = []
  const env = {
    DATACENTER: { fetch: async req => { seen.push(new URL(req.url).pathname); return Response.json({ reviewer: 'synthetic@example.test', role: 'owner' }) } },
    DRLOGICO: { fetch: async req => { seen.push('blog:' + new URL(req.url).pathname); return Response.json({ posts: [] }) } },
  }
  const req = new Request('https://admin.pigeonumbragroup.com/api/admin/drlogico/posts', { headers: { 'Cf-Access-Jwt-Assertion': 'synthetic' } })
  const result = await worker.fetch(req, env)
  assert.equal(result.status, 200)
  assert.equal(result.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(seen, ['/api/admin/session', 'blog:/api/admin/drlogico/posts'])
  env.DATACENTER.fetch = async () => new Response('Denied', { status: 403 })
  assert.equal((await worker.fetch(req, env)).status, 403)
  assert.equal(seen.length, 2)
})

test('DrLoGiCo missing service fails closed and unknown routes are not delegated', async () => {
  const env = { DATACENTER: { fetch: async () => Response.json({ reviewer: 'synthetic@example.test' }) } }
  const req = path => new Request('https://admin.pigeonumbragroup.com' + path, { headers: { 'Cf-Access-Jwt-Assertion': 'synthetic' } })
  assert.equal((await worker.fetch(req('/api/admin/drlogico/posts'), env)).status, 503)
  assert.equal((await worker.fetch(req('/api/admin/drlogico/delete-everything'), env)).status, 404)
})


test('blog writes preserve identity and body, reject cross-origin and unsupported methods', async () => {
  const writes = []
  const env = {
    DATACENTER: { fetch: async () => Response.json({ reviewer: 'synthetic@example.test', role: 'owner' }) },
    DRLOGICO: { fetch: async request => { writes.push({ method: request.method, jwt: request.headers.get('Cf-Access-Jwt-Assertion'), body: await request.text() }); return Response.json({ saved: true }) } },
  }
  const send = (method, origin = 'https://admin.pigeonumbragroup.com') => worker.fetch(new Request('https://admin.pigeonumbragroup.com/api/admin/drlogico/posts', { method, headers: { Origin: origin, 'Cf-Access-Jwt-Assertion': 'synthetic', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', revision: 2 }) }), env)
  assert.equal((await send('POST', 'https://other.example')).status, 403)
  assert.equal((await send('PUT')).status, 405)
  assert.equal(writes.length, 0)
  assert.equal((await send('POST')).status, 200)
  assert.deepEqual(writes, [{ method: 'POST', jwt: 'synthetic', body: '{"action":"save","revision":2}' }])
})
