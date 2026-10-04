import { babyOverview } from './baby-horoscope.js'
const headers = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
}
const response = (message, status) => new Response(message, { status, headers })
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!request.headers.get('Cf-Access-Jwt-Assertion'))
      return response(
        'Administrator sign-in required. Cloudflare Access must be configured for this console.',
        403,
      )
    if (!['GET', 'POST', 'PUT'].includes(request.method))
      return response('Method not allowed', 405)
    if (
      ['POST', 'PUT'].includes(request.method) &&
      request.headers.get('Origin') !== url.origin
    )
      return response('Same-origin request required', 403)
    try {
      // The shared backend verifies the Access signature, audience and admin allowlist.
      const authUrl = new URL('/api/admin/session', url)
      const auth = await env.DATACENTER.fetch(
        new Request(authUrl, {
          headers: {
            'Cf-Access-Jwt-Assertion': request.headers.get(
              'Cf-Access-Jwt-Assertion',
            ),
          },
        }),
      )
      if (!auth.ok) return response('Administrator access denied.', 403)
      if (!auth.headers.get('Content-Type')?.includes('application/json'))
        return response('The admin backend is not configured yet.', 503)
      const identity = await auth.json()
      if (typeof identity.reviewer !== 'string')
        return response('The admin backend is not configured yet.', 503)
      if (url.pathname === '/api/admin/baby-horoscope' || url.pathname.startsWith('/api/admin/baby-horoscope/')) {
        if (url.pathname !== '/api/admin/baby-horoscope/overview') return response('Not found', 404)
        if (!['owner', 'admin', 'readonly'].includes(identity.role)) return response('Baby Horoscope operations permission required.', 403)
        if (request.method !== 'GET') return response('Method not allowed', 405)
        if (url.search) return response('Query parameters are not supported.', 400)
        return Response.json(await babyOverview(), { headers })
      }
      if (url.pathname === '/api/admin/dread' || url.pathname.startsWith('/api/admin/dread/')) {
        const read = ['/api/admin/dread', '/api/admin/dread/state'].includes(url.pathname)
        const write = ['/api/admin/dread/layer', '/api/admin/dread/domain', '/api/admin/dread/publish'].includes(url.pathname)
        if (!read && !write) return response('Not found', 404)
        if (!['owner', 'admin', 'readonly'].includes(identity.role))
          return response('Dread administration permission required.', 403)
        if (request.method !== (read ? 'GET' : 'POST')) return response('Method not allowed', 405)
        if (write && identity.role === 'readonly') return response('Read-only role.', 403)
      }
      if (url.pathname.startsWith('/api/admin/')) {
        if (
          !/^\/api\/admin\/participation\/(state|history|review|publish|unpublish|membership|revoke|export|retry-notification|supersede-staging)$/.test(
            url.pathname,
          ) &&
          !/^\/api\/admin\/dread(?:\/(state|layer|domain|publish))?$/.test(url.pathname) &&
          !/^\/api\/admin\/intelligence\/(state|configure|domain|run|stage|publish|rollback|project)$/.test(url.pathname) &&
          !/^\/api\/admin\/operations\/(state|control|commerce-check)$/.test(url.pathname) &&
          !/^\/api\/admin\/engagement\/(state|run|retry|acceptance)$/.test(url.pathname) &&
          !/^\/api\/admin\/billing\/(state|reconcile)$/.test(url.pathname) &&
          !/^\/api\/admin\/community\/(comments|thread|reports|users|comment|report|user)$/.test(
            url.pathname,
          ) &&
          ![
            '/api/admin/deep-dives',
            '/api/admin/inventory',
            '/api/admin/inventory-review',
            '/api/admin/inventory-export',
            '/api/admin/state',
            '/api/admin/session',
            '/api/admin/object',
            '/api/admin/stage',
            '/api/admin/validate',
            '/api/admin/rollback',
            '/api/admin/decision',
            '/api/admin/publish',
            '/api/admin/retry-contact',
          ].includes(url.pathname)
        )
          return response('Not found', 404)
        const result = await env.DATACENTER.fetch(request)
        return new Response(result.body, {
          status: result.status,
          headers: { ...Object.fromEntries(result.headers), ...headers },
        })
      }
      if (request.method !== 'GET') return response('Method not allowed', 405)
      const result = await env.ASSETS.fetch(request)
      return new Response(result.body, {
        status: result.status,
        headers: { ...Object.fromEntries(result.headers), ...headers },
      })
    } catch {
      return response('The admin service is temporarily unavailable.', 503)
    }
  },
}
