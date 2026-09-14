import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
const base = process.env.LANDING_URL || 'http://127.0.0.1:4329'
const browser = await chromium.launch({headless:true, channel:process.env.PLAYWRIGHT_CHANNEL ?? 'chrome', executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH})
mkdirSync('test-results/landing',{recursive:true})
const checks=[]
try {
  for (const [name,width,height] of [['desktop',1440,900],['laptop',1366,600],['mobile',390,844],['small-mobile',320,568]]) {
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'})
    const page=await context.newPage();const requests=[];const errors=[]
    page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message))
    await page.goto(base);await page.evaluate(()=>document.fonts.ready)
    await expect(page.getByRole('heading',{name:'PIGEON UMBRA GROUP LLC'})).toBeVisible()
    assert.equal(requests.some(u=>u.endsWith('.mp4')),false)
    assert.equal(await page.locator('video').getAttribute('src'),null)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight))
    assert.deepEqual(errors,[])
    await page.screenshot({path:`test-results/landing/${name}.png`})
    await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Play motion'})).toBeFocused()
    assert.equal(await page.locator('button').evaluate(e=>getComputedStyle(e).outlineStyle),'solid')
    await page.screenshot({path:`test-results/landing/${name}-focus.png`})
    await page.keyboard.press('Enter')
    await expect.poll(()=>page.locator('video').evaluate(v=>!v.paused && v.currentTime>0), {timeout:20000}).toBe(true)
    await page.getByRole('button',{name:'Pause motion'}).click()
    assert.equal(await page.locator('video').evaluate(v=>v.paused),true)
    await page.getByRole('button',{name:'Play motion'}).click()
    await expect(page.getByRole('button',{name:'Pause motion'})).toBeVisible()
    assert.equal(new Set(requests.filter(u=>u.endsWith('.mp4'))).size,1)
    await context.close(); checks.push(`${name}: layout, reduced motion, explicit play, pause/resume, focus, one video source`)
  }
  const context=await browser.newContext({viewport:{width:1440,height:900}})
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base)
  await expect.poll(()=>page.locator('video').evaluate(v=>!v.paused&&v.currentTime>0), {timeout:20000}).toBe(true)
  await page.screenshot({path:'test-results/landing/desktop-playing.png'})
  // Deterministic visibility events exercise the same handler used on tab changes.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
  assert.equal(await page.locator('video').evaluate(v=>v.paused),true)
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))})
  await expect(page.getByRole('button',{name:'Pause motion'})).toBeVisible()
  await page.getByRole('button',{name:'Pause motion'}).click()
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')))
  assert.equal(await page.locator('video').evaluate(v=>v.paused),true)
  await page.emulateMedia({reducedMotion:'reduce'})
  await expect.poll(()=>page.locator('video').getAttribute('src')).toBe(null)
  assert.deepEqual(errors,[]);await context.close();checks.push('autoplay; visibility pause/resume; manual pause retained; live preference change')
  for(const mode of ['no-js','save-data','blocked','failed']) {
    const context=await browser.newContext({javaScriptEnabled:mode!=='no-js'})
    if(mode==='save-data')await context.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true,addEventListener(){}}}))
    if(mode==='blocked')await context.addInitScript(()=>HTMLMediaElement.prototype.play=()=>Promise.reject(new DOMException('Blocked','NotAllowedError')))
    if(mode==='failed')await context.route('**/*.mp4',r=>r.abort())
    const page=await context.newPage();const requests=[];page.on('request',r=>requests.push(r.url()))
    await page.goto(base);await page.evaluate(()=>document.fonts.ready)
    await expect(page.locator('h1')).toBeVisible()
    assert.equal(await page.locator('img').evaluate(i=>i.complete&&i.naturalWidth>0),true)
    if(['no-js','save-data'].includes(mode))assert.equal(requests.some(u=>u.endsWith('.mp4')),false)
    if(mode!=='no-js')await expect(page.getByRole('button',{name:'Play motion'})).toBeVisible()
    await page.screenshot({path:`test-results/landing/${mode}.png`})
    await context.close();checks.push(`${mode}: complete poster fallback`)
  }
  writeFileSync('test-results/landing/checks.json',JSON.stringify(checks,null,2));console.log(checks.join('\n'))
} finally {await browser.close()}
