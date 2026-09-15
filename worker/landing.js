// Explicit allowlist: adding an admin file under public/ must never expose it.
const files = new Set([
  '/landing/audio.js', '/landing/credits/', '/landing/media/lobby-waltz-v1.mp3',
  '/landing/landing.css', '/landing/motion.js', '/landing/favicon.svg',
  '/landing/fonts/anton.woff2', '/landing/fonts/OFL.txt',
  '/landing/media/pigeons-v1.mp4', '/landing/media/pigeons-poster-v1.jpg',
  '/landing/media/social-v1.jpg',
])
const publicHosts = new Set(['pigeonumbragroup.com', 'www.pigeonumbragroup.com'])
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
export async function landing(request, env) {
  const url = new URL(request.url)
  const publicHost = publicHosts.has(url.hostname)
  const local = localHosts.has(url.hostname)
  if (!publicHost && !local) return null
  const root = url.pathname === '/'
  if (!root && !files.has(url.pathname)) {
    if (local) return null // Local admin routes retain the existing auth path.
    return new Response('Not found', { status: 404 })
  }
  if (!['GET', 'HEAD'].includes(request.method))
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
  if (root) url.pathname = '/landing/'
  const result = await env.ASSETS.fetch(new Request(url, request))
  const headers = new Headers(result.headers)
  headers.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Cache-Control', root || result.status >= 400 ? 'no-cache' : /\/media\/|\/fonts\//.test(url.pathname) ? 'public, max-age=86400' : 'public, max-age=3600')
  return new Response(request.method === 'HEAD' ? null : result.body, { status: result.status, headers })
}
