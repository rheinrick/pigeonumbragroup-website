import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
const base='https://admin.pigeonumbragroup.com'
function fixture(role='owner') {
  const calls=[]
  const env={DATACENTER:{fetch:async request=>{
    const path=new URL(request.url).pathname
    calls.push({path,method:request.method,assertion:request.headers.get('Cf-Access-Jwt-Assertion'),origin:request.headers.get('Origin'),body:request.method==='POST'?await request.text():null})
    return path==='/api/admin/session'?Response.json({reviewer:'synthetic@example.test',role}):Response.json({saved:true,canWrite:role!=='readonly'})
  }}}
  const request=(path='/state',payload,overrides={})=>new Request(base+'/api/admin/dread'+path,{method:payload===undefined?'GET':'POST',headers:{'Cf-Access-Jwt-Assertion':'signed-fixture',...(payload===undefined?{}:{Origin:base,'Content-Type':'application/json'}),...overrides.headers},...(payload===undefined?{}:{body:JSON.stringify(payload)}),...Object.fromEntries(Object.entries(overrides).filter(([key])=>key!=='headers'))})
  return {env,calls,request}
}
test('owner and admin use the verified DataCenter binding for Dread reads and reviewed mutations',async()=>{
  for(const role of ['owner','admin']) {
    const {env,calls,request}=fixture(role)
    for(const path of ['','/state'])assert.equal((await worker.fetch(request(path),env)).status,200)
    for(const path of ['/layer','/domain','/publish']) {
      const payload={id:'fixture',expectedRevision:3,reason:'Reviewed synthetic change'}
      const result=await worker.fetch(request(path,payload),env)
      assert.equal(result.status,200)
      assert.equal(result.headers.get('Cache-Control'),'no-store')
      assert.equal(result.headers.get('X-Robots-Tag'),'noindex, nofollow')
      assert.deepEqual(calls.at(-1),{path:'/api/admin/dread'+path,method:'POST',assertion:'signed-fixture',origin:base,body:JSON.stringify(payload)})
    }
  }
})
test('readonly Dread reads work while mutations stop before downstream execution',async()=>{
  const {env,calls,request}=fixture('readonly')
  assert.equal((await worker.fetch(request('/state'),env)).status,200)
  for(const path of ['/layer','/domain','/publish'])assert.equal((await worker.fetch(request(path,{expectedRevision:0}),env)).status,403)
  assert.equal(calls.filter(call=>call.method==='POST').length,0)
})
test('unverified, moderator and editor requests cannot access Dread administration',async()=>{
  for(const role of ['moderator','editor',undefined]) {
    const {env,calls,request}=fixture(role??'unknown')
    assert.equal((await worker.fetch(request(),env)).status,403)
    assert.equal(calls.length,1)
  }
  const {env,calls,request}=fixture()
  env.DATACENTER.fetch=async()=>new Response('Rejected Access signature',{status:403})
  assert.equal((await worker.fetch(request(),env)).status,403)
  assert.equal(calls.length,0)
  assert.equal((await worker.fetch(new Request(base+'/api/admin/dread'),env)).status,403)
})
test('Dread proxy rejects cross-origin writes, unknown routes and incorrect methods',async()=>{
  const {env,calls,request}=fixture()
  assert.equal((await worker.fetch(request('/publish',{}, {headers:{Origin:'https://evil.example'}}),env)).status,403)
  assert.equal(calls.length,0)
  assert.equal((await worker.fetch(request('/delete-everything',{}),env)).status,404)
  assert.equal((await worker.fetch(request('/layer'),env)).status,405)
  assert.equal((await worker.fetch(request('/state',{}),env)).status,405)
  assert.equal(calls.filter(call=>call.path!=='/api/admin/session').length,0)
})
