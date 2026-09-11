import { createHmac, timingSafeEqual } from 'node:crypto';

const cookieName = 'bloodpass_demo';
const lifetime = 8 * 60 * 60;
const equal = (a, b) => {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

// Shared operator login for an invitation-only demo, not hospital identity verification.
export function installDemoAccess(app) {
  const password = process.env.DEMO_ACCESS_PASSWORD;
  const secret = process.env.DEMO_SESSION_SECRET;
  const production = process.env.NODE_ENV === 'production';
  if (production && (!password || password.length < 16 || !secret || secret.length < 32)) {
    throw new Error('Production requires DEMO_ACCESS_PASSWORD (16+) and DEMO_SESSION_SECRET (32+)');
  }
  if (password && !secret) throw new Error('DEMO_SESSION_SECRET is required with demo login');
  const attempts = new Map();
  const sign = text => createHmac('sha256', secret).update(text).digest('hex');
  const cookie = (value, age) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${production ? '; Secure' : ''}`;
  function authenticated(req) {
    if (!password) return true;
    const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!token) return false;
    const [expires, signature] = token.split('.');
    return /^\d+$/.test(expires) && Number(expires) > Date.now() && Number(expires) <= Date.now() + lifetime * 1000 && equal(signature || '', sign(expires));
  }
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (password && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('X-Demo-Request') !== '1') {
      return res.status(403).json({ error: '요청 출처를 확인할 수 없습니다.' });
    }
    next();
  });
  app.get('/session', (req, res) => res.json({ required: Boolean(password), authenticated: authenticated(req) }));
  app.post('/session/login', (req, res) => {
    if (!password) return res.json({ authenticated: true });
    const now = Date.now();
    for (const [ip, item] of attempts) if (item.until < now) attempts.delete(ip);
    const key = req.ip;
    const item = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    if (item.count >= 10 || attempts.size > 10000) return res.status(429).json({ error: '로그인 시도가 많습니다. 15분 후 다시 시도하세요.' });
    if (typeof req.body?.password !== 'string' || !equal(req.body.password, password)) {
      item.count++; attempts.set(key, item);
      return res.status(401).json({ error: '접속 암호가 올바르지 않습니다.' });
    }
    attempts.delete(key);
    const expires = String(now + lifetime * 1000);
    res.set('Set-Cookie', cookie(`${expires}.${sign(expires)}`, lifetime)).json({ authenticated: true });
  });
  app.post('/session/logout', (req, res) => res.set('Set-Cookie', cookie('', 0)).json({ authenticated: false }));
  app.use((req, res, next) => {
    if (!authenticated(req)) return res.status(401).json({ error: '데모에 로그인해 주세요.' });
    next();
  });
}
