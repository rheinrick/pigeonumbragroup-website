const $ = id => document.getElementById(id)
const node = (tag,value) => {const item=document.createElement(tag); item.textContent=value; return item}
let started = false
let busy = false
const links = [
  ['Public beta','https://horoscope.baby/'], ['Staging','https://baby-horoscope-staging.rheinrick.workers.dev/'],
  ['Public help and recovery','https://horoscope.baby/help'], ['Support and feedback','https://horoscope.baby/support'],
  ['Privacy policy','https://horoscope.baby/privacy'], ['Terms','https://horoscope.baby/terms'],
  ['Execution board and evidence','https://github.com/rheinrick/newbornhoroscope-website/blob/codex/web-beta-foundation/docs/web/EXECUTION_BOARD.md'],
  ['Release and recovery runbook','https://github.com/rheinrick/newbornhoroscope-website/blob/codex/web-beta-foundation/docs/web/OPERATIONS.md'],
  ['Private issue tracker','https://github.com/rheinrick/newbornhoroscope-website/issues'],
]
async function check() {
  if (busy) return
  busy = true; $('baby-refresh').disabled = true
  $('baby-notice').textContent = 'Checking public manifests…'
  $('baby-surfaces').setAttribute('aria-busy','true')
  try {
    const response = await fetch('/api/admin/baby-horoscope/overview',{cache:'no-store',signal:AbortSignal.timeout(20000)})
    if (!response.ok) throw Error(response.status === 403 ? 'Sign in with an operations role to view Baby Horoscope.' : 'The operations check is unavailable. Try again.')
    const data = await response.json()
    if (data.schemaVersion !== 1 || !Array.isArray(data.surfaces) || data.surfaces.length !== 2) throw Error('The operations response could not be verified.')
    $('baby-surfaces').replaceChildren(...data.surfaces.map((surface,index)=>{
      const card = node('article',''); card.append(node('h3', index === 0 ? 'Public beta' : 'Staging'))
      card.append(node('p',surface.status === 'observed' ? 'Public manifests verified' : 'Public manifests unavailable'))
      if (surface.release) {
        const dl = node('dl','')
        for (const [label,value] of [['Source revision',surface.release.revision],['Artifact',surface.release.artifact],['Release mode',surface.release.mode],['Indexing',surface.release.indexing],['Source tree',surface.release.dirty ? 'Dirty' : 'Clean'],['Profile schema',surface.release.profileSchemaVersion]]) {
          dl.append(node('dt',label),node('dd',String(value)))
        }
        card.append(dl)
      }
      if (surface.catalog) card.append(node('p',`${surface.catalog.entries} public readings · ${surface.catalog.signs.length} signs · ${surface.catalog.stages.join(' / ')} · edition ${surface.catalog.editions.join(', ')}`))
      if (surface.message) card.append(node('p',surface.message))
      return card
    }))
    $('baby-notice').textContent = `Checked ${new Date(data.checkedAt).toLocaleString()}. ${data.scope}`
  } catch (error) {
    $('baby-surfaces').replaceChildren()
    $('baby-notice').textContent = error.name === 'TimeoutError' ? 'The check timed out. Try again.' : error.message
  } finally {
    busy = false; $('baby-refresh').disabled = false; $('baby-surfaces').removeAttribute('aria-busy')
  }
}
export function setupBabyHoroscope() {
  if (started) return
  started = true
  $('baby-links').replaceChildren(...links.map(([label,url])=>{
    const item=node('li',''); const link=node('a',label); link.href=url; link.rel='noreferrer'; item.append(link); return item
  }))
  $('baby-refresh').addEventListener('click',()=>void check())
  void check()
}
