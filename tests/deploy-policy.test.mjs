import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyAccess } from '../scripts/access-policy.mjs'
test('deployment gate rejects missing, broad, bypass, overlapping and mismatched Access configuration', () => {
  const app = {
    id: 'reviewed',
    type: 'self_hosted',
    domain: 'admin.example.test',
    aud: 'audience',
  }
  const input = {
    apps: [app],
    app,
    organization: { auth_domain: 'team.cloudflareaccess.com' },
    policies: [
      {
        decision: 'allow',
        include: [{ email: { email: 'owner@example.test' } }],
      },
    ],
    backend: {
      ACCESS_AUD: 'audience',
      ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
      ADMIN_EMAILS: 'owner@example.test',
      ADMIN_ROLES: '{"owner@example.test":"owner"}',
    },
    hostname: 'admin.example.test',
    email: 'owner@example.test',
  }
  assert.doesNotThrow(() => verifyAccess(input))
  for (const change of [
    { app: null },
    { backend: { ...input.backend, ACCESS_AUD: '' } },
    { organization: { auth_domain: 'wrong.cloudflareaccess.com' } },
    { policies: [{ decision: 'allow', include: [{ everyone: {} }] }] },
    { policies: [...input.policies, { decision: 'bypass' }] },
    { policies: [...input.policies, { decision: 'non_identity' }] },
    { apps: [app, { id: 'other', domain: 'admin.example.test/api' }] },
    { backend: { ...input.backend, ADMIN_EMAILS: 'other@example.test' } },
  ])
    assert.throws(() => verifyAccess({ ...input, ...change }))
})
