const node = (tag, text) => {
  const e = document.createElement(tag)
  e.textContent = text
  return e
}
export function setupEngagement(state) {
  const box = document.getElementById('engagement')
  if (!box) return
  box.hidden = !['owner', 'admin'].includes(state.role)
  if (box.hidden) return
  async function request(path, payload) {
    const r = await fetch('/api/admin/engagement/' + path, {
      cache: 'no-store',
      ...(payload
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        : {}),
    })
    const d = await r.json()
    if (!r.ok) throw Error(d.error || 'Engagement unavailable')
    return d
  }
  async function load() {
    try {
      const d = await request('state')
      box.replaceChildren(
        node('h2', 'Engagement'),
        node(
          'p',
          'Aggregate private watch activity and alert operations. No watcher identities are shown.',
        ),
      )
      const dl = node('dl', '')
      for (const [k, v] of Object.entries(d.metrics)) {
        dl.append(node('dt', k.replaceAll('_', ' ')), node('dd', String(v)))
      }
      box.append(dl)
      if(d.acceptanceAvailable){const test=node('button','Run isolated Phase 18 provider acceptance');test.onclick=async()=>{test.disabled=true;try{const result=await request('acceptance',{});box.append(node('pre',JSON.stringify(result,null,2)))}catch(e){box.append(node('p',e.message));test.disabled=false}};box.append(test)}
      const refresh = node('button', 'Refresh engagement')
      refresh.onclick = () => void load()
      const run = node('button', 'Process pending alerts')
      run.onclick = async () => {
        run.disabled = true
        try {
          await request('run', {})
          await load()
        } catch (e) {
          box.append(node('p', e.message))
          run.disabled = false
        }
      }
      box.append(refresh, run, node('h3', 'Recent scheduled runs'))
      for (const r of d.runs)
        box.append(
          node(
            'p',
            `${new Date(r.started_at).toLocaleString()} · ${r.status}${r.error ? ' · ' + r.error : ''}`,
          ),
        )
      box.append(node('h3', 'Email delivery operations'))
      for (const r of d.deliveries) {
        const p = node(
          'p',
          `${r.kind} · ${r.status} · ${r.attempts} attempts · ${r.error || ''}`,
        )
        if (r.status === 'failed' && r.attempts < 3) {
          const form = node('form', ''),
            label = node('label', 'Retry reason '),
            input = document.createElement('input'),
            button = node('button', 'Retry delivery')
          input.required = true
          input.minLength = 10
          label.append(input)
          form.append(label, button)
          form.onsubmit = async (e) => {
            e.preventDefault()
            button.disabled = true
            try {
              await request('retry', { id: r.id, reason: input.value })
              await load()
            } catch (error) {
              box.append(node('p', error.message))
              button.disabled = false
            }
          }
          p.append(form)
        }
        box.append(p)
      }
      box.append(node('h3', 'Facilities watched'))
      for (const f of d.facilities)
        box.append(node('p', `${f.facility_id}: ${f.watchers} watchers`))
    } catch (e) {
      box.replaceChildren(node('h2', 'Engagement'), node('p', e.message))
    }
  }
  void load()
}
