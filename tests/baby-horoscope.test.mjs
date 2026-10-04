import {test} from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
import {babyOverview,origins} from '../worker/baby-horoscope.js'
const release = {version:'9d47688af22c6965',revision:'50a23cc5a1dcd36be562b79facb266a23c2909ae',dirty:false,releaseMode:'beta',indexing:'disabled',canonicalOrigin:origins[0],profileSchemaVersion:1,privateProfile:'must-not-return',files:['must-not-return']}
const catalog = {schemaVersion:1,entries:[{path:'/readings/2026-10-03.1/born/aries/a-fresh-little-page',sign:'Aries',body:'must-not-return',profile:'must-not-return'}]}
const publicFetcher = async url=>Response.json(url.endsWith('/release.json') ? release : catalog)
const req=(path='/overview',method='GET',signed=true)=>new Request('https://admin.pigeonumbragroup.com/api/admin/baby-horoscope'+path,{method,headers:{...(signed?{'Cf-Access-Jwt-Assertion':'signed-fixture'}:{}),Origin:'https://admin.pigeonumbragroup.com'}})
const env=role=>({DATACENTER:{fetch:async()=>Response.json({reviewer:'fixture@example.test',role})},ASSETS:{fetch:()=>{throw Error('No assets on this API')}}})
test('Baby operations fail closed for anonymous, forged and unavailable identities',async()=>{
 assert.equal((await worker.fetch(req('/overview','GET',false),env('owner'))).status,403)
 assert.equal((await worker.fetch(req(),{DATACENTER:{fetch:async()=>new Response('denied',{status:403})}})).status,403)
 assert.equal((await worker.fetch(req(),{DATACENTER:{fetch:()=>{throw Error('offline')}}})).status,503)
})
test('operations roles are narrow and all writes/unknown operations/query inputs denied',async()=>{
 for(const role of ['editor','moderator',undefined,'unknown']) assert.equal((await worker.fetch(req(),env(role))).status,403)
 for(const method of ['POST','PUT','DELETE']) assert.equal((await worker.fetch(req('/overview',method),env('owner'))).status,405)
 for(const path of ['/publish','/profile','/overview/','']) assert.equal((await worker.fetch(req(path),env('owner'))).status,404)
 assert.equal((await worker.fetch(req('/overview?url=https://internal.test'),env('owner'))).status,400)
})
test('owner/admin/readonly requests receive only fixed public facts and no auth forwarding',async()=>{
 const previous=globalThis.fetch;const calls=[]
 globalThis.fetch=async(url,init)=>{calls.push([url,init]);return publicFetcher(url)}
 try {
  for(const role of ['owner','admin','readonly']) {
   const response=await worker.fetch(req(),env(role));assert.equal(response.status,200)
   assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow')
   const data=await response.json();assert.equal(data.surfaces[0].status,'observed')
   assert.equal(JSON.stringify(data).includes('must-not-return'),false)
  }
  assert.equal(calls.length,12)
  for(const [url,init] of calls) {
   assert.ok(origins.some(origin=>url === origin+'/release.json' || url === origin+'/reading-manifest.json'))
   assert.deepEqual(init.headers,{Accept:'application/json'});assert.equal(init.redirect,'error');assert.ok(init.signal)
  }
 } finally {globalThis.fetch=previous}
})
test('staging reports its own artifact with the shared canonical origin',async()=>{
 const data=await babyOverview(publicFetcher)
 assert.equal(data.surfaces[1].status,'observed');assert.equal(data.surfaces[0].catalog.entries,1)
 assert.deepEqual(data.surfaces[0].catalog,{entries:1,editions:['2026-10-03.1'],signs:['Aries'],stages:['born']})
})
test('public failures are isolated and never expose raw error bodies',async()=>{
 const data=await babyOverview(async url=>url.startsWith(origins[1]) ? new Response('private error',{status:500}) : publicFetcher(url))
 assert.equal(data.surfaces[0].status,'observed');assert.equal(data.surfaces[1].status,'unavailable')
 assert.equal(data.surfaces[1].release,null);assert.equal(JSON.stringify(data).includes('private error'),false)
})
test('invalid release contracts cannot be labelled verified',async()=>{
 for(const patch of [{revision:'<script>'},{version:123},{canonicalOrigin:'https://evil.test'},{dirty:'false'},{indexing:'unknown'},{profileSchemaVersion:0}]) {
  const data=await babyOverview(async url=>Response.json(url.endsWith('/release.json')?{...release,...patch}:catalog))
  assert.equal(data.surfaces[0].release,null);assert.equal(data.surfaces[0].status,'unavailable')
 }
})
test('catalog duplicates, bad stage/sign/path and empty contents are rejected',async()=>{
 for(const entries of [[],[catalog.entries[0],catalog.entries[0]],[{path:'/profile/private',sign:'Aries'}],[{...catalog.entries[0],sign:'<img>'}],[{...catalog.entries[0],sign:'Taurus'}]]) {
  const data=await babyOverview(async url=>Response.json(url.endsWith('/release.json')?release:{schemaVersion:1,entries}))
  assert.equal(data.surfaces[0].catalog,null)
 }
})
test('JSON body size is bounded even when Content-Length is missing or lies',async()=>{
 for(const declared of [null,'999999']) {
  const data=await babyOverview(async()=>new Response(' '.repeat(512*1024+1),{headers:{'Content-Type':'application/json',...(declared?{'Content-Length':declared}:{})}}))
  assert.equal(data.surfaces[0].status,'unavailable')
 }
})
test('unexpected HTML, malformed JSON, redirects and aborted requests remain unavailable',async()=>{
 for(const fetcher of [async()=>new Response('<html>'),async()=>new Response('{',{headers:{'Content-Type':'application/json'}}),async()=>new Response('',{status:302}),async()=>{throw new DOMException('timeout','TimeoutError')}]) {
  const data=await babyOverview(fetcher);assert.ok(data.surfaces.every(surface=>surface.status==='unavailable'))
 }
})
