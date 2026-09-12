const el = (tag, text) => {
  const n = document.createElement(tag)
  n.textContent = text
  return n
}
export function setupOperations(state) {
  const box = document.getElementById('operations')
  if (!box) return
  box.hidden = !['owner', 'admin'].includes(state.role)
  if (box.hidden) return
  async function api(path, data) {
    const r = await fetch('/api/admin/operations/' + path, {
      cache: 'no-store',
      ...(data
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        : {}),
    })
    const j = await r.json()
    if (!r.ok)
      throw Error(
        j.error ?? 'Operations check failed; refresh for status.',
      )
    return j
  }
  async function load() {
    try {
      const d = await api('state')
      box.replaceChildren(
        el('h2', 'Business and operations'),
        el(
          'p',
          `${d.mode === 'test' ? 'TEST / SANDBOX — no live revenue' : 'LIVE'} · Pro checkout ${d.gates.pro ? 'enabled' : 'disabled'} · Deep Dive checkout ${d.gates.deepDive ? 'enabled' : 'disabled'}`,
        ),
        el('p', d.revenue),
        el('p', d.analytics),
      )
      const dl = el('dl', '')
      for (const [k, v] of Object.entries(d.counts))
        dl.append(el('dt', k.replaceAll('_', ' ')), el('dd', String(v)))
      box.append(
        dl,
        el(
          'p',
          `${d.product.facilities} reviewed facilities · ${d.product.organizations} organizations · ${d.product.reports} generated reports · ${d.product.inventory}`,
        ),
      )
      const refresh = el('button', 'Refresh operations')
      refresh.onclick = () => void load()
      const check = el(
        'button',
        'Validate Stripe configuration (read only)',
      )
      check.onclick = async () => {
        check.disabled = true
        try {
          await api('commerce-check', {})
          await load()
        } catch (e) {
          box.append(el('p', e.message))
          check.disabled = false
        }
      }
      box.append(refresh, check, el('h3', 'Checks'))
      for (const c of d.checks)
        box.append(
          el(
            'p',
            `${c.name}: ${Date.now() - c.checked_at > (c.name === 'scheduler' ? 15 * 60 * 1000 : c.name === 'stripe-catalog' ? 26 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000) ? 'STALE' : c.status} · ${new Date(c.checked_at).toLocaleString()} · ${c.summary}`,
          ),
        )
      box.append(
        el('h3', 'Emergency subsystem controls'),
        el(
          'p',
          'Disable an affected subsystem or restore its configured behavior. These controls cannot open deployment-disabled commerce. Changes are audited.',
        ),
      )
      for (const name of d.controlNames) {
        const form = el('form', ''),
          disabled = d.controls.some(
            (c) => c.name === name && c.disabled === 1,
          )
        const label = el(
          'label',
          `${name}: ${disabled ? 'emergency disabled' : 'configured behavior'} — reason `,
        )
        const reason = el('input', '')
        reason.required = true
        reason.minLength = 10
        reason.maxLength = 500
        label.append(reason)
        const button = el(
          'button',
          disabled ? 'Restore configured ' + name : 'Disable ' + name,
        )
        form.append(label, button)
        form.onsubmit = async (e) => {
          e.preventDefault()
          button.disabled = true
          try {
            await api('control', {
              name,
              disabled: !disabled,
              reason: reason.value,
            })
            await load()
          } catch (e) {
            box.append(el('p', e.message))
            button.disabled = false
          }
        }
        box.append(form)
      }
      const table = el('table', ''),
        head = el('tr', '')
      for (const h of [
        'UTC day',
        'Event',
        'Mode',
        'Count',
        'Failures',
        'Mean sampled ms',
      ])
        head.append(el('th', h))
      table.append(head)
      for (const m of d.metrics) {
        const row = el('tr', '')
        for (const value of [
          m.day,
          m.event,
          m.mode,
          m.count,
          m.failures,
          Math.round(m.total_ms / m.count),
        ])
          row.append(el('td', String(value)))
        table.append(row)
      }
      box.append(el('h3', 'Aggregate events — rolling 30 days'), table)
    } catch (e) {
      box.replaceChildren(
        el('h2', 'Business and operations'),
        el('p', e.message),
      )
      const retry = el('button', 'Retry operations')
      retry.onclick = () => void load()
      box.append(retry)
    }
  }
  void load()
}
