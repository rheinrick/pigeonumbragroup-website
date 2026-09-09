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
        env: { ...process.env, CLOUDFLARE_API_TOKEN: 'test-token-never-sent' },
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
