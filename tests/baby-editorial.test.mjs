import {test} from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
const day='2026-10-23',sha256='a'.repeat(64)
const edition={day,version:day+'.10',focus:'A considered return',source:'assisted',entries:['born','expected'].flatMap(stage=>signs.map(sign=>({sign,stage,title:sign,body:'Fixture prose, not a publication acceptance.',prompt:'What fits today?'})))}
const payload={sha256,decision:null,reason:null,edition}
const review={target:'beta',day,sha256,decision:'rejected',reason:'Fixture review',reviewedEntries:24}
const req=(path,body,signed=true)=>new Request('https://admin.pigeonumbragroup.com/api/admin/baby-horoscope/'+path,{method:body?'POST':'GET',headers:{...(signed?{'Cf-Access-Jwt-Assertion':'fixture'}:{}),Origin:'https://admin.pigeonumbragroup.com','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
function environment(role='owner',result=payload){
 const calls=[]
 const binding={fetch:async request=>{calls.push(request);return Response.json(result)}}
 return {calls,env:{DATACENTER:{fetch:async()=>Response.json({reviewer:'fixture@example.test',role})},BABY_BETA:binding,BABY_STAGING:binding,BABY_EDITORIAL_OPS_KEY:'private-fixture-key'}}
}
test('editorial reads enforce existing identity and fixed service routing without forwarding browser identity',async()=>{
 for(const role of ['owner','admin','readonly']){
  const {env,calls}=environment(role);const response=await worker.fetch(req('candidate?target=staging&day='+day),env)
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store')
  const data=await response.json();assert.equal(data.canReview,role!=='readonly');assert.equal(data.edition.entries.length,24)
  assert.equal(calls[0].url,'https://baby-editorial.internal/api/ops/candidate?day='+day)
  assert.equal(calls[0].headers.get('authorization'),'Bearer private-fixture-key')
  assert.equal(calls[0].headers.has('Cf-Access-Jwt-Assertion'),false);assert.equal(calls[0].headers.has('cookie'),false)
  assert.equal(JSON.stringify(data).includes('private-fixture-key'),false)
 }
 const {env,calls}=environment();assert.equal((await worker.fetch(req('editorial?target=beta',null,false),env)).status,403);assert.equal(calls.length,0)
 assert.equal((await worker.fetch(req('editorial?target=beta'),environment('moderator').env)).status,403)
})
test('readonly and cross-origin review writes are denied before upstream mutation',async()=>{
 const {env,calls}=environment('readonly');assert.equal((await worker.fetch(req('review',review),env)).status,403);assert.equal(calls.length,0)
 const e=environment();const request=req('review',review);request.headers.set('Origin','https://evil.test');assert.equal((await worker.fetch(request,e.env)).status,403);assert.equal(e.calls.length,0)
})
test('malformed targets, duplicate queries, invalid days and injected destinations fail closed',async()=>{
 const {env,calls}=environment()
 for(const path of ['editorial','editorial?target=beta&target=staging','editorial?target=https://evil.test','editorial?target=beta&url=https://private.test','candidate?target=beta&day=2026-02-30','candidate?target=beta'])assert.equal((await worker.fetch(req(path),env)).status,400,path)
 for(const patch of [{reviewedEntries:23},{sha256:'changed'},{decision:'publish'},{reason:' '},{day:'2026-02-30'},{url:'https://private.test'}])assert.equal((await worker.fetch(req('review',{...review,...patch}),env)).status,400)
 assert.equal(calls.length,0)
})
test('review sends only the exact immutable candidate and decision, never reviewer or client fields',async()=>{
 const {env,calls}=environment('admin',{day,result:'review-rejected'});assert.equal((await worker.fetch(req('review',review),env)).status,200)
 assert.deepEqual(await calls[0].json(),{day,sha256,decision:'rejected',reason:'Fixture review'})
 assert.equal(calls[0].method,'POST')
})
test('queue projects bounded operational fields and cannot return candidate bodies or profiles',async()=>{
 const {env}=environment('owner',{from:'2026-10-07',through:'2026-10-28',reviewRequired:true,days:[{day,publishedVersion:null,body:'private-fixture-body',profile:'private-fixture-profile'}]})
 const response=await worker.fetch(req('editorial?target=beta'),env);assert.equal(response.status,200);const text=await response.text();assert.equal(text.includes('private-fixture'),false)
})
test('missing bindings, corrupt/oversized upstream bodies and conflicts expose no private provider details',async()=>{
 const {env}=environment();delete env.BABY_EDITORIAL_OPS_KEY;assert.equal((await worker.fetch(req('editorial?target=beta'),env)).status,503)
 for(const response of [new Response('secret-detail',{status:401}),new Response('secret-detail',{status:409}),new Response(' '.repeat(65001),{headers:{'Content-Type':'application/json'}}),Response.json({...payload,edition:{...edition,entries:edition.entries.slice(1)}})]){
  const e=environment();e.env.BABY_BETA.fetch=async()=>response
  const result=await worker.fetch(req('candidate?target=beta&day='+day),e.env);assert.ok([503,409].includes(result.status));assert.equal((await result.text()).includes('secret-detail'),false)
 }
})
