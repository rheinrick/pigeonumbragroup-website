import { parse } from 'jsonc-parser'
import { verifyAccess } from './access-policy.mjs'
// Deployment is allowed only after a live, narrow Access policy has been verified.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const account = '953e6b157cc6a36fcdf1bf65eee31879'
const hostname = 'admin.pigeonumbragroup.com'
const email = 'sudopug1337@datacenterdata.net'
const token = process.env.CLOUDFLARE_API_TOKEN
if (!token)
  throw Error(
    'Supply a Cloudflare API token with Access Read and Worker deploy permissions through the environment; never commit it.',
  )
const configErrors = []
const backend = parse(
  readFileSync(
    new URL(
      '../../datacenterdata-website/wrangler.control.jsonc',
      import.meta.url,
    ),
    'utf8',
  ),
  configErrors,
  { allowTrailingComma: true },
)
if (configErrors.length)
  throw Error('Invalid private Worker configuration. Deployment stopped.')
async function api(path) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}${path}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    },
  )
  const value = await response.json()
  if (!response.ok || !value.success)
    throw Error('Could not verify Cloudflare Access. Deployment stopped.')
  return value.result
}
const apps = await api('/access/apps')
const app = apps.find(
  (app) => app.type === 'self_hosted' && app.domain === hostname,
)
if (!app) throw Error('Access application not configured.')
const organization = await api('/access/organizations')
const policies = await api(`/access/apps/${app.id}/policies`)
verifyAccess({
  apps,
  app,
  organization,
  policies,
  backend: backend.vars,
  hostname,
  email,
})
const result = spawnSync(
  process.execPath,
  ['node_modules/wrangler/bin/wrangler.js', 'deploy'],
  { stdio: 'inherit' },
)
process.exit(result.status ?? 1)
