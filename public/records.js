// Shared presentation helpers. Data remains text, including untrusted submissions.
export const node = (tag, value = '') => {
  const element = document.createElement(tag)
  element.textContent = value ?? '—'
  return element
}
export function recordTable(label, columns) {
  const wrap = node('div')
  wrap.className = 'table-wrap record-table-wrap'
  wrap.tabIndex = 0
  wrap.setAttribute('role', 'region')
  wrap.setAttribute('aria-label', label)
  const table = node('table')
  table.className = 'record-table'
  const caption = node('caption', label)
  caption.className = 'sr-only'
  const head = node('thead'), row = node('tr'), body = node('tbody')
  for (const column of columns) {
    const th = node('th', column)
    th.scope = 'col'
    row.append(th)
  }
  head.append(row)
  table.append(caption, head, body)
  wrap.append(table)
  const add = (...rows) => {
    for (const row of rows) {
      if (!row.classList.contains('record-detail')) {
        [...row.children].forEach((cell, index) => { cell.dataset.label = columns[index] ?? '' })
      }
      body.append(row)
    }
  }
  return { wrap, body, add }
}
export function recordRow(values) {
  const row = node('tr')
  for (const value of values) {
    const cell = node('td')
    if (value instanceof Node) cell.append(value)
    else cell.textContent = value ?? '—'
    row.append(cell)
  }
  return row
}
let sequence = 0
export function expandableRow(values, label, content) {
  const button = node('button', label)
  button.type = 'button'
  button.className = 'record-toggle'
  const detail = node('tr'), cell = node('td')
  detail.id = `record-detail-${++sequence}`
  detail.className = 'record-detail'
  detail.hidden = true
  cell.colSpan = values.length + 1
  cell.append(content)
  detail.append(cell)
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-controls', detail.id)
  button.onclick = () => {
    detail.hidden = !detail.hidden
    button.setAttribute('aria-expanded', String(!detail.hidden))
  }
  return [recordRow([...values, button]), detail]
}
export function preview(value) {
  const text = node('span', value)
  text.className = 'record-preview'
  return text
}
export function statusLabel(value) {
  const status = node('span', value ?? 'Unknown')
  status.className = 'status-label'
  return status
}
export function displayDate(value) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}
