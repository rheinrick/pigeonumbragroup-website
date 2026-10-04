import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parse} from 'jsonc-parser'
import {Miniflare,convertV4MiniflareOptions} from 'miniflare'
// Exercise the actual workerd fetch implementation; Node mocks cannot catch
// runtime invocation/context restrictions or Worker RequestInit behavior.
test('protected Baby endpoint performs public fetches inside the Workers runtime', {timeout:60000}, async()=>{
 const config=parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'),[],{allowTrailingComma:true})
 const calls=[]
 const mf=new Miniflare(convertV4MiniflareOptions({telemetry:{enabled:false},workers:[{
  name:'admin-fixture',modules:[{type:'ESModule',path:new URL('../worker/index.js',import.meta.url).pathname,contents:readFileSync(new URL('../worker/index.js',import.meta.url),'utf8')},{type:'ESModule',path:new URL('../worker/baby-horoscope.js',import.meta.url).pathname,contents:readFileSync(new URL('../worker/baby-horoscope.js',import.meta.url),'utf8')}],
  compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,
  serviceBindings:{DATACENTER:()=>Response.json({reviewer:'fixture@example.test',role:'owner'})},
  outboundService:request=>{
   calls.push(request.url)
   assert.equal(request.headers.get('Cf-Access-Jwt-Assertion'),null)
   assert.equal(request.headers.get('Cookie'),null)
   const url=new URL(request.url)
   assert.ok(['https://horoscope.baby','https://baby-horoscope-staging.rheinrick.workers.dev'].includes(url.origin))
   if(url.pathname==='/release.json') return Response.json({version:'9d47688af22c6965',revision:'50a23cc5a1dcd36be562b79facb266a23c2909ae',dirty:false,releaseMode:'beta',indexing:'disabled',canonicalOrigin:'https://horoscope.baby',profileSchemaVersion:1})
   assert.equal(url.pathname,'/reading-manifest.json')
   return Response.json({schemaVersion:1,entries:[{path:'/readings/2026-10-03.1/born/aries/a-fresh-little-page',sign:'Aries'}]})
  },
 }]}))
 try {
  assert.equal((await mf.dispatchFetch('https://admin.pigeonumbragroup.com/api/admin/baby-horoscope/overview')).status,403)
  assert.equal(calls.length,0)
  const response=await mf.dispatchFetch('https://admin.pigeonumbragroup.com/api/admin/baby-horoscope/overview',{headers:{'Cf-Access-Jwt-Assertion':'fixture-session'}})
  assert.equal(response.status,200)
  const data=await response.json()
  assert.ok(data.surfaces.every(surface=>surface.status==='observed'),JSON.stringify(data.surfaces))
  assert.equal(calls.length,4)
 } finally {await mf.dispose()}
})
