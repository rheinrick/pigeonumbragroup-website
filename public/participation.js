const el = (tag, value = '') => {
  const n = document.createElement(tag)
  n.textContent = value
  return n
}
const pretty = (s) => String(s ?? '').replaceAll('_', ' ')
function field(
  form,
  label,
  name,
  { value = '', type = 'text', options, required = true } = {},
) {
  const l = el('label', label + ' '),
    n = el(options ? 'select' : type === 'textarea' ? 'textarea' : 'input')
  n.name = name
  n.required = required
  if (options) for (const v of options) n.add(new Option(pretty(v), v))
  else if (type !== 'textarea') n.type = type
  n.value = value
  if (type === 'textarea') n.maxLength = 5000
  l.append(n)
  form.append(l)
  return n
}
const decisions = {
  claim: ['approved', 'rejected', 'needs_more_information', 'deferred'],
  association: ['approved', 'rejected', 'needs_more_information', 'deferred'],
  correction: [
    'accepted',
    'partially_accepted',
    'rejected',
    'needs_more_information',
    'deferred',
    'duplicate',
    'superseded',
  ],
  response: ['approved', 'rejected', 'needs_more_information', 'deferred'],
  contact: ['approved', 'rejected', 'needs_more_information', 'deferred'],
  sensitive: ['accepted', 'rejected', 'needs_more_information', 'deferred'],
  candidate: [
    'accepted',
    'rejected',
    'needs_more_information',
    'deferred',
    'duplicate',
  ],
}
export function setupParticipation(session) {
  const host = document.getElementById('participation')
  if (!host) return
  host.hidden = !['owner', 'admin'].includes(session.role)
  if (host.hidden) {
    host.replaceChildren()
    return
  }
  if (host.dataset.ready) return
  host.dataset.ready = 'true'
  let state
  const notice = el('p'),
    filters = el('form'),
    list = el('div'),
    organizations = el('div'),
    notifications = el('details'),
    next = el('button', 'Older requests'),
    refresh = el('button', 'Refresh participation'),
    exportButton = el('button', 'Export private inventory staging')
  notice.setAttribute('role', 'status')
  notice.setAttribute('aria-label', 'Participation status')
  const kind = field(filters, 'Request type', 'kind', {
      options: ['', ...Object.keys(decisions)],
      required: false,
    }),
    status = field(filters, 'Status', 'status', {
      options: [
        '',
        'submitted',
        'needs_more_information',
        'approved',
        'accepted',
        'partially_accepted',
        'rejected',
        'deferred',
        'revoked',
        'superseded',
        'draft',
      ],
      required: false,
    }),
    org = field(filters, 'Organization', 'organization', {
      options: [''],
      required: false,
    }),
    facility = field(filters, 'Facility ID (optional)', 'facility', {
      required: false,
    }),
    search = field(filters, 'Request ID or display name', 'q', {
      required: false,
    })
  field(filters, 'Correction field', 'field', { required: false })
  field(filters, 'Evidence URL contains', 'source', { required: false })
  field(filters, 'Created on or after', 'from', {
    type: 'date',
    required: false,
  })
  field(filters, 'Submitted as', 'submitter', {
    options: ['', 'company', 'personal'],
    required: false,
  })
  filters.append(el('button', 'Filter requests'))
  host.append(
    el('h2', 'Company participation'),
    el(
      'p',
      'Private claim evidence: owner/admin only. Verification, association, review and publication are separate decisions. Company roles never grant site moderation or paid influence.',
    ),
    notice,
    refresh,
    filters,
    exportButton,
    list,
    next,
    organizations,
    notifications,
  )
  async function api(path, payload) {
    const r = await fetch('/api/admin/participation/' + path, {
        cache: 'no-store',
        ...(payload
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...payload,
                expectedRevision: state.revision,
              }),
            }
          : {}),
      }),
      d = await r.json()
    if (!r.ok) throw Error(d.error ?? 'Request failed.')
    return d
  }
  async function action(path, payload) {
    try {
      notice.textContent = 'Saving…'
      await api(path, payload)
      await load()
      notice.textContent =
        path === 'review'
          ? 'Review saved. Nothing was published.'
          : path === 'publish'
            ? 'Approved publication is now visible.'
            : 'Saved and recorded in the audit history.'
    } catch (e) {
      notice.textContent = e.message
    }
  }
  async function load(before = '') {
    try {
      const selected = org.value
      state = await api(
        'state?' +
          new URLSearchParams({
            ...Object.fromEntries(new FormData(filters)),
            kind: kind.value,
            status: status.value,
            organization: selected,
            facility: facility.value,
            q: search.value,
            ...(before ? { before: String(before) } : {}),
          }),
      )
      org.replaceChildren(
        new Option('All organizations', ''),
        ...state.organizations.map((o) => new Option(o.name, o.id)),
      )
      org.value = selected
      list.replaceChildren(...state.submissions.map(render))
      next.disabled = !state.next
      renderOrganizations()
      renderNotifications()
      notice.textContent = `Loaded ${state.submissions.length} requests. ${state.staging.filter((s) => s.status === 'staged').length} recent inventory changes staged; release review still required.`
    } catch (e) {
      notice.textContent = e.message
    }
  }
  function reasonForm(label, callback) {
    const form = el('form')
    const reason = field(
      form,
      'Decision reason (required, at least 20 characters)',
      'reason',
      { type: 'textarea' },
    )
    reason.minLength = 20
    form.append(el('button', label))
    form.onsubmit = (e) => {
      e.preventDefault()
      callback(new FormData(form))
    }
    return form
  }
  function history(id, card) {
    const btn = el('button', 'Load private audit history'),
      out = el('div')
    btn.onclick = async () => {
      try {
        const d = await api('history?id=' + encodeURIComponent(id))
        out.replaceChildren(
          ...d.events.map((e) => {
            const row = el('details')
            row.append(
              el('summary', `${e.created_at} · ${e.action} · ${e.actor}`),
              el('p', e.reason),
              el(
                'pre',
                JSON.stringify(
                  {
                    previous: JSON.parse(e.previous_state),
                    result: JSON.parse(e.resulting_state),
                  },
                  null,
                  2,
                ),
              ),
            )
            return row
          }),
        )
      } catch (e) {
        notice.textContent = e.message
      }
    }
    card.append(btn, out)
  }
  function render(s) {
    const card = el('details'),
      name =
        state.organizations.find((o) => o.id === s.organization_id)?.name ??
        'Personal submission'
    card.append(
      el(
        'summary',
        `${name} · ${pretty(s.kind)} · ${pretty(s.status)} · v${s.version}`,
      ),
      el(
        'p',
        `Request ${s.id} · ${s.user_name ?? s.user_id} · Facility ${s.facility_id ?? 'Organization / discovery'}`,
      ),
      el(
        'p',
        `Created ${s.created_at}; reviewed ${s.reviewed_at ?? 'not yet'}`,
      ),
      el('p', s.decision_reason ?? 'No decision recorded.'),
    )
    if (
      state.staging.some(
        (r) => r.submission_id === s.id && r.status === 'staged',
      )
    )
      card.append(
        reasonForm('Withdraw from inventory staging', (d) =>
          action('supersede-staging', { id: s.id, reason: d.get('reason') }),
        ),
      )
    const evidence = el('details')
    evidence.append(
      el('summary', 'Private identity, evidence and submitted text'),
      el('pre', JSON.stringify(s.payload, null, 2)),
    )
    card.append(evidence)
    for (const url of s.payload.evidence ?? []) {
      const a = el('a', 'Open submitted source')
      a.href = url
      a.target = '_blank'
      a.rel = 'noreferrer'
      card.append(a, el('br'))
    }
    if (s.kind === 'claim')
      card.append(
        el(
          'p',
          'Manual review required: check authority, look-alike or contractor domains, acquisitions and conflicting independent evidence. Email domain alone never verifies this claim.',
        ),
      )
    if (s.current) {
      const provenance = el('details')
      provenance.append(
        el('summary', 'Current catalog source and confidence record'),
        el('pre', JSON.stringify(s.current, null, 2)),
      )
      card.append(provenance)
    }
    if (s.payload.changes) {
      const table = el('table'),
        head = el('tr')
      for (const t of ['Field', 'At submission', 'Current catalog', 'Proposed'])
        head.append(el('th', t))
      table.append(head)
      for (const [f, v] of Object.entries(s.payload.changes)) {
        const r = el('tr')
        for (const val of [f, s.baseline[f], s.current?.[f], v])
          r.append(
            el('td', typeof val === 'string' ? val : JSON.stringify(val)),
          )
        table.append(r)
      }
      const wrap = el('div')
      wrap.className = 'participation-table'
      wrap.append(table)
      card.append(wrap)
    }
    if (
      ['submitted', 'deferred', 'needs_more_information'].includes(s.status)
    ) {
      const form = reasonForm('Save review', (d) => {
        const payload = {
          id: s.id,
          version: s.version,
          status: d.get('status'),
          reason: d.get('reason'),
          role: d.get('role'),
          expiresAt: d.get('expiresAt'),
          verificationMethods: d.getAll('verificationMethods'),
          reverifyOrganization: d.get('reverify') === 'on',
          acknowledgeConflict: d.get('conflict') === 'on',
          remedy: d.get('remedy'),
          acceptedFields: d.getAll('acceptedFields'),
        }
        void action('review', payload)
      })
      field(form, 'Decision', 'status', {
        options: decisions[s.kind],
        value: decisions[s.kind][0],
      })
      if (s.kind === 'claim') {
        field(form, 'Company role', 'role', {
          options: ['representative', 'editor', 'company_administrator'],
          value: 'representative',
        })
        field(form, 'Verification expiry', 'expiresAt', {
          type: 'date',
          value: new Date(Date.now() + 180 * 86400000)
            .toISOString()
            .slice(0, 10),
        })
        for (const m of [
          'corporate_email',
          'official_website',
          'documentation',
          'manual_cross_check',
        ]) {
          const l = el('label', pretty(m) + ' '),
            i = el('input')
          i.type = 'checkbox'
          i.name = 'verificationMethods'
          i.value = m
          l.prepend(i)
          form.append(l)
        }
        const l = el(
            'label',
            ' Renew a revoked/expired organization after fresh evidence review',
          ),
          i = el('input')
        i.type = 'checkbox'
        i.name = 'reverify'
        l.prepend(i)
        form.append(l)
      }
      if (['correction', 'sensitive'].includes(s.kind)) {
        for (const f of Object.keys(s.payload.changes ?? {})) {
          const l = el('label', ' Accept field: ' + f),
            i = el('input')
          i.type = 'checkbox'
          i.name = 'acceptedFields'
          i.value = f
          i.checked = true
          l.prepend(i)
          form.append(l)
        }
        const l = el(
            'label',
            ' I reviewed any difference between the original and current catalog values',
          ),
          i = el('input')
        i.type = 'checkbox'
        i.name = 'conflict'
        l.prepend(i)
        form.append(l)
      }
      if (s.kind === 'sensitive')
        field(form, 'Sensitive-review outcome', 'remedy', {
          options: [
            'retain',
            'reduce_precision',
            'remove_unsupported_detail',
            'redact_field',
            'reject',
          ],
          value: 'retain',
        })
      card.append(form)
    }
    const published = state.publications.find((p) => p.submission_id === s.id)
    if (published)
      card.append(
        el('p', `PUBLISHED ${published.published_at}`),
        reasonForm(
          'Withdraw this publication',
          (d) =>
            void action('unpublish', {
              id: s.id,
              version: s.version,
              reason: d.get('reason'),
            }),
        ),
      )
    else if (
      ['response', 'contact', 'sensitive'].includes(s.kind) &&
      ['approved', 'accepted'].includes(s.status)
    ) {
      const form = reasonForm(
        'Publish approved version',
        (d) =>
          void action('publish', {
            id: s.id,
            version: s.version,
            reason: d.get('reason'),
            publicNote: d.get('publicNote'),
          }),
      )
      if (s.kind === 'sensitive')
        field(
          form,
          'Public editorial dispute note (only if appropriate)',
          'publicNote',
          { type: 'textarea' },
        )
      form.prepend(
        el(
          'p',
          'This action publishes the approved text or explicitly public contacts. Source record changes still require inventory release activation.',
        ),
      )
      card.append(form)
    }
    history(s.id, card)
    return card
  }
  function renderOrganizations() {
    organizations.replaceChildren(
      el('h3', 'Verified organizations and representatives'),
    )
    for (const v of state.verifications) {
      const org = state.organizations.find((o) => o.id === v.organization_id),
        card = el('details')
      card.append(
        el('summary', `${org?.name ?? v.organization_id} · ${v.status}`),
        el('p', `Verified ${v.verified_at}; expires ${v.expires_at}`),
      )
      if (v.status === 'verified')
        card.append(
          reasonForm(
            'Revoke organization verification',
            (d) =>
              void action('revoke', {
                organizationId: v.organization_id,
                reason: d.get('reason'),
              }),
          ),
        )
      history(v.organization_id + ':organization', card)
      for (const m of state.memberships.filter(
        (m) => m.organization_id === v.organization_id,
      )) {
        const row = el('article')
        row.append(
          el('h4', `${m.name} · ${pretty(m.role)} · ${m.status}`),
          el('p', `Expires ${m.expires_at}; verified by ${m.verified_by}`),
        )
        if (m.status === 'active') {
          const form = reasonForm(
            'Update company role',
            (d) =>
              void action('membership', {
                organizationId: m.organization_id,
                userId: m.user_id,
                role: d.get('role'),
                reason: d.get('reason'),
              }),
          )
          field(form, 'Company role', 'role', {
            options: ['representative', 'editor', 'company_administrator'],
            value: m.role,
          })
          row.append(
            form,
            reasonForm(
              'Revoke representative',
              (d) =>
                void action('revoke', {
                  organizationId: m.organization_id,
                  userId: m.user_id,
                  reason: d.get('reason'),
                }),
            ),
          )
        }
        history(m.organization_id + ':' + m.user_id, row)
        card.append(row)
      }
      for (const a of state.associations.filter(
        (a) => a.organization_id === v.organization_id,
      )) {
        card.append(
          el(
            'p',
            `Facility ${a.facility_id} · ${pretty(a.relationship)} · ${a.status}`,
          ),
        )
        if (a.status === 'approved')
          card.append(
            reasonForm(
              'Revoke facility associations',
              (d) =>
                void action('revoke', {
                  organizationId: a.organization_id,
                  facilityId: a.facility_id,
                  reason: d.get('reason'),
                }),
            ),
          )
      }
      organizations.append(card)
    }
  }
  function renderNotifications() {
    notifications.replaceChildren(el('summary', 'Status notification delivery'))
    for (const n of state.notifications) {
      const row = el(
        'p',
        `${n.submission_id} · ${pretty(n.event_status)} · ${n.status === 'sent' ? 'Accepted by email provider' : n.status} · ${n.attempts} attempts`,
      )
      if (n.status === 'failed') {
        const b = el('button', 'Retry failed notification')
        b.onclick = () =>
          void action('retry-notification', {
            id: n.id,
            reason: 'Retrying the failed participation status notification.',
          })
        row.append(b)
      }
      notifications.append(row)
    }
  }
  filters.onsubmit = (e) => {
    e.preventDefault()
    void load()
  }
  refresh.onclick = () => void load()
  next.onclick = () => void load(state.next)
  exportButton.onclick = async () => {
    try {
      const d = await api('export'),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }),
        ),
        a = el('a')
      a.href = url
      a.download = 'private-participation-inventory-review.json'
      a.click()
      URL.revokeObjectURL(url)
      notice.textContent =
        'Private staging export downloaded. Review source rights and normalize through the inventory release tool before publication.'
    } catch (e) {
      notice.textContent = e.message
    }
  }
  void load()
}
