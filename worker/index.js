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
      if (
        !auth.headers.get('Content-Type')?.includes('application/json') ||
        typeof (await auth.json()).reviewer !== 'string'
      )
        return response('The admin backend is not configured yet.', 503)
      if (url.pathname.startsWith('/api/admin/')) {
        if (
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
