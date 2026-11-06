import { panelActions } from './panel-actions.js'
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
  const { load, save } = panelActions(box, '/api/admin/billing/', 'billing', 'Billing', data => {
      const box = document.createDocumentFragment()
      box.append(
        node(
          'p',
          `${data.mode.toUpperCase()} · Pro checkout ${data.gates.pro ? 'enabled' : 'disabled'} · Deep Dive checkout ${data.gates.deepDive ? 'enabled' : 'disabled'}`,
        ),
        node(
          'p',
          `${data.customersCount} customers · ${data.overview?.activePro ?? 0} active Pro · ${data.overview?.canceling ?? 0} canceling · ${data.overview?.paymentProblems ?? 0} payment problems · ${data.purchasesCount} purchases`,
        ),
      )
      if (data.product)
        box.append(
          node('h3', 'Pro product'),
          node(
            'p',
            `${data.product.entitledUsers} locally entitled users · ${data.product.freeLayers} Free layers · ${data.product.proLayers} Pro layers · ${data.product.comparisonLayers} comparison eligible · ${data.product.analyticsLayers} analysis eligible · Release ${data.product.release}`,
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
      if (state.role !== 'readonly' && data.canReconcile) {
        const form = node('form', ''),
          type = document.createElement('select'),
          id = document.createElement('input'),
          reason = document.createElement('input'),
          button = node('button', 'Reconcile')
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
        form.append(type, id, reason, button)
        form.onsubmit = e => {
          e.preventDefault()
          void save('reconcile', { [type.value]: id.value, reason: reason.value })
        }
        box.append(form)
      }
      return box
  })
  void load()
}
