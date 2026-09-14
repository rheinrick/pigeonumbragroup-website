import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'

test('public landing and its media do not call admin services', async () => {
  const paths = []
  const env = {
    ASSETS: { fetch: async req => { paths.push(new URL(req.url).pathname); return new Response('public') } },
    DATACENTER: { fetch: () => { throw Error('Public page must be independent') } },
  }
  for (const host of ['pigeonumbragroup.com', 'www.pigeonumbragroup.com', '127.0.0.1']) {
    const response = await worker.fetch(new Request(`https://${host}/`), env)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('X-Robots-Tag'), null)
    assert.match(response.headers.get('Content-Security-Policy'), /media-src 'self'/)
  }
  assert.deepEqual(paths, ['/landing/', '/landing/', '/landing/'])
  assert.equal((await worker.fetch(new Request('https://pigeonumbragroup.com/landing/media/pigeons-v1.mp4'), env)).status, 200)
  assert.equal((await worker.fetch(new Request('https://pigeonumbragroup.com/', {method:'HEAD'}), env)).body, null)
})

test('public hostname cannot expose admin files, APIs, or arbitrary landing assets', async () => {
  const env = { ASSETS: { fetch: () => { throw Error('Must not read private files') } } }
  for (const path of ['/index.html','/admin.js','/api/admin/session','/landing/private.json','/landing/../admin.js']) {
    assert.equal((await worker.fetch(new Request('https://pigeonumbragroup.com'+path), env)).status, 404)
  }
  assert.equal((await worker.fetch(new Request('https://pigeonumbragroup.com/', {method:'POST'}), env)).status,405)
  for (const host of ['admin.pigeonumbragroup.com','untrusted.example']) {
    assert.equal((await worker.fetch(new Request(`https://${host}/`),env)).status,403)
    assert.equal((await worker.fetch(new Request(`https://${host}/landing/motion.js`),env)).status,403)
  }
})

test('standalone public deployment has no admin routing or service binding', async () => {
  const { default: publicWorker } = await import('../worker/public.js')
  const { readFileSync } = await import('node:fs')
  const config = JSON.parse(readFileSync(new URL('../wrangler.public.jsonc', import.meta.url)))
  assert.equal(config.services, undefined)
  assert.equal(config.assets.directory, './dist-public')
  assert.deepEqual(config.routes.map(r => r.pattern), ['pigeonumbragroup.com/*', 'www.pigeonumbragroup.com/*'])
  const env = { ASSETS: { fetch: async () => new Response('public') } }
  assert.equal((await publicWorker.fetch(new Request('https://pigeonumbragroup.com/'), env)).status, 200)
  for (const url of ['https://admin.pigeonumbragroup.com/', 'https://pigeonumbragroup.com/api/admin/state', 'http://localhost/admin.js'])
    assert.equal((await publicWorker.fetch(new Request(url), env)).status, 404)
})
