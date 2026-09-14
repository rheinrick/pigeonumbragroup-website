const video = document.querySelector('video')
const control = document.querySelector('#motion-control')
const label = document.querySelector('#motion-label')
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const connection = navigator.connection
let wantsMotion = !reduced.matches && !connection?.saveData
let attempt = 0
const update = () => {
  const playing = !video.paused && !video.error
  label.textContent = playing ? 'Pause motion' : 'Play motion'
  control.dataset.playing = String(playing)
}
const stop = () => {
  attempt++
  video.pause()
  update()
}
const play = async () => {
  if (!wantsMotion || document.hidden) return
  const current = ++attempt
  if (!video.getAttribute('src')) {
    video.src = '/landing/media/pigeons-v1.mp4'
    video.load()
  }
  try {
    await video.play()
    if (!wantsMotion || document.hidden) video.pause()
  } catch {
    if (current === attempt) {
      wantsMotion = false
      video.classList.remove('has-frame')
    }
  }
  update()
}
video.addEventListener('playing', () => {
  if (!wantsMotion || document.hidden) { stop(); return }
  video.classList.add('has-frame')
  update()
})
video.addEventListener('pause', update)
video.addEventListener('error', () => {
  wantsMotion = false
  stop()
  video.classList.remove('has-frame')
})
control.addEventListener('click', () => {
  wantsMotion = video.paused
  if (wantsMotion) {
    if (video.error) { video.removeAttribute('src'); video.load() }
    void play()
  } else stop()
})
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop()
  else if (wantsMotion) void play()
})
const preferenceChanged = () => {
  if (reduced.matches || connection?.saveData) {
    wantsMotion = false
    stop()
    video.classList.remove('has-frame')
    video.removeAttribute('src')
    video.load()
  }
}
reduced.addEventListener('change', preferenceChanged)
connection?.addEventListener('change', preferenceChanged)
document.querySelector('#year').textContent = String(new Date().getFullYear())
control.hidden = false
if (wantsMotion) void play()
