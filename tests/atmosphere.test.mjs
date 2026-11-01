import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

test('background motion respects preferences, tab visibility and a manual pause', () => {
  const source = readFileSync(new URL('../public/landing/atmosphere-v2.js', import.meta.url), 'utf8')
  for (const setting of ['normal', 'reduced', 'save-data']) {
    const handlers = {}
    const control = { querySelector: () => ({}), addEventListener: (_, fn) => { handlers.click = fn } }
    const label = {}
    const reduced = { matches: setting === 'reduced', addEventListener: (_, fn) => { handlers.reduced = fn } }
    const connection = { saveData: setting === 'save-data', addEventListener: (_, fn) => { handlers.connection = fn } }
    let moving
    const document = {
      hidden: false,
      body: { classList: { toggle: (_, value) => { moving = value } } },
      querySelector: selector => selector === '#atmosphere-control' ? control : selector === '#atmosphere-label' ? label : {},
      addEventListener: (_, fn) => { handlers.visibility = fn },
    }
    runInNewContext(source, { document, navigator: { connection }, matchMedia: () => reduced })
    assert.equal(moving, setting === 'normal')
    assert.equal(control.hidden, setting === 'reduced')
    if (setting !== 'normal') continue
    document.hidden = true; handlers.visibility(); assert.equal(moving, false)
    document.hidden = false; handlers.visibility(); assert.equal(moving, true)
    handlers.click(); handlers.visibility(); assert.equal(moving, false)
    assert.equal(label.textContent, 'Play motion')
    handlers.click(); assert.equal(moving, true)
    connection.saveData = true; handlers.connection(); assert.equal(moving, false)
    connection.saveData = false; handlers.click(); assert.equal(moving, true)
    reduced.matches = true; handlers.reduced(); assert.equal(moving, false)
    assert.equal(control.hidden, true)
    reduced.matches = false; handlers.reduced(); assert.equal(moving, false)
  }
})
