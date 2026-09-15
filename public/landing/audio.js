(() => {
  const control = document.querySelector('#audio-control')
  const url = control?.dataset.audioSrc
  const AudioEngine = window.AudioContext || window.webkitAudioContext
  if (!url || !AudioEngine) return
  const label = control.querySelector('span')
  const status = document.querySelector('#audio-status')
  let context, gain, source, buffer, loading, enabled = false, revision = 0
  const quiet = () => {
    if (!gain) return
    gain.disconnect()
    gain.gain.cancelScheduledValues(context.currentTime)
    gain.gain.setValueAtTime(0, context.currentTime)
  }
  const render = (pending = false) => {
    label.textContent = enabled ? (pending ? 'Cancel audio' : 'Mute audio') : 'Enable audio'
    control.setAttribute('aria-pressed', String(enabled))
    control.setAttribute('aria-busy', String(pending))
  }
  const mute = () => {
    enabled = false
    revision++
    quiet()
    loading?.abort()
    context?.suspend().catch(() => {})
    render()
  }
  const play = async () => {
    const attempt = ++revision
    try {
      if (!context) {
        context = new AudioEngine()
        gain = context.createGain()
        gain.gain.value = 0
      }
      // Called synchronously from the explicit click before fetching the asset.
      const resumed = context.resume().then(() => null, error => error)
      if (!buffer) {
        render(true)
        loading = new AbortController()
        const response = await fetch(url, { signal: loading.signal })
        if (!response.ok) throw new Error('Audio unavailable')
        buffer = await context.decodeAudioData(await response.arrayBuffer())
      }
      const resumeError = await resumed
      if (resumeError) throw resumeError
      if (attempt !== revision || !enabled || document.hidden) return
      if (context.state !== 'running') throw new Error('Playback unavailable')
      if (!source) {
        source = context.createBufferSource()
        source.buffer = buffer
        source.loop = true
        source.connect(gain)
        source.start()
      }
      quiet()
      gain.connect(context.destination)
      gain.gain.linearRampToValueAtTime(0.2, context.currentTime + 2.5)
      render()
    } catch (error) {
      if (attempt !== revision) return
      mute()
      status.textContent = 'Audio could not start. Please try again.'
    }
  }
  control.addEventListener('click', () => {
    status.textContent = ''
    if (enabled) mute()
    else { enabled = true; play() }
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      revision++
      quiet()
      loading?.abort()
      context?.suspend().catch(() => {})
    } else if (enabled) play()
  })
  // Back/forward cache restoration is a fresh, silent arrival too.
  window.addEventListener('pagehide', mute)
  control.hidden = false
  document.querySelector('#audio-credits').hidden = false
  render()
})()
