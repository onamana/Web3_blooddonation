export function accessConfig(env = process.env) {
  const password = env.DEMO_ACCESS_PASSWORD || '';
  const secret = env.DEMO_SESSION_SECRET || '';
  const bypass = env.DEMO_ALLOW_UNAUTHENTICATED === 'true';
  const host = env.HOST || '127.0.0.1';
  if (bypass && (env.NODE_ENV === 'production' || !['127.0.0.1', '::1'].includes(host) || env.TRUST_PROXY === '1')) {
    throw new Error('Unauthenticated demo requires loopback HOST, no proxy and non-production mode');
  }
  if (bypass && password) throw new Error('Choose login or local bypass, not both');
  if (!bypass && (password.length < 16 || secret.length < 32)) {
    throw new Error('Set DEMO_ACCESS_PASSWORD (16+) and DEMO_SESSION_SECRET (32+), or explicitly enable loopback-only DEMO_ALLOW_UNAUTHENTICATED');
  }
  return { host, password, secret };
}
