const control = document.querySelector('#atmosphere-control')
const label = document.querySelector('#atmosphere-label')
const symbol = control.querySelector('.motion-symbol')
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const connection = navigator.connection
let wantsMotion = !reduced.matches && !connection?.saveData

function render() {
  const playing = wantsMotion && !document.hidden && !reduced.matches
  document.body.classList.toggle('is-moving', playing)
  label.textContent = playing ? 'Pause motion' : 'Play motion'
  symbol.textContent = playing ? 'Ⅱ' : '▷'
  control.hidden = reduced.matches
}

control.addEventListener('click', () => { wantsMotion = !wantsMotion; render() })
document.addEventListener('visibilitychange', render)
const preferenceChanged = () => {
  if (reduced.matches || connection?.saveData) wantsMotion = false
  render()
}
reduced.addEventListener('change', preferenceChanged)
connection?.addEventListener('change', preferenceChanged)
document.querySelector('#year').textContent = String(new Date().getFullYear())
render()
