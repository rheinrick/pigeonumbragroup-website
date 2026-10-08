const $ = id => document.getElementById(id)
const node = (tag,text) => {const el=document.createElement(tag);el.textContent=text;return el}
let sequence=0, candidate=null, mutating=false, started=false
const target = () => $('baby-editorial-target').value
function clearDraft() {
  candidate=null; $('baby-candidate').hidden=true; $('baby-candidate-entries').replaceChildren(); $('baby-review-form').reset()
}
async function api(path,options={}) {
  const response=await fetch('/api/admin/baby-horoscope/'+path,{cache:'no-store',signal:AbortSignal.timeout(20000),...options})
  const data=await response.json()
  if(!response.ok)throw Error(data.error||'The editorial service is unavailable.')
  return data
}
async function inspect(day) {
  const serial=++sequence, environment=target();clearDraft()
  $('baby-editorial-notice').textContent='Loading the exact draft…'
  try {
    const data=await api(`candidate?target=${environment}&day=${day}`)
    if(serial!==sequence||environment!==target())return
    if(data.target!==environment||data.edition?.day!==day||data.edition.entries?.length!==24)throw Error('The candidate could not be verified.')
    candidate=data; $('baby-candidate').hidden=false
    $('baby-candidate-heading').textContent=`${day} · ${data.edition.focus}`
    $('baby-candidate-summary').textContent=`${environment} · ${data.edition.version} · ${data.decision||'Awaiting review'} · Fingerprint ${data.sha256}`
    $('baby-candidate-entries').replaceChildren(...data.edition.entries.map(entry=>{
      const article=node('article','');article.append(node('h5',`${entry.sign} · ${entry.stage==='born'?'Born baby':'Expected baby'}`),node('p',entry.title))
      for(const paragraph of entry.body.split(/\n\s*\n/))article.append(node('p',paragraph))
      article.append(node('p',entry.prompt));return article
    }))
    $('baby-review-form').hidden=!!data.decision||!data.canReview
    $('baby-editorial-notice').textContent=data.decision?`This exact draft was ${data.decision}. ${data.reason||''}`:data.canReview?'Read all 24 readings before recording a decision.':'Your role can read drafts; an owner or administrator records the decision.'
    $('baby-candidate-heading').focus()
  }catch(error){if(serial===sequence)$('baby-editorial-notice').textContent=error.message}
}
async function refresh() {
  const serial=++sequence, environment=target(); clearDraft()
  $('baby-editorial-days').replaceChildren();$('baby-editorial-notice').textContent='Checking curated coverage and held drafts…'
  $('baby-editorial-refresh').disabled=true
  try {
    const data=await api(`editorial?target=${environment}`)
    if(serial!==sequence||environment!==target())return
    if(data.target!==environment||!Array.isArray(data.days)||data.days.length>32)throw Error('The queue could not be verified.')
    $('baby-editorial-days').replaceChildren(...data.days.map(day=>{
      const row=node('article','');row.append(node('h4',day.day),node('p',day.publishedVersion?`Available: ${day.publishedVersion}`:'No published edition'))
      if(day.candidateVersion){row.append(node('p',`Draft ${day.candidateVersion}: ${day.decision||'awaiting review'}`));const button=node('button',`Read ${day.day} draft`);button.type='button';button.addEventListener('click',()=>{if(!mutating)void inspect(day.day)});row.append(button)}
      if(day.state)row.append(node('p',`${day.state} · ${day.attempts??0} writing attempts`))
      if(day.holdReason)row.append(node('p',`Held: ${day.holdReason}`))
      return row
    }))
    $('baby-editorial-notice').textContent=`Checked ${environment}, ${data.from} through ${data.through}. ${data.days.length} edition days. Assisted drafts require review.`
  }catch(error){if(serial===sequence)$('baby-editorial-notice').textContent=error.message}
  finally{$('baby-editorial-refresh').disabled=mutating}
}
export function setupBabyEditorial() {
  if(started)return;started=true
  $('baby-editorial-refresh').addEventListener('click',()=>void refresh())
  $('baby-editorial-target').addEventListener('change',()=>void refresh())
  $('baby-review-form').addEventListener('submit',async event=>{
    event.preventDefault()
    const draft=candidate,decision=event.submitter?.value,reason=$('baby-review-reason').value.trim()
    if(mutating||!draft||draft.target!==target()||draft.decision||!draft.canReview||!$('baby-reviewed').checked||!reason||!['approved','rejected'].includes(decision))return
    mutating=true;for(const id of ['baby-approve','baby-reject','baby-editorial-target','baby-editorial-refresh'])$(id).disabled=true
    $('baby-editorial-notice').textContent='Recording the decision for this exact draft…'
    try {
      const result=await api('review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target:draft.target,day:draft.edition.day,sha256:draft.sha256,decision,reason,reviewedEntries:24})})
      clearDraft();$('baby-editorial-notice').textContent=`${result.day}: ${decision==='approved'?'approved and published':'rejected; remains unavailable'}. Check coverage to refresh the queue.`
    }catch(error){clearDraft();$('baby-editorial-notice').textContent=error.message+' Reload the draft before deciding again.'}
    finally{mutating=false;for(const id of ['baby-approve','baby-reject','baby-editorial-target','baby-editorial-refresh'])$(id).disabled=false}
  })
  void refresh()
}
