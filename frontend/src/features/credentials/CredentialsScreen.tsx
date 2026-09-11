import { useState } from 'react';
import { z } from 'zod';
import { apiRequest } from '../../api/client';
import { BrandBar } from '../certificate/BrandBar';
import { useWallet } from '../../hooks/walletContext';
import styles from './Credentials.module.css';

const bloodTypes = ['A', 'B', 'AB', 'O'] as const;
const resultSchema = z.object({ matchedCount: z.number(), matches: z.array(z.object({
  holderDid: z.string(), bloodType: z.string(), isEligible: z.boolean(), lastDonationDate: z.string(), verifiedSignature: z.literal(true),
})) });
const verifySchema = z.object({ isValid: z.boolean(), reason: z.string().optional() });

export function CredentialsScreen() {
  const wallet = useWallet();
  const [address, setAddress] = useState('');
  const [bloodType, setBloodType] = useState('O');
  const [eligible, setEligible] = useState(false);
  const [date, setDate] = useState('');
  const [daysValid, setDaysValid] = useState(90);
  const [queryType, setQueryType] = useState('O');
  const [minDays, setMinDays] = useState(60);
  const [onlyEligible, setOnlyEligible] = useState(true);
  const [vcText, setVcText] = useState('');
  const [revokeId, setRevokeId] = useState('');
  const [revokeConfirmed, setRevokeConfirmed] = useState(false);
  const [results, setResults] = useState<z.infer<typeof resultSchema> | null>(null);
  const [verification, setVerification] = useState<z.infer<typeof verifySchema> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : '요청 실패'); }
    finally { setBusy(false); }
  }
  return <><BrandBar /><main className={styles.page}>
    <header><span className={styles.eyebrow}>DID / VERIFIABLE CREDENTIAL</span><h1>헌혈 자격 · 후보자 매칭</h1>
      <p>가상 검사정보로 자격 증명을 발급하고 서명을 검증합니다. 증서의 소유권·양도와 별도로 관리됩니다.</p>
      <p className={styles.notice}>기관 담당자 데모 화면입니다. 실제 개인정보를 입력하지 마세요. 검색 결과는 조건에 맞는 후보자이며 실제 의료 적합성이나 병원 배정을 뜻하지 않습니다.</p>
    </header>
    {error && <p className={styles.error} role="alert">{error}</p>}{message && <p className={styles.success} role="status">{message}</p>}
    {busy && <p role="status">요청을 처리하고 있습니다…</p>}
    <div className={styles.grid}>
      <section className={styles.panel}><h2>1. 자격 등록 · 갱신</h2><p>동일 지갑으로 새 VC를 발급하면 이전 자격 증명은 무효화됩니다. NFT 증서는 별도 발급 화면에서 발급하세요.</p>
        <form onSubmit={event => { event.preventDefault(); void run(async () => {
          const response = await apiRequest<{ vc: { id: string } }>('/credentials/issue', { method: 'POST', body: { holderAddress: address.trim(), bloodType, isEligible: eligible, lastDonationDate: date, daysValid } });
          setVcText(JSON.stringify(response.vc, null, 2)); setRevokeId(response.vc.id); setVerification(null); setResults(null); setMessage('서명된 자격 증명을 저장했습니다. 아래에서 검증할 수 있습니다.');
        }); }}>
          <fieldset disabled={busy}><label>헌혈자 지갑 주소<input value={address} onChange={e => setAddress(e.target.value)} placeholder="0x…" pattern="0x[a-fA-F0-9]{40}" required /></label>
            {wallet.address && <button type="button" onClick={() => setAddress(wallet.address || '')}>연결된 지갑 입력</button>}
            <label>혈액형<select value={bloodType} onChange={e => setBloodType(e.target.value)}>{bloodTypes.map(type => <option key={type}>{type}</option>)}</select></label>
            <label>최근 헌혈일<input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} required /></label>
            <label>유효기간 (일)<input type="number" min="1" max="365" value={daysValid} onChange={e => setDaysValid(Number(e.target.value))} required /></label>
            <label className={styles.check}><input type="checkbox" checked={eligible} onChange={e => setEligible(e.target.checked)} />가상 검사정보상 헌혈 적격</label>
            <button type="submit">자격 증명 발급 · 갱신</button>
          </fieldset>
        </form>
      </section>
      <section className={styles.panel}><h2>2. 헌혈 후보자 찾기</h2><p>저장된 최신 VC 중 서명과 유효기간을 확인한 후보자를 찾습니다. 최근 헌혈일과 적격 여부는 등록한 가상 정보 기준입니다.</p>
        <form onSubmit={event => { event.preventDefault(); setResults(null); void run(async () => {
          const response = await apiRequest('/match', { method: 'POST', body: { ...(queryType ? { bloodType: queryType } : {}), minDaysSinceLastDonation: minDays, onlyEligible } });
          setResults(resultSchema.parse(response));
        }); }}><fieldset disabled={busy}>
          <label>혈액형<select value={queryType} onChange={e => setQueryType(e.target.value)}><option value="">전체</option>{bloodTypes.map(type => <option key={type}>{type}</option>)}</select></label>
          <label>마지막 헌혈 후 최소 경과 일수<input type="number" min="0" max="36500" value={minDays} onChange={e => setMinDays(Number(e.target.value))} required /></label>
          <label className={styles.check}><input type="checkbox" checked={onlyEligible} onChange={e => setOnlyEligible(e.target.checked)} />적격 후보자만 조회</label>
          <button type="submit">후보자 조회</button>
        </fieldset></form>
        {results && <div aria-live="polite"><h3>후보자 {results.matchedCount}명</h3>{results.matches.length === 0 && <p>조건에 맞는 유효한 자격 증명이 없습니다.</p>}
          <ul className={styles.candidates}>{results.matches.map(candidate => <li key={candidate.holderDid}><strong>{candidate.bloodType}형 · {candidate.isEligible ? '적격' : '부적격'}</strong><span>{candidate.holderDid}</span><span>최근 헌혈일 {candidate.lastDonationDate} · 서명 검증됨</span></li>)}</ul>
        </div>}
      </section>
    </div>
    <section className={styles.panel}><h2>3. 자격 증명 검증 · 취소</h2><p>발급된 JSON을 붙여 넣으세요. 내용을 바꾸면 서명 검증에 실패합니다. 취소된 자격은 매칭에서 제외됩니다.</p>
      <label>자격 증명 JSON<textarea rows={10} spellCheck={false} value={vcText} disabled={busy} onChange={e => { setVcText(e.target.value); setVerification(null); }} /></label>
      <button disabled={busy || !vcText} onClick={() => { setVerification(null); void run(async () => {
        const vc = JSON.parse(vcText);
        setVerification(verifySchema.parse(await apiRequest('/credentials/verify', { method: 'POST', body: { vc } })));
      }); }}>서명 · 만료 · 취소 여부 검증</button>
      {verification && <p role="status" className={verification.isValid ? styles.success : styles.error}>{verification.isValid ? '유효한 자격 증명입니다.' : `유효하지 않습니다: ${verification.reason || '검증 실패'}`}</p>}
      <form onSubmit={event => { event.preventDefault(); void run(async () => {
        await apiRequest('/credentials/revoke', { method: 'POST', body: { id: revokeId } });
        setVerification(null); setResults(null); setRevokeConfirmed(false); setMessage('자격 증명이 취소되었습니다. 다시 검증하면 무효로 표시됩니다.');
      }); }}><fieldset disabled={busy}>
        <label>취소할 VC ID<input value={revokeId} onChange={e => { setRevokeId(e.target.value); setRevokeConfirmed(false); }} placeholder="urn:uuid:…" required /></label>
        <label className={styles.check}><input type="checkbox" checked={revokeConfirmed} onChange={e => setRevokeConfirmed(e.target.checked)} required />위 자격 증명을 취소할 것을 확인했습니다.</label>
        <button disabled={!revokeConfirmed}>자격 증명 취소</button>
      </fieldset></form>
    </section>
  </main></>;
}
