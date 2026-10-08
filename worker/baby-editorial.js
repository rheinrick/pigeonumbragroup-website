const root = '/api/admin/baby-horoscope/'
const dayPattern = /^\d{4}-\d{2}-\d{2}$/
const validDay = day => typeof day === 'string' && dayPattern.test(day) && day >= '2026-10-07' && new Date(day+'T12:00:00Z').toISOString().slice(0,10) === day
async function jsonBody(source, limit) {
  if (!source.headers.get('Content-Type')?.includes('application/json')) throw Error('json')
  const reader = source.body?.getReader(); if (!reader) throw Error('body')
  let size=0; const parts=[]
  for (;;) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('size')}parts.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}
  return JSON.parse(new TextDecoder().decode(bytes))
}
export async function babyEditorial(request, env, role, headers) {
  const url = new URL(request.url), action = url.pathname.slice(root.length)
  const json = (data,status=200) => Response.json(data,{status,headers})
  if (!['editorial','candidate','review'].includes(action)) return json({error:'Not found'},404)
  if (!['owner','admin','readonly'].includes(role)) return json({error:'Editorial permission required.'},403)
  const write=action==='review'
  if(request.method !== (write?'POST':'GET')) return json({error:'Method not allowed'},405)
  if(write && role==='readonly') return json({error:'Read-only role.'},403)
  let input
  try {
    if(write){
      if(url.search)throw Error('query')
      input=await jsonBody(request,1024)
      if(!input||Object.keys(input).sort().join(',')!=='day,decision,reason,reviewedEntries,sha256,target'||!validDay(input.day)||! /^[a-f0-9]{64}$/.test(input.sha256)||!['approved','rejected'].includes(input.decision)||typeof input.reason!=='string'||input.reason.trim().length<1||input.reason.length>120||input.reviewedEntries!==24)throw Error('input')
    }else{
      const allowed=action==='candidate'?['target','day']:['target']
      if([...url.searchParams.keys()].some(key=>!allowed.includes(key))||allowed.some(key=>url.searchParams.getAll(key).length!==1))throw Error('query')
      input=Object.fromEntries(url.searchParams)
      if(action==='candidate'&&!validDay(input.day))throw Error('day')
    }
    if(!['beta','staging'].includes(input.target))throw Error('target')
  }catch{return json({error:'Use the selected environment, edition day and exact review fields.'},400)}
  const binding=input.target==='beta'?env.BABY_BETA:env.BABY_STAGING
  if(!binding||!env.BABY_EDITORIAL_OPS_KEY)return json({error:'The editorial connection is not configured.'},503)
  try {
    const endpoint=action==='editorial'?'queue':action
    const endpointURL='https://baby-editorial.internal/api/ops/'+endpoint+(action==='candidate'?'?day='+input.day:'')
    const upstream=await binding.fetch(new Request(endpointURL,{method:write?'POST':'GET',headers:{Authorization:'Bearer '+env.BABY_EDITORIAL_OPS_KEY,...(write?{'Content-Type':'application/json'}:{})},...(write?{body:JSON.stringify({day:input.day,sha256:input.sha256,decision:input.decision,reason:input.reason.trim()})}:{}),signal:AbortSignal.timeout(15000)}))
    if(!upstream.ok)return json({error:upstream.status===409?'This candidate already has a different decision. Refresh before reviewing.':upstream.status===404?'No intact candidate is available.':'The editorial service is unavailable.'},[404,409].includes(upstream.status)?upstream.status:503)
    const data=await jsonBody(upstream,65000)
    if(action==='editorial'){
      if(!validDay(data.from)||!validDay(data.through)||!Array.isArray(data.days)||data.days.length>32||data.reviewRequired!==true)throw Error('queue')
      const fields=['day','publishedVersion','candidateVersion','sha256','decision','reviewReason','state','attempts','jobReason','updatedAt','holdReason']
      if(data.days.some(row=>!validDay(row.day)||fields.some(key=>row[key]!=null&&typeof row[key]!==(key==='attempts'?'number':'string'))))throw Error('queue')
      return json({target:input.target,from:data.from,through:data.through,reviewRequired:true,days:data.days.map(row=>Object.fromEntries(fields.map(key=>[key,row[key]??null])))})
    }
    if(action==='candidate'){
      const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
      const e=data.edition
      if(! /^[a-f0-9]{64}$/.test(data.sha256)||e?.day!==input.day||e.source!=='assisted'||!Array.isArray(e.entries)||e.entries.length!==24||e.entries.some(row=>!signs.includes(row.sign)||!['born','expected'].includes(row.stage)||['title','body','prompt'].some(key=>typeof row[key]!=='string'||row[key].length>6000))||new Set(e.entries.map(row=>row.stage+row.sign)).size!==24||![null,'approved','rejected'].includes(data.decision))throw Error('candidate')
      return json({target:input.target,canReview:role!=='readonly',sha256:data.sha256,decision:data.decision,reason:data.reason,edition:{day:e.day,version:e.version,focus:e.focus,source:e.source,entries:e.entries.map(({sign,stage,title,body,prompt})=>({sign,stage,title,body,prompt}))}})
    }
    if(data.day!==input.day||!['published','already-published','review-rejected'].includes(data.result))throw Error('review')
    return json({day:data.day,result:data.result})
  }catch{return json({error:'The editorial response could not be verified. Refresh and try again.'},503)}
}
