import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, mkdirSync } from 'node:fs'
let role='owner', canWrite=true, conflict=false
const actions=[],errors=[]
const fixture={
  gates:{public:{name:'Public Access',available:true},delta:{name:'Gate 1 // Delta Access',available:true},omega:{name:'Gate 2 // Omega Access',available:false}},
  domains:[{id:'health',name:'Health Outcomes',description:'Synthetic source context',ordering:2,enabled:true,revision:4}],
  layers:[{id:'cancer-fixture',name:'Cancer <script>unsafe()</script>',domain:'health',gate:'delta',minimumGate:'delta',enabled:true,status:'READY',revision:3,source:'Synthetic CDC fixture',sourceUrl:'https://www.cdc.gov/',evidenceClass:'authoritative',verificationStatus:'Synthetic fixture only',sourceQuality:'Government dataset',coverageQuality:'Partial',geography:'county',coverage:'Synthetic county context',updateCadence:'Annual',license:'Fixture',methodologyNotes:'Suppression is preserved.',limitations:'No causal relationship inferred.',lastAttempt:{started_at:1790000000000},durationMs:321,stale:false,staleThresholdDays:45,records:3142,lastSuccess:1790000000321,changedRecords:null,error:null,state:{current_version:'published-v1',revision:2},currentVersion:{id:'published-v1',period:'2019–2023',coverage:'Synthetic coverage'}}],
  versions:[{id:'staged-v2',dataset_id:'cancer-fixture',record_count:3142,status:'staged'}],
  runs:[{dataset_id:'cancer-fixture',started_at:1790000000000,finished_at:1790000000321,status:'staged',record_count:3142,error:null}],
}
const server=createServer((request,response)=>{
  const path=new URL(request.url,'http://localhost').pathname
  if(path==='/') {response.setHeader('Content-Type','text/html');return response.end(`<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/admin.css"><main><section id="dread" class="workspace-panel is-current"></section></main><script type="module">import {setupDread} from '/dread.js';setupDread({role:${JSON.stringify(role)}})</script>`)}
  if(['/dread.js','/records.js','/admin.css'].includes(path)){response.setHeader('Content-Type',path.endsWith('.css')?'text/css':'text/javascript');return response.end(readFileSync('public'+path))}
  response.statusCode=404;response.end('Not found')
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL??'chrome',executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH})
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}})
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/api/admin/dread/**',async route=>{
    const path=new URL(route.request().url()).pathname
    if(route.request().method()==='GET')return route.fulfill({json:{...fixture,canWrite}})
    const payload=route.request().postDataJSON();actions.push({path,payload})
    return conflict?route.fulfill({status:409,json:{error:'Policy changed. Reload before saving.'}}):route.fulfill({json:{saved:true}})
  })
  const origin=`http://127.0.0.1:${server.address().port}`
  const panel=page.locator('#dread')
  await page.goto(origin)
  await expect(panel.getByRole('heading',{name:'DataCenterDread // Delta Access'})).toBeVisible()
  await expect(panel).toContainText('Reserved · unavailable')
  await expect(panel.locator('script')).toHaveCount(0)
  await panel.getByRole('button',{name:'Inspect Dread layer'}).click()
  await expect(panel).toContainText('321 ms')
  await expect(panel).toContainText('Suppression is preserved.')
  let layerForm=panel.locator('form').filter({has:page.getByRole('button',{name:'Save Dread layer policy'})})
  await layerForm.getByLabel('Review reason').fill('Reviewed Dread source policy fixture.')
  await layerForm.getByRole('button',{name:'Save Dread layer policy'}).click()
  await expect(panel.getByRole('status')).toContainText('Saved.')
  assert.equal(actions.at(-1).path,'/api/admin/dread/layer')
  assert.equal(actions.at(-1).payload.expectedRevision,3)
  await panel.getByRole('button',{name:'Inspect Dread layer'}).click()
  layerForm=panel.locator('form').filter({has:page.getByRole('button',{name:'Save Dread layer policy'})})
  await layerForm.getByRole('combobox').selectOption('omega')
  await expect(layerForm.getByLabel('Enabled')).toBeDisabled()
  await expect(layerForm.getByLabel('Enabled')).not.toBeChecked()
  await panel.getByRole('button',{name:'Inspect Dread domain'}).click()
  const domainForm=panel.locator('form').filter({has:page.getByRole('button',{name:'Save Dread domain'})})
  await domainForm.getByLabel('Description').fill('Updated synthetic health-domain context.')
  await domainForm.getByLabel('Review reason').fill('Reviewed Dread domain description.')
  await domainForm.getByRole('button',{name:'Save Dread domain'}).click()
  await expect(panel.getByRole('status')).toContainText('Saved.')
  assert.equal(actions.at(-1).path,'/api/admin/dread/domain')
  assert.equal(actions.at(-1).payload.expectedRevision,4)
  await panel.getByRole('button',{name:'Review Dread version'}).click()
  const publicationForm=panel.locator('form').filter({has:page.getByRole('button',{name:'Publish reviewed Dread version'})})
  await publicationForm.getByLabel('Review reason').fill('Reviewed synthetic source release and suppression.')
  await publicationForm.getByRole('button',{name:'Publish reviewed Dread version'}).click()
  await expect(panel.getByRole('status')).toContainText('Saved.')
  assert.equal(actions.at(-1).path,'/api/admin/dread/publish')
  assert.equal(actions.at(-1).payload.expectedRevision,2)
  conflict=true
  await panel.getByRole('button',{name:'Inspect Dread domain'}).click()
  const staleForm=panel.locator('form').filter({has:page.getByRole('button',{name:'Save Dread domain'})})
  await staleForm.getByLabel('Review reason').fill('Attempt a stale synthetic policy update.')
  await staleForm.getByRole('button',{name:'Save Dread domain'}).click()
  await expect(panel.getByRole('status')).toContainText('Policy changed. Reload before saving.')
  mkdirSync('test-results',{recursive:true})
  await page.screenshot({path:'test-results/dread-admin-desktop.png',fullPage:true})
  await page.setViewportSize({width:390,height:844})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.screenshot({path:'test-results/dread-admin-mobile.png',fullPage:true})
  role='readonly';conflict=false
  await page.reload()
  await expect(panel).toContainText('Cancer <script>unsafe()</script>')
  await expect(panel.locator('form')).toHaveCount(0)
  const before=actions.length
  await panel.getByRole('button',{name:'Refresh Dread'}).click()
  await expect(panel).toContainText('Reserved · unavailable')
  assert.equal(actions.length,before)
  role='owner';canWrite=false;await page.reload()
  await expect(panel.getByRole('heading')).toBeVisible()
  await expect(panel.locator('form')).toHaveCount(0)
  role='moderator';await page.reload();await expect(panel).toBeHidden()
  assert.deepEqual(errors,[])
  console.log('Dread admin browser passed: owner mutations, CAS payloads/conflict feedback, readonly/backend-denied controls, Omega lock, XSS text, desktop/mobile layout, denied-role hidden panel.')
} finally {await browser.close();await new Promise(resolve=>server.close(resolve))}
