const node = (tag, text) => {
  const e = document.createElement(tag)
  e.textContent = text
  return e
}
export function setupDeepDives(state) {
  const box = document.getElementById('deep-dives')
  if (!box) return
  box.hidden = !['owner', 'admin', 'readonly'].includes(state.role)
  if (box.hidden) {
    box.replaceChildren()
    return
  }
  async function load() {
    try {
      const response = await fetch('/api/admin/deep-dives', {
          cache: 'no-store',
        }),
        data = await response.json()
      if (!response.ok)
        throw Error(data.error ?? 'Deep Dives unavailable.')
      const count = (status) =>
        data.purchases.find((p) => p.status === status)?.count ?? 0
      box.replaceChildren(
        node('h2', 'Deep Dives'),
        node(
          'p',
          `${data.reports} generated / limited reports · ${data.facilities.length - data.reports} unavailable · ${count('paid')} paid purchases · ${data.entitlements?.count ?? 0} active entitlements · ${count('refunded')} refunded`,
        ),
        node(
          'p',
          `Release ${data.release} · Generated ${data.generatedAt}`,
        ),
        node(
          'p',
          `Inventory ${data.facilityRelease} · Sources ${data.contextReleases.join(', ')}`,
        ),
        node(
          'p',
          `${data.registry.filter((m) => m.deepDiveEligible).length} radius measures · ${data.failures.length} generation failures`,
        ),
      )
      const refresh = node('button', 'Refresh Deep Dives')
      refresh.onclick = () => void load()
      box.append(refresh)
      const label = node('label', 'Find facility '),
        search = node('input', ''),
        list = node('div', '')
      search.type = 'search'
      label.append(search)
      box.append(label, list)
      function render() {
        list.replaceChildren()
        for (const f of data.facilities.filter((f) =>
          `${f.name} ${f.operator}`
            .toLowerCase()
            .includes(search.value.toLowerCase()),
        )) {
          const details = node('details', '')
          details.append(
            node(
              'summary',
              `${f.name} — ${f.status.replaceAll('_', ' ')}`,
            ),
            node('p', `${f.operator} · ${f.facilityId}`),
            node('p', `Reasons: ${f.reasons.join(', ')}`),
            node(
              'p',
              `Radius measures: ${f.categories.join(', ') || 'None'}`,
            ),
            node(
              'p',
              `Regional context: ${f.contextCategories?.join(', ') || 'None'}`,
            ),
            node(
              'p',
              `Missing measures: ${f.missingMeasures?.join(', ') || 'Report unavailable'}`,
            ),
            node(
              'p',
              `Validation: ${f.validationStatus ?? 'Not generated'} · ${f.generationStatus ?? (f.available ? 'Generated' : 'Not generated')}`,
            ),
          )
          if (f.locationReview)
            details.append(
              node(
                'p',
                `Location: ${f.locationReview.precision} · reviewed ${f.locationReview.reviewedAt} · ${f.locationReview.reason}`,
              ),
            )
          if (f.sourceDates)
            details.append(
              node(
                'p',
                `Census published ${f.sourceDates.censusPublishedAt}; observations ${f.sourceDates.period}; geography ${f.sourceDates.geographicVintage}`,
              ),
            )
          list.append(details)
        }
      }
      search.oninput = render
      render()
      const failures = node('details', '')
      failures.append(
        node('summary', 'Generation failures and retry workflow'),
      )
      for (const f of data.failures)
        failures.append(node('p', `${f.facilityId}: ${f.reason}`))
      failures.append(
        node(
          'p',
          data.failures.length
            ? 'Resolve recorded failures before publication.'
            : 'No failures in the published generation.',
        ),
        node('p', data.generationWorkflow),
      )
      box.append(failures)
    } catch (e) {
      box.replaceChildren(node('h2', 'Deep Dives'), node('p', e.message))
    }
  }
  void load()
}
