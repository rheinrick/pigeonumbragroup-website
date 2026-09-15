import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
const base = process.env.LANDING_URL || 'http://127.0.0.1:4332'
const browser = await chromium.launch({channel:'chrome',headless:true})
const instrument = () => {
  const Original = window.AudioContext
  window.audioProbe = {contexts:[],gains:[],sources:[]}
  window.AudioContext = class extends Original {
    constructor(...args) { super(...args);audioProbe.contexts.push(this) }
    createGain() { const gain=super.createGain();audioProbe.gains.push(gain);const disconnect=gain.disconnect.bind(gain);const connect=gain.connect.bind(gain);gain.disconnect=(...args)=>{gain.outputConnected=false;return disconnect(...args)};gain.connect=(...args)=>{gain.outputConnected=true;return connect(...args)};return gain }
    createBufferSource() { const source=super.createBufferSource();audioProbe.sources.push(source);return source }
  }
}
try {
 for (const mobile of [false,true]) {
  const context=await browser.newContext({viewport:mobile?{width:320,height:568}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'})
  await context.addInitScript(instrument)
  const page=await context.newPage();const requests=[];const errors=[]
  page.on('request',r=>{if(r.url().includes('.mp3'))requests.push(r.url())});page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base)
  const button=page.locator('#audio-control')
  await expect(button).toHaveText('Enable audio')
  assert.equal(requests.length,0)
  await page.locator('h1').click();await page.locator('#motion-control').click()
  assert.equal(requests.length,0);assert.equal(await page.evaluate(()=>audioProbe.contexts.length),0)
  await page.keyboard.press('Tab');await expect(button).toBeFocused();assert.equal(await button.evaluate(e=>getComputedStyle(e).outlineStyle),'solid')
  assert.ok((await button.boundingBox()).height>=44)
  if(mobile)await button.tap();else await page.keyboard.press('Enter')
  await expect(button).toHaveText('Mute audio',{timeout:20000})
  assert.equal(requests.length,1)
  assert.ok(await page.evaluate(()=>audioProbe.gains[0].gain.value<0.2))
  await expect.poll(()=>page.evaluate(()=>audioProbe.gains[0].gain.value)).toBeCloseTo(0.2,3)
  assert.equal(await page.evaluate(()=>audioProbe.sources[0].loop),true)
  const duration=await page.evaluate(()=>audioProbe.sources[0].buffer.duration)
  assert.ok(duration>79 && duration<81)
  const seam=await page.evaluate(async()=>{
    const buffer=audioProbe.sources[0].buffer
    const offline=new OfflineAudioContext(1,Math.ceil((buffer.duration+0.1)*buffer.sampleRate),buffer.sampleRate)
    const source=offline.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(offline.destination);source.start()
    const data=(await offline.startRendering()).getChannelData(0);const boundary=buffer.length
    const rms=(start,end)=>Math.sqrt(data.slice(start,end).reduce((sum,v)=>sum+v*v,0)/(end-start))
    return {jump:Math.abs(data[boundary]-data[boundary-1]),before:rms(boundary-441,boundary),after:rms(boundary,boundary+441)}
  })
  assert.ok(seam.jump<0.02 && seam.before>0.0001 && seam.after>0.0001,JSON.stringify(seam))
  console.log('Decoded loop seam:',seam)
  // Cross the decoded buffer boundary rapidly; the same native looping source stays active.
  await page.evaluate(()=>audioProbe.sources[0].playbackRate.value=40)
  await page.waitForTimeout(2300)
  assert.equal(await page.evaluate(()=>audioProbe.sources.length),1)
  await page.evaluate(()=>audioProbe.sources[0].playbackRate.value=1)
  // Deterministic visibility events exercise the production tab-switch handler.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
  await expect.poll(()=>page.evaluate(()=>audioProbe.contexts[0].state)).toBe('suspended')
  assert.equal(await page.evaluate(()=>audioProbe.gains[0].outputConnected),false)
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))})
  await expect.poll(()=>page.evaluate(()=>audioProbe.contexts[0].state)).toBe('running')
  await button.click()
  assert.equal(await page.evaluate(()=>audioProbe.gains[0].outputConnected),false)
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(()=>page.evaluate(()=>audioProbe.contexts[0].state)).toBe('suspended')
  await expect(button).toHaveText('Enable audio')
  await button.click();await expect(button).toHaveText('Mute audio')
  assert.equal(requests.length,1);assert.equal(await page.evaluate(()=>audioProbe.sources.length),1)
  await page.reload();await expect(button).toHaveText('Enable audio');assert.equal(requests.length,1)
  await page.locator('#audio-credits').click();await expect(page.getByRole('heading',{name:'Music credits'})).toBeVisible();assert.equal(requests.length,1);await page.goBack();await expect(button).toHaveText('Enable audio')
  assert.deepEqual(errors,[])
  await page.screenshot({path:`test-results/landing/audio-${mobile?'mobile':'desktop'}.png`})
  await context.close();console.log(`${mobile?'Mobile touch':'Desktop keyboard'}: lazy load, unrelated interactions silent, fade, loop, mute, visibility, no refetch, fresh arrival passed`)
 }
 for(const mode of ['failed','blocked','pending-mute','unconfigured']) {
  const context=await browser.newContext({reducedMotion:'reduce'})
  await context.addInitScript(instrument)
  if(mode==='blocked')await context.addInitScript(()=>AudioContext.prototype.resume=()=>Promise.reject(new DOMException('Blocked','NotAllowedError')))
  if(mode==='failed')await context.route('**/*.mp3',r=>r.abort())
  if(mode==='pending-mute')await context.route('**/*.mp3',async r=>{await new Promise(resolve=>setTimeout(resolve,1000));await r.continue().catch(()=>{})})
  if(mode==='unconfigured')await context.route('**/audio.js',async r=>{const res=await r.fetch();await r.fulfill({response:res,body:"document.querySelector('#audio-control').dataset.audioSrc='';\n"+await res.text()})})
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base)
  const button=page.locator('#audio-control')
  if(mode==='unconfigured')await expect(button).toBeHidden()
  else {
   await button.click()
   if(mode==='pending-mute'){await expect(button).toHaveText('Cancel audio');await button.click();await page.waitForTimeout(1500)}
   await expect(button).toHaveText('Enable audio')
   await expect.poll(()=>page.evaluate(()=>audioProbe.contexts[0].state)).toBe('suspended')
   assert.equal(await page.evaluate(()=>audioProbe.gains[0].outputConnected),false)
  }
  assert.deepEqual(errors,[]);await context.close();console.log(`${mode}: safe silent fallback passed`)
 }
} finally {await browser.close()}
