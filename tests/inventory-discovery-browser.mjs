import {chromium, expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFileSync, mkdirSync} from 'node:fs'
const baseRoot = new URL('../public/',import.meta.url)
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/admin.css"></head><body><div class="layout"><aside>Central Admin test fixture</aside><main><section id="inventory"></section></main></div><script type="module">import {setupInventory} from "/inventory.js";setupInventory()</script></body></html>'
const server = createServer((request,response)=>{
  const path = new URL(request.url,'http://localhost').pathname
  if(path==='/'){response.setHeader('Content-Type','text/html');response.end(html);return}
  if(!/^\/(inventory|inventory-discovery)\.js$|^\/admin\.css$/.test(path)){response.writeHead(404);response.end();return}
  response.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/css')
  response.end(readFileSync(new URL(path.slice(1),baseRoot)))
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH})
const rows = Array.from({length:31},(_,index)=>({
  id:`content-${index}`,fingerprint:`hash-${index}`,sourceKey:`way/${index}`,change:index===1?'listing_missing':'listing_changed',priority:index===0?'published_catalog':'discovery',facilityIds:index===0?['IAD4-A','IAD4-B']:[],name:index===0?'Published facility lead':`Discovery lead ${index}`,sourceUrl:index===1?'javascript:window.unsafe=1':'https://www.openstreetmap.org/way/1',
  before:{tags:{ref:'IAD4-A',name:'<img src=x onerror="window.unsafe=1">',unchanged:'preserved'},coordinates:[-77.45,38.95]},after:index===1?null:{tags:{ref:'IAD4',name:'<script>window.unsafe=1</script>',unchanged:'preserved'},coordinates:[-77.4500001,38.95]},possibleDuplicates:[{id:'IAD4-B',name:'Adjacent building',reason:'Campus identity requires reconciliation'}],review:null,history:[]
}))
let revision=4, readonly=false, failure=false, stale=false, latestAttempt={status:'review_ready',checkedAt:'2026-10-04T16:00:00Z'}, actions=[], filters=[]
const state = () => ({revision,release:'inventory-2026-09-10-v7',canReview:!readonly,canImport:!readonly,batch:{id:'batch-fixture',checkedAt:'2026-10-04T16:00:00Z',provenance:{kind:'manual_initial',runId:null,runUrl:null}},latestAttempt,total:31,page:0,pageSize:30,counts:{needs_review:rows.filter(row=>!row.review).length,approve:rows.filter(row=>row.review?.decision==='approve').length,defer:rows.filter(row=>row.review?.decision==='defer').length,reject:rows.filter(row=>row.review?.decision==='reject').length,published_catalog:1},rows})
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100}}), errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/api/admin/inventory**',async route=>{
    const request=route.request(), url=new URL(request.url()), path=url.pathname
    if(path==='/api/admin/inventory') return route.fulfill({json:{revision:0,release:'existing-inventory',coverage:{published:222,candidates:1770,note:'Existing uneven national coverage.',states:{},markets:{},operators:{}},registry:[],counts:{needs_review:100,defer:0,reject:0},rows:[],total:0,pageSize:30,canReview:!readonly}})
    if(path.endsWith('-export')) return route.fulfill({json:{schema:1,kind:'discovery_review_only',release:'inventory-2026-09-10-v7',revision,batch:state().batch,items:rows,reviews:actions,notice:'Not a normalized facility release'}})
    if(request.method()==='POST') {
      const payload=request.postDataJSON()
      if(stale) return route.fulfill({status:409,json:{error:'Workspace changed. Reload before reviewing.'}})
      actions.push(payload);revision++
      if(path.endsWith('-review')) {
        const row=rows.find(row=>row.id===payload.id)
        if(row.review) row.history.push(row.review)
        row.review={...payload,reviewer:'fixture@example.test',reviewedAt:'2026-10-04',publication:'not_published'}
      }
      return route.fulfill({json:{ok:true,note:'Discovery review saved. Public inventory remains unchanged.'}})
    }
    if(failure) return route.fulfill({status:403,json:{error:'Discovery permission denied'}})
    filters.push(Object.fromEntries(url.searchParams))
    const pageNumber=Number(url.searchParams.get('page')||0), filtered=rows.filter(row=>(!url.searchParams.get('q')||row.name.includes(url.searchParams.get('q')))&&(!url.searchParams.get('change')||row.change===url.searchParams.get('change'))&&(!url.searchParams.get('decision')||(row.review?.decision ?? 'needs_review')===url.searchParams.get('decision'))&&(!url.searchParams.get('priority')||row.priority===url.searchParams.get('priority')))
    return route.fulfill({json:{...state(),total:filtered.length,page:pageNumber,rows:filtered.slice(pageNumber*30,(pageNumber+1)*30)}})
  })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const inbox=page.locator('#inventory-discovery'), first=inbox.locator('.discovery-card').first()
  await expect(inbox).toContainText('Manual initial observation; this is not a scheduled-run receipt.')
  await expect(page.locator('#inventory')).toContainText('222 published records')
  await expect(inbox.locator('.discovery-card')).toHaveCount(30)
  await first.locator(':scope > summary').click()
  await expect(first).toContainText('Published facility: IAD4-A, IAD4-B')
  await expect(first).toContainText('<script>window.unsafe=1</script>')
  await expect(first.locator('script,img')).toHaveCount(0)
  await expect(first.locator('.discovery-diff')).not.toContainText('unchanged')
  await expect(first).toContainText('Previous: [-77.45,38.95]')
  await expect(first).toContainText('Current: [-77.4500001,38.95]')
  assert.equal(await page.evaluate(()=>window.unsafe),undefined)
  // Defer a source identity with a current fingerprint and version, then reload audit.
  await first.getByLabel('Discovery review reason',{exact:true}).fill('Operator evidence is needed before changing the source reference.')
  await first.getByLabel('Identity reconciliation notes').fill('These may be separate buildings on a shared campus; preserve both identities.')
  await first.getByRole('button',{name:'Save discovery review'}).click()
  await expect(inbox.getByRole('status').first()).toContainText('Public inventory remains unchanged')
  assert.equal(actions[0].batchId,'batch-fixture');assert.equal(actions[0].expectedRevision,4);assert.equal(actions[0].fingerprint,'hash-0');assert.equal(actions[0].decision,'defer')
  await page.reload()
  await expect(first.locator(':scope > summary')).toContainText('Deferred')
  await first.locator(':scope > summary').click()
  await first.getByText('Review history and audit',{exact:true}).click()
  await expect(first).toContainText('not_published')
  // Acceptance requires both primary dated evidence and resolved building identity.
  await first.getByLabel('Discovery decision',{exact:true}).selectOption('approve')
  await first.getByRole('button',{name:'Save discovery review'}).click()
  assert.equal(actions.length,1)
  await first.getByLabel('Primary evidence URL').fill('https://www.csquare.com/data-centers/northern-virginia')
  await first.getByLabel('Evidence date',{exact:true}).fill('2026-10-04')
  await first.getByLabel('Building / campus identity').selectOption('multiple_buildings')
  await first.getByRole('button',{name:'Save discovery review'}).click()
  await expect(first.locator(':scope > summary')).toContainText('Accepted for preparation')
  assert.deepEqual(actions[1].evidence,[{url:'https://www.csquare.com/data-centers/northern-virginia',date:'2026-10-04',kind:'operator'}])
  assert.equal(actions[1].expectedRevision,5);assert.equal(actions[1].identity.kind,'multiple_buildings')
  // History is independent of the current review, stale changes are rejected.
  await first.locator(':scope > summary').click()
  await first.getByText('Review history and audit',{exact:true}).click()
  await expect(first).toContainText('"decision": "defer"')
  stale=true
  await first.getByRole('button',{name:'Save discovery review'}).click()
  await expect(first.getByRole('status')).toContainText('Refresh the discovery inbox before reviewing again')
  assert.equal(actions.length,2);stale=false
  // Paging and server filters preserve the exact source and decision enums.
  await inbox.getByRole('button',{name:'Next discovery page'}).click()
  await expect(inbox).toContainText('Discovery page 2')
  await expect(inbox.locator('.discovery-card')).toHaveCount(1)
  await inbox.getByLabel('Facility priority').selectOption('published_catalog')
  await inbox.getByRole('button',{name:'Filter discovery inbox'}).click()
  await expect(inbox.locator('.discovery-card')).toHaveCount(1)
  assert.equal(filters.at(-1).page,'0');assert.equal(filters.at(-1).priority,'published_catalog')
  await inbox.getByLabel('Facility priority').selectOption('')
  await inbox.getByLabel('Observation change').selectOption('listing_missing')
  await inbox.getByRole('button',{name:'Filter discovery inbox'}).click()
  await inbox.locator('.discovery-card > summary').click()
  await expect(inbox).toContainText('Missing from source')
  await expect(inbox.locator('a[href^="javascript:"]')).toHaveCount(0)
  await expect(inbox).toContainText('Current: Absent')
  await inbox.getByLabel('Discovery review decision').selectOption('reject')
  await inbox.getByRole('button',{name:'Filter discovery inbox'}).click()
  await expect(inbox).toContainText('No matching discovery observations.')
  assert.equal(filters.at(-1).decision,'reject')
  await inbox.getByLabel('Observation change').selectOption('')
  await inbox.getByLabel('Discovery review decision').selectOption('')
  await inbox.getByRole('button',{name:'Filter discovery inbox'}).click()
  const downloaded=page.waitForEvent('download');await inbox.getByRole('button',{name:'Export discovery ledger'}).click()
  const download=await downloaded
  assert.equal(download.suggestedFilename(),'inventory-discovery-ledger.json')
  const ledger=JSON.parse(readFileSync(await download.path(),'utf8'))
  assert.equal(ledger.kind,'discovery_review_only');assert.equal(ledger.release,'inventory-2026-09-10-v7')
  // A prepared import uses the existing data package; it cannot source a new scan.
  await inbox.getByText('Owner / admin: import an existing observation package',{exact:true}).click()
  await inbox.getByLabel('Prepared discovery package').setInputFiles({name:'oversize.json',mimeType:'application/json',buffer:Buffer.alloc(14_000_001)})
  await inbox.getByRole('button',{name:'Import prepared discovery package'}).click()
  await expect(inbox.locator('.discovery-import [role=\"status\"]')).toContainText('no larger than 14 MB')
  assert.equal(actions.length,2)
  await inbox.getByLabel('Prepared discovery package').setInputFiles({name:'prepared.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({report:{schemaVersion:1},observationBase64:'e30='}))})
  await inbox.getByRole('button',{name:'Import prepared discovery package'}).click()
  await expect.poll(()=>actions.length).toBe(3)
  assert.deepEqual(actions[2],{report:{schemaVersion:1},observationBase64:'e30=',expectedRevision:6})
  // Failure receipts retain the good batch; role loss removes write controls.
  latestAttempt={status:'failed',checkedAt:'2026-10-04T16:30:00Z'}
  await inbox.getByRole('button',{name:'Refresh discovery inbox'}).click()
  await expect(inbox).toContainText('Latest discovery ingestion failed. The last successful batch is retained')
  mkdirSync('test-results',{recursive:true})
  await inbox.locator('.discovery-card > summary').first().click()
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.screenshot({path:'test-results/inventory-discovery-desktop.png'})
  await page.setViewportSize({width:390,height:844})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.screenshot({path:'test-results/inventory-discovery-mobile.png'})
  await inbox.locator('.discovery-review').first().scrollIntoViewIfNeeded()
  await page.screenshot({path:'test-results/inventory-discovery-mobile-review.png'})
  readonly=true;await inbox.getByRole('button',{name:'Refresh discovery inbox'}).click()
  await expect(inbox).toContainText('Your role has read-only access')
  await expect(inbox.locator('.discovery-review,.discovery-import')).toHaveCount(0)
  failure=true;await inbox.getByRole('button',{name:'Refresh discovery inbox'}).click()
  await expect(inbox.getByRole('status')).toContainText('Discovery permission denied')
  await expect(inbox.locator('.discovery-card')).toHaveCount(0)
  await expect(inbox.getByRole('button',{name:'Export discovery ledger'})).toBeDisabled()
  failure=false;await inbox.getByRole('button',{name:'Refresh discovery inbox'}).click()
  await expect(inbox).toContainText('Discovery inbox loaded')
  assert.deepEqual(errors,[])
  console.log('PASS: discovery source diffs, geometry, primary evidence, identity, versioned review/audit, reload/export, stale conflict, pagination/filters, prepared import, failure retention, readonly/denial/recovery, XSS and mobile containment.')
} finally {await browser.close();server.close()}
