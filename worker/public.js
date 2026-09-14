import { landing } from './landing.js'
export default {
  async fetch(request, env) {
    return await landing(request, env) ?? new Response('Not found', { status: 404 })
  },
}
