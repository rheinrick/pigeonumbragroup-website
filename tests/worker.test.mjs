import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
test('central console never serves assets without a verified backend identity', async () => {
  let assets = 0
  const env = {
    ASSETS: {
      fetch: async () => {
        assets++
        return new Response('console')
      },
    },
    DATACENTER: { fetch: async () => new Response('Denied', { status: 403 }) },
  }
  assert.equal(
    (
      await worker.fetch(
        new Request('https://admin.pigeonumbragroup.com/'),
        env,
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await worker.fetch(
        new Request('https://admin.pigeonumbragroup.com/', {
          headers: { 'Cf-Access-Jwt-Assertion': 'forged' },
        }),
        env,
      )
    ).status,
    403,
  )
  assert.equal(assets, 0)
  env.DATACENTER.fetch = async () =>
    Response.json({ reviewer: 'test@example.test' })
  assert.equal(
    (
      await worker.fetch(
        new Request('https://admin.pigeonumbragroup.com/', {
          headers: { 'Cf-Access-Jwt-Assertion': 'verified-test' },
        }),
        env,
      )
    ).status,
    200,
  )
  assert.equal(assets, 1)
})
test('cross-origin mutations are rejected before delegation', async () => {
  const env = {
    DATACENTER: {
      fetch: () => {
        throw Error('must not be called')
      },
    },
  }
  assert.equal(
    (
      await worker.fetch(
        new Request('https://admin.pigeonumbragroup.com/api/admin/decision', {
          method: 'POST',
          headers: {
            'Cf-Access-Jwt-Assertion': 'test',
            Origin: 'https://other.test',
          },
        }),
        env,
      )
    ).status,
    403,
  )
})

test('intelligence admin uses the existing verified proxy and rejects unknown operations',async()=>{
 const seen=[];const env={DATACENTER:{fetch:async req=>{seen.push(new URL(req.url).pathname);return Response.json({reviewer:'fixture@example.test',role:'owner'})}}};
 const req=path=>new Request('https://admin.pigeonumbragroup.com/api/admin/intelligence/'+path,{headers:{'Cf-Access-Jwt-Assertion':'signed-fixture'}});
 assert.equal((await worker.fetch(req('state'),env)).status,200);
 assert.deepEqual(seen,['/api/admin/session','/api/admin/intelligence/state']);
 assert.equal((await worker.fetch(req('rollback'),env)).status,200);
 assert.equal((await worker.fetch(req('delete-everything'),env)).status,404);
 env.DATACENTER.fetch=async()=>new Response('Denied',{status:403});
 assert.equal((await worker.fetch(req('state'),env)).status,403);
})
