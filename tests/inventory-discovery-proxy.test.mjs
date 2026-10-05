import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
const base = 'https://admin.pigeonumbragroup.com'
function fixture(role = 'owner') {
  const calls = []
  const env = {DATACENTER:{fetch:async request => {
    const path = new URL(request.url).pathname
    calls.push({path,method:request.method,assertion:request.headers.get('Cf-Access-Jwt-Assertion'),origin:request.headers.get('Origin'),body:request.method==='POST'?await request.text():null})
    return path === '/api/admin/session' ? Response.json({reviewer:'fixture@example.test',role}) : Response.json({ok:true})
  }}}
  const request = (suffix='',method='GET',payload,extra={}) => new Request(base+'/api/admin/inventory-discovery'+suffix,{method,headers:{'Cf-Access-Jwt-Assertion':'signed-fixture',...(method==='POST'?{'Content-Type':'application/json',Origin:base}:{}),...extra},...(payload?{body:JSON.stringify(payload)}:{})})
  return {calls,env,request}
}
test('owner and admin discovery delegation preserves exact review and import bodies', async () => {
  for (const role of ['owner','admin']) {
    const {calls,env,request} = fixture(role)
    for (const suffix of ['','-export']) {
      const response = await worker.fetch(request(suffix),env)
      assert.equal(response.status,200)
      assert.equal(response.headers.get('Cache-Control'),'no-store')
    }
    for (const suffix of ['-review','-import']) {
      const payload = {expectedRevision:8,id:'review-content-id',fingerprint:'content-hash',report:{schemaVersion:1},observationBase64:'e30='}
      assert.equal((await worker.fetch(request(suffix,'POST',payload),env)).status,200)
      assert.deepEqual(calls.at(-1),{path:'/api/admin/inventory-discovery'+suffix,method:'POST',assertion:'signed-fixture',origin:base,body:JSON.stringify(payload)})
    }
  }
})
test('readonly can read discovery and ledger but never execute mutations', async () => {
  const {calls,env,request} = fixture('readonly')
  for (const suffix of ['','-export']) assert.equal((await worker.fetch(request(suffix),env)).status,200)
  for (const suffix of ['-review','-import']) assert.equal((await worker.fetch(request(suffix,'POST',{}),env)).status,403)
  assert.equal(calls.filter(call=>call.method==='POST').length,0)
})
test('discovery denies other roles, unknown operations and method confusion before downstream action', async () => {
  for (const role of ['editor','moderator','unknown']) {
    const {calls,env,request} = fixture(role)
    assert.equal((await worker.fetch(request(),env)).status,403)
    assert.equal(calls.length,1)
  }
  const {calls,env,request} = fixture()
  for (const suffix of ['-publish','-delete','/anything']) assert.equal((await worker.fetch(request(suffix,'POST',{}),env)).status,404)
  for (const suffix of ['','-export']) assert.equal((await worker.fetch(request(suffix,'POST',{}),env)).status,405)
  for (const suffix of ['-review','-import']) assert.equal((await worker.fetch(request(suffix),env)).status,405)
  assert.equal(calls.filter(call=>call.path!=='/api/admin/session').length,0)
})
test('discovery needs verified Access and same-origin mutation before any write', async () => {
  const {calls,env,request} = fixture()
  assert.equal((await worker.fetch(new Request(base+'/api/admin/inventory-discovery'),env)).status,403)
  assert.equal((await worker.fetch(request('-review','POST',{}, {Origin:'https://evil.example'}),env)).status,403)
  assert.equal(calls.length,0)
  env.DATACENTER.fetch = async () => new Response('Invalid Access signature',{status:403})
  assert.equal((await worker.fetch(request(),env)).status,403)
})
