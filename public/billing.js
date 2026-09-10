const node = (tag, text) => {
  const el = document.createElement(tag)
  el.textContent = text
  return el
}
export function setupBilling(state) {
  const box = document.getElementById('billing')
  if (!box) return
  box.hidden = !['owner', 'admin', 'readonly'].includes(state.role)
  if (box.hidden) {
    box.replaceChildren()
    return
  }
  async function load() {
    try {
      const r = await fetch('/api/admin/billing/state', { cache: 'no-store' }),
        data = await r.json()
      if (!r.ok) throw Error(data.error ?? 'Billing unavailable.')
      box.replaceChildren(
        node('h2', 'Billing'),
        node(
          'p',
          `${data.mode.toUpperCase()} · Pro checkout ${data.gates.pro ? 'enabled' : 'disabled'} · Deep Dive checkout ${data.gates.deepDive ? 'enabled' : 'disabled'}`,
        ),
        node(
          'p',
          `${data.customersCount} customers · ${data.overview?.activePro ?? 0} active Pro · ${data.overview?.canceling ?? 0} canceling · ${data.overview?.paymentProblems ?? 0} payment problems · ${data.purchasesCount} purchases`,
        ),
      )
      for (const [key, title, fields] of [
        [
          'customers',
          'Customers',
          [
            'user_name',
            'user_id',
            'stripe_customer_id',
            'plan',
            'subscription_status',
            'purchase_count',
            'created_at',
          ],
        ],
        [
          'subscriptions',
          'Subscriptions',
          [
            'user_id',
            'id',
            'status',
            'current_period_end',
            'cancel_at_period_end',
          ],
        ],
        [
          'purchases',
          'Purchases',
          [
            'user_id',
            'facility_id',
            'amount',
            'currency',
            'status',
            'purchased_at',
            'refunded_at',
          ],
        ],
        [
          'webhooks',
          'Webhooks',
          [
            'id',
            'event_type',
            'received_at',
            'processed_at',
            'status',
            'attempts',
            'error_summary',
          ],
        ],
      ]) {
        const section = node('details', ''),
          summary = node('summary', title),
          wrap = node('div', ''),
          table = node('table', ''),
          head = node('tr', '')
        wrap.className = 'billing-table'
        fields.forEach((f) => head.append(node('th', f.replaceAll('_', ' '))))
        table.append(head)
        for (const row of data[key]) {
          const tr = node('tr', '')
          for (const f of fields) tr.append(node('td', row[f] ?? '—'))
          table.append(tr)
        }
        if (!data[key].length) section.append(node('p', 'No records yet.'))
        wrap.append(table)
        section.prepend(summary)
        section.append(wrap)
        box.append(section)
      }
      box.append(
        node(
          'p',
          'Showing the latest 100 records in each view. Counts cover all records. Amounts are in cents; timestamps are UTC epoch milliseconds.',
        ),
      )
      if (data.canReconcile) {
        const form = node('form', ''),
          type = document.createElement('select'),
          id = document.createElement('input'),
          reason = document.createElement('input'),
          button = node('button', 'Reconcile'),
          notice = node('p', '')
        type.append(
          new Option('Customer ID', 'customerId'),
          new Option('Subscription ID', 'subscriptionId'),
        )
        type.setAttribute('aria-label', 'Reconciliation type')
        id.placeholder = 'Stripe customer or subscription ID'
        id.setAttribute('aria-label', 'Stripe object ID')
        id.required = true
        reason.placeholder = 'Reason for reconciliation'
        reason.setAttribute('aria-label', 'Reconciliation reason')
        reason.required = true
        reason.minLength = 3
        notice.setAttribute('role', 'status')
        form.append(type, id, reason, button, notice)
        form.onsubmit = async (e) => {
          e.preventDefault()
          button.disabled = true
          try {
            const res = await fetch('/api/admin/billing/reconcile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                [type.value]: id.value,
                reason: reason.value,
              }),
            })
            const result = await res.json()
            if (!res.ok) throw Error(result.error)
            await load()
            box.append(node('p', 'Reconciled and recorded in the audit log.'))
          } catch (e) {
            notice.textContent = e.message
          } finally {
            button.disabled = false
          }
        }
        box.append(form)
      }
    } catch (e) {
      box.replaceChildren(node('h2', 'Billing'), node('p', e.message))
    }
  }
  void load()
}
