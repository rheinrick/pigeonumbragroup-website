// Public release facts only. Never receive profiles, backups or personal cards.
export const origins = Object.freeze(['https://horoscope.baby', 'https://baby-horoscope-staging.rheinrick.workers.dev'])
const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
const maxBytes = 512 * 1024
async function readJson(url, fetcher) {
  const result = await fetcher(url, {
    method: 'GET', redirect: 'manual', cache: 'no-store',
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000),
  })
  if (!result.ok) throw Error(`http-${result.status}`)
  if (!result.headers.get('Content-Type')?.includes('application/json')) throw Error('not-json')
  if (Number(result.headers.get('Content-Length')) > maxBytes) { await result.body?.cancel(); throw Error('Oversized') }
  const reader = result.body?.getReader()
  if (!reader) throw Error('Missing body')
  const parts = []; let size = 0
  try {
    while (true) {
      const {done,value} = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) { await reader.cancel(); throw Error('Oversized') }
      parts.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size); let offset = 0
  for (const part of parts) { bytes.set(part, offset); offset += part.length }
  return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes))
}
function releaseFacts(data, origin) {
  if (!data || typeof data.version !== 'string' || typeof data.revision !== 'string' || !/^[0-9a-f]{16}$/.test(data.version) || !/^[0-9a-f]{40}$/.test(data.revision) ||
      typeof data.dirty !== 'boolean' || !['beta','staging','preview','production'].includes(data.releaseMode) ||
      !['disabled','enabled'].includes(data.indexing) || data.canonicalOrigin !== origins[0] ||
      !Number.isSafeInteger(data.profileSchemaVersion) || data.profileSchemaVersion < 1) throw Error('Invalid release')
  // Deliberately exclude the full file inventory and all unknown fields.
  return {artifact:data.version, revision:data.revision, dirty:data.dirty, mode:data.releaseMode,
    indexing:data.indexing, profileSchemaVersion:data.profileSchemaVersion}
}
function catalogFacts(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.entries) || data.entries.length < 1 || data.entries.length > 10000) throw Error('Invalid catalog')
  const editions = new Set(); const seen = new Set(); const signSet = new Set(); const stages = new Set()
  for (const entry of data.entries) {
    const match = typeof entry.path === 'string' && entry.path.match(/^\/readings\/(\d{4}-\d{2}-\d{2}\.\d+)\/(born|expected)\/([a-z]+)\/[a-z0-9-]+$/)
    if (!match || seen.has(entry.path) || !signs.includes(entry.sign) || entry.sign.toLowerCase() !== match[3]) throw Error('Invalid catalog')
    seen.add(entry.path); editions.add(match[1]); signSet.add(entry.sign); stages.add(match[2])
  }
  return {entries:seen.size, editions:[...editions].sort(), signs:signs.filter(sign=>signSet.has(sign)), stages:[...stages].sort()}
}
async function observe(origin, fetcher) {
  const [release, catalog] = await Promise.allSettled([
    readJson(`${origin}/release.json`,fetcher).then(data=>releaseFacts(data,origin)),
    readJson(`${origin}/reading-manifest.json`,fetcher).then(catalogFacts),
  ])
  const result = {origin, status:release.status === 'fulfilled' && catalog.status === 'fulfilled' ? 'observed' : 'unavailable',
    release:release.status === 'fulfilled' ? release.value : null,
    catalog:catalog.status === 'fulfilled' ? catalog.value : null}
  if (result.status !== 'observed') {
    const code = outcome => {
      if (outcome.status === 'fulfilled') return 'verified'
      const error = outcome.reason
      if (/^http-[1-5][0-9]{2}$/.test(error?.message)) return error.message
      if (['not-json','Oversized','Missing body','Invalid release','Invalid catalog'].includes(error?.message)) return error.message.toLowerCase().replaceAll(' ','-')
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout'
      if (error?.name === 'SyntaxError') return 'invalid-json'
      return 'fetch-unavailable'
    }
    result.message = `Public manifests could not be verified (release: ${code(release)}; content: ${code(catalog)}). Retry or inspect the public site.`
  }
  return result
}
export async function babyOverview(fetcher = (url, init) => fetch(url, init)) {
  return {schemaVersion:1, checkedAt:new Date().toISOString(),
    scope:'Public release manifests only; this is an on-demand observation, not continuous monitoring or a full journey test.',
    surfaces:await Promise.all(origins.map(origin=>observe(origin,fetcher)))}
}
