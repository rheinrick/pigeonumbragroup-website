// Pure validation used by deployment and tests. Never accepts broad identity rules.
export function verifyAccess({
  apps,
  app,
  organization,
  policies,
  backend,
  hostname,
  email,
}) {
  if (
    !app ||
    app.type !== 'self_hosted' ||
    app.domain !== hostname ||
    !app.aud ||
    app.aud !== backend.ACCESS_AUD
  )
    throw Error(
      'A matching Access application and backend audience are required.',
    )
  if (
    apps.some(
      (other) =>
        other.id !== app.id &&
        (other.domain === hostname || other.domain?.startsWith(`${hostname}/`)),
    )
  )
    throw Error('An overlapping Access application must be reviewed first.')
  if (
    !organization.auth_domain ||
    organization.auth_domain !== backend.ACCESS_TEAM_DOMAIN
  )
    throw Error('Backend Access issuer does not match the organization.')
  const allows = policies.filter((policy) => policy.decision === 'allow')
  const rule = allows[0]?.include?.[0]
  if (
    allows.length !== 1 ||
    policies.some((policy) => !['allow', 'deny'].includes(policy.decision)) ||
    allows[0].include?.length !== 1 ||
    Object.keys(rule ?? {}).join() !== 'email' ||
    rule.email?.email !== email
  )
    throw Error(
      'Access must allow only the existing administrator, with no bypass or service-auth policies.',
    )
  const roles = JSON.parse(backend.ADMIN_ROLES)
  if (
    backend.ADMIN_EMAILS !== email ||
    Object.keys(roles).length !== 1 ||
    roles[email] !== 'owner'
  )
    throw Error(
      'The backend administrator configuration differs from the reviewed allowlist.',
    )
}
