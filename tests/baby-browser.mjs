import {chromium,expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFileSync,mkdirSync} from 'node:fs'
const publicRoot=new URL('../public/',import.meta.url)
const server=createServer((request,response)=>{
 const path=new URL(request.url,'http://localhost').pathname
 if (!/^\/(?:[a-z-]+\.(?:js|css)|)$/.test(path)) {response.writeHead(404);response.end();return}
 try {const file=path==='/'?'index.html':path.slice(1);response.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');response.end(readFileSync(new URL(file,publicRoot)))} catch {response.writeHead(404);response.end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL??'chrome',executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH})
const release={revision:'50a23cc5a1dcd36be562b79facb266a23c2909ae',artifact:'9d47688af22c6965',mode:'beta',indexing:'disabled',dirty:false,profileSchemaVersion:1}
const surfaces=['https://horoscope.baby','https://baby-horoscope-staging.rheinrick.workers.dev'].map(origin=>({origin,status:'observed',release,catalog:{entries:168,editions:['2026-10-03.1'],signs:Array(12).fill('Aries'),stages:['born','expected']}}))
try {
 const page=await browser.newPage({viewport:{width:1380,height:1000}});let state='good',calls=0;const errors=[],requests=[]
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()))
 // A failed unrelated backend state must not prevent the independent Baby overview.
 await page.route('**/api/admin/state',route=>route.fulfill({status:503,json:{error:'fixture offline'}}))
 await page.route('**/api/admin/baby-horoscope/overview',route=>{calls++;return state==='denied'?route.fulfill({status:403,json:{error:'denied'}}):route.fulfill({json:{schemaVersion:1,checkedAt:'2026-10-04T15:00:00.000Z',scope:'Fixture observation, not continuous monitoring.',surfaces:state==='partial'?[surfaces[0],{origin:surfaces[1].origin,status:'unavailable',release:null,catalog:null,message:'One or more public manifests could not be verified.'}]:surfaces}})})
 const day='2026-10-23',digest='a'.repeat(64);let reviews=[],canReview=true
 const entries=['born','expected'].flatMap(stage=>['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].map(sign=>({sign,stage,title:sign+' fixture',body:'Visible fixture prose.\n\nPositive sign qualities.\n\nGentle contrast.',prompt:'What fits today?'})))
 await page.route('**/api/admin/baby-horoscope/editorial?*',route=>route.fulfill({json:{target:new URL(route.request().url()).searchParams.get('target'),from:'2026-10-07',through:'2026-10-28',reviewRequired:true,days:[{day,candidateVersion:day+'.10',state:'awaiting-review',attempts:1}]}}))
 await page.route('**/api/admin/baby-horoscope/candidate?*',route=>route.fulfill({json:{target:new URL(route.request().url()).searchParams.get('target'),canReview,sha256:digest,decision:null,edition:{day,version:day+'.10',focus:'Fixture editorial review',source:'assisted',entries}}}))
 await page.route('**/api/admin/baby-horoscope/review',route=>{reviews.push(route.request().postDataJSON());return route.fulfill({json:{day,result:'review-rejected'}})})
 const origin=`http://127.0.0.1:${server.address().port}`
 await page.goto(origin+'/#newborn-horoscope')
 const panel=page.locator('#baby-horoscope');await expect(panel).toBeVisible();await expect(page.locator('#placeholder')).toBeHidden()
 await expect(panel).toContainText('9d47688af22c6965');await expect(panel).toContainText('168 public readings')
 assert.equal(calls,1);await expect(page.locator('a[href="#baby-horoscope"]').first()).toHaveAttribute('aria-current','page')
 assert.equal(requests.some(url=>url.startsWith('https://horoscope.baby')),false)
 for(const href of ['https://horoscope.baby/privacy','https://horoscope.baby/support']) await expect(panel.locator(`a[href="${href}"]`)).toHaveCount(1)
 await expect(panel.locator('#baby-candidate')).toBeHidden()
 mkdirSync('/tmp/bh-phase3-admin-visuals',{recursive:true});await page.screenshot({path:'/tmp/bh-phase3-admin-visuals/overview-desktop.png',fullPage:true})
 await panel.getByRole('button',{name:'Read '+day+' draft'}).click()
 await expect(page.locator('#baby-candidate-entries article')).toHaveCount(24)
 await expect(page.locator('#baby-candidate-heading')).toBeFocused()
 await panel.getByRole('button',{name:'Reject this exact draft'}).click();assert.equal(reviews.length,0)
 await page.locator('#baby-reviewed').check();await page.locator('#baby-review-reason').fill('Adult language in fixture')
 await panel.getByRole('button',{name:'Reject this exact draft'}).click();await expect(page.locator('#baby-editorial-notice')).toContainText('rejected; remains unavailable')
 assert.deepEqual(reviews,[{target:'beta',day,sha256:digest,decision:'rejected',reason:'Adult language in fixture',reviewedEntries:24}])
 await page.locator('#baby-editorial-target').selectOption('staging');await expect(page.locator('#baby-candidate')).toBeHidden()
 canReview=false;await panel.getByRole('button',{name:'Read '+day+' draft'}).click();await expect(page.locator('#baby-review-form')).toBeHidden()
 await expect(page.locator('#baby-editorial-notice')).toContainText('Your role can read drafts')
 await page.locator('#baby-editorial-target').selectOption('beta');await expect(page.locator('#baby-candidate')).toBeHidden()
 state='partial';await panel.getByRole('button',{name:'Check public release manifests'}).click();await expect(panel).toContainText('Public manifests unavailable');await expect(panel).toContainText('9d47688af22c6965')
 state='denied';await panel.getByRole('button',{name:'Check public release manifests'}).click();await expect(page.locator('#baby-notice')).toContainText('Sign in with an operations role');await expect(page.locator('#baby-surfaces')).toBeEmpty()
 state='good';await panel.getByRole('button',{name:'Check public release manifests'}).click();await expect(panel).toContainText('Public manifests verified');await expect(panel.getByRole('button',{name:'Check public release manifests'})).toBeEnabled()
 await page.setViewportSize({width:390,height:844});await page.getByText('Workspaces',{exact:true}).click();await page.getByRole('link',{name:'CliniType',exact:true}).click();await expect(panel).toBeHidden();await expect(page.locator('#placeholder')).toBeVisible()
 await page.getByText('Workspaces',{exact:true}).click();await page.getByRole('link',{name:'Baby Horoscope',exact:true}).click();await expect(panel).toBeVisible();await expect(page.locator('#module-title')).toBeFocused()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true)
 await page.screenshot({path:'/tmp/bh-phase3-admin-visuals/overview-mobile.png',fullPage:true})
 assert.deepEqual(errors,[]);console.log('PASS: legacy navigation, independent project loading, public-only metadata, all 24 draft readings, explicit exact-digest rejection, read-only role, target invalidation, failure/denial/retry, scoped links, focus and mobile reflow.')
} finally {await browser.close();server.close()}
