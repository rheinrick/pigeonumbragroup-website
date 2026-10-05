import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

test('deployment entrypoint parses companion JSONC and stops when Access is missing', () => {
  const directory = mkdtempSync(join(tmpdir(), 'admin-deploy-'))
  try {
    const consoleDirectory = join(directory, 'console')
    const scripts = join(consoleDirectory, 'scripts')
    const backend = join(directory, 'datacenterdata-website')
    mkdirSync(scripts, { recursive: true })
    mkdirSync(backend)
    for (const name of ['deploy.mjs', 'access-policy.mjs'])
      copyFileSync(
        new URL(`../scripts/${name}`, import.meta.url),
        join(scripts, name),
      )
    symlinkSync(
      fileURLToPath(new URL('../node_modules', import.meta.url)),
      join(consoleDirectory, 'node_modules'),
      'dir',
    )
    writeFileSync(
      join(backend, 'wrangler.control.jsonc'),
      '// Companion configuration — trailing commas are valid.\n{"vars": {},}\n',
    )
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      let calls = 0
      globalThis.fetch = async (url) => {
        if (!url.endsWith('/access/apps')) throw Error('Unexpected API request')
        calls++
        return Response.json({ success: true, result: [] })
      }
      try {
        await import(${JSON.stringify(pathToFileURL(join(scripts, 'deploy.mjs')).href)})
        throw Error('Deployment should have stopped')
      } catch (error) {
        if (error.message !== 'Access application not configured.' || calls !== 1)
          throw error
        console.log('Access checked; deployment stopped before Wrangler.')
      }
    `,
      ],
      {
        cwd: consoleDirectory,
        env: { ...process.env, CLOUDFLARE_API_TOKEN: 'test-token-never-sent', DCD_ADMIN_BACKEND_CONFIG: '' },
        encoding: 'utf8',
        timeout: 10000,
      },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.match(
      result.stdout,
      /Access checked; deployment stopped before Wrangler/,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('explicit backend configuration is parsed and still requires exact live Access policy', () => {
  const directory = mkdtempSync(join(tmpdir(), 'admin-deploy-config-'))
  try {
    const scripts = join(directory, 'console', 'scripts')
    const modules = join(directory, 'console', 'node_modules')
    const companion = join(directory, 'datacenterdata-website')
    const exactBackend = join(directory, 'reviewed backend', 'control.jsonc')
    mkdirSync(scripts, { recursive: true })
    mkdirSync(join(modules, 'wrangler', 'bin'), { recursive: true })
    mkdirSync(companion)
    mkdirSync(join(directory, 'reviewed backend'))
    for (const name of ['deploy.mjs', 'access-policy.mjs'])
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(scripts, name))
    symlinkSync(fileURLToPath(new URL('../node_modules/jsonc-parser', import.meta.url)), join(modules, 'jsonc-parser'), 'dir')
    // Wrangler is a local sentinel. No deployment or provider call can occur.
    writeFileSync(join(modules, 'wrangler', 'bin', 'wrangler.js'), "console.log('LOCAL_WRANGLER_SENTINEL')\n")
    writeFileSync(join(companion, 'wrangler.control.jsonc'), '{ invalid fallback JSONC')
    const email = 'sudopug1337@datacenterdata.net'
    const config = { vars: { ACCESS_AUD: 'reviewed-audience', ACCESS_TEAM_DOMAIN: 'reviewed.cloudflareaccess.com', ADMIN_EMAILS: email, ADMIN_ROLES: JSON.stringify({ [email]: 'owner' }) } }
    const run = (policyEmail) => spawnSync(process.execPath, ['--input-type=module', '-e', `
      const calls = []
      globalThis.fetch = async (url) => {
        calls.push(url)
        const result = url.endsWith('/access/apps') ? [{ id:'reviewed', type:'self_hosted', domain:'admin.pigeonumbragroup.com', aud:'reviewed-audience' }]
          : url.endsWith('/access/organizations') ? { auth_domain:'reviewed.cloudflareaccess.com' }
          : url.endsWith('/access/apps/reviewed/policies') ? [{ decision:'allow', include:[{ email:{ email:${JSON.stringify(policyEmail)} } }] }]
          : (()=>{throw Error('Unexpected API request')})()
        return Response.json({success:true,result})
      }
      try { await import(${JSON.stringify(pathToFileURL(join(scripts, 'deploy.mjs')).href)}) }
      catch(error) {
        console.log('ACCESS_CALL_COUNT=' + calls.length)
        console.error(error.message)
        process.exitCode=1
      }
    `], {cwd:join(directory,'console'),env:{...process.env,CLOUDFLARE_API_TOKEN:'test-token-never-sent',DCD_ADMIN_BACKEND_CONFIG:exactBackend},encoding:'utf8',timeout:10000})
    writeFileSync(exactBackend, '// Explicit reviewed JSONC with a trailing comma.\n' + JSON.stringify(config).slice(0,-1) + ',}\n')
    const accepted = run(email)
    assert.equal(accepted.status, 0, accepted.stderr)
    assert.match(accepted.stdout, /LOCAL_WRANGLER_SENTINEL/)
    const denied = run('different-owner@example.test')
    assert.equal(denied.status, 1)
    assert.match(denied.stderr, /Access must allow only the existing administrator/)
    assert.match(denied.stdout, /ACCESS_CALL_COUNT=3/)
    assert.doesNotMatch(denied.stdout, /LOCAL_WRANGLER_SENTINEL/)
    writeFileSync(exactBackend, '{ malformed explicit JSONC')
    const malformed = run(email)
    assert.equal(malformed.status, 1)
    assert.match(malformed.stderr, /Invalid private Worker configuration/)
    assert.match(malformed.stdout, /ACCESS_CALL_COUNT=0/)
    assert.doesNotMatch(malformed.stdout, /LOCAL_WRANGLER_SENTINEL/)
  } finally { rmSync(directory, {recursive:true,force:true}) }
})
