export async function forwardDid(req, res, path) {
  const baseUrl = process.env.DID_MODULE_BASE_URL;
  const key = process.env.DID_ISSUE_API_KEY;
  if (!baseUrl || !key) return res.status(503).json({ error: 'DID 서비스 연결 설정이 필요합니다.' });
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.json();
    if (response.status === 401 || response.status === 403 || response.status >= 500) {
      return res.status(502).json({ error: 'DID 서비스 연결을 확인해 주세요.' });
    }
    return res.status(response.status).json(body);
  } catch {
    return res.status(502).json({ error: 'DID 서비스 응답을 받지 못했습니다. 잠시 후 다시 시도하세요.' });
  }
}
