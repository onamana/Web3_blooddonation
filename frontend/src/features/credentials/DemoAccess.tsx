import { useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from '../../api/client';
import { LIVE_CONTRACT_MODE } from '../../api/env';
import styles from './Credentials.module.css';

export function DemoAccess({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState(!LIVE_CONTRACT_MODE);
  const [required, setRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function check() {
    setBusy(true); setError('');
    try {
      const session = await apiRequest<{ required: boolean; authenticated: boolean }>('/session');
      setRequired(session.required); setAllowed(session.authenticated);
    } catch { setError('데모 서버에 연결할 수 없습니다. 서버 상태를 확인하고 다시 연결해 주세요.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (LIVE_CONTRACT_MODE) void check();
    const expired = () => { setAllowed(false); setRequired(true); setError('세션이 만료되었습니다. 다시 로그인해 주세요.'); };
    window.addEventListener('demo-session-expired', expired);
    return () => window.removeEventListener('demo-session-expired', expired);
  }, []);
  if (allowed) return <>{required && <div className={styles.session}>초대형 데모 · 가상 헌혈 정보만 입력하세요<button onClick={async () => {
    try { await apiRequest('/session/logout', { method: 'POST' }); setAllowed(false); }
    catch { setError('로그아웃하지 못했습니다. 다시 시도해 주세요.'); }
  }}>데모 로그아웃</button>{error && <span role="alert">{error}</span>}</div>}{children}</>;
  return <main className={styles.login}><h1>BloodPass 데모</h1><p>초대받은 참여자를 위한 테스트넷 시연입니다. 운영자가 전달한 접속 암호로 입장하세요.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('');
      try { await apiRequest('/session/login', { method: 'POST', body: { password } }); setPassword(''); setAllowed(true); }
      catch (failure) { setError(failure instanceof Error ? failure.message : '로그인 실패'); }
      finally { setBusy(false); }
    }}><label>접속 암호<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
      <button disabled={busy || !required}>{busy ? '연결 중…' : '데모 입장'}</button>
    </form>{error && <p role="alert">{error}</p>}<button disabled={busy} onClick={() => void check()}>연결 다시 확인</button>
  </main>;
}
