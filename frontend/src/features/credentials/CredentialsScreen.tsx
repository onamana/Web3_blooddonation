import { Fragment, useState } from 'react';
import { z } from 'zod';
import { apiRequest } from '../../api/client';
import { BrandBar } from '../certificate/BrandBar';
import { BlockingLoader } from '../certificate/BlockingLoader';
import { Button } from '../certificate/Button';
import { useWallet } from '../../hooks/walletContext';
import { shortenAddress } from '../../utils/address';
import styles from '../certificate/Certificate.module.css';
import c from './Credentials.module.css';

const bloodTypes = ['A', 'B', 'AB', 'O'] as const;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const resultSchema = z.object({ matchedCount: z.number(), matches: z.array(z.object({
  holderDid: z.string(), bloodType: z.string(), isEligible: z.boolean(), lastDonationDate: z.string(), verifiedSignature: z.literal(true),
})) });
const verifySchema = z.object({ isValid: z.boolean(), reason: z.string().optional() });

const today = () => new Date().toISOString().slice(0, 10);
/** 미리보기용 만료일. 실제 만료는 발급 시각 기준으로 DID 모듈이 계산한다. */
const expiryPreview = (days: number) =>
  Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) : '-';

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
  const [pendingLabel, setPendingLabel] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function run(label: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setPendingLabel(label); setError(''); setMessage('');
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : '요청 실패'); }
    finally { setBusy(false); setPendingLabel(''); }
  }

  const trimmedAddress = address.trim();
  const addressValid = ADDRESS_PATTERN.test(trimmedAddress);
  const issuable = addressValid && date !== '' && daysValid > 0;

  return (
    <div className={`${styles.shell} ${c.shell}`}>
      <BrandBar />
      {busy && <BlockingLoader message={pendingLabel} />}

      <header className={c.hero}>
        <span className={c.eyebrow}>DID · VERIFIABLE CREDENTIAL</span>
        <h1>헌혈 자격 · 후보자 매칭</h1>
        <p>가상 검사정보로 자격 증명을 발급하고 서명을 검증합니다. 증서의 소유권·양도와는 별도로 관리됩니다.</p>
        <ol className={c.steps} aria-label="자격 증명 절차">
          <li><span>01</span> 자격 등록·갱신</li>
          <li><span>02</span> 후보자 조회</li>
          <li><span>03</span> 검증·취소</li>
        </ol>
        <p className={c.notice}>
          <span>DEMO</span>
          기관 담당자 데모 화면입니다. 실제 개인정보를 입력하지 마세요. 검색 결과는 조건에 맞는 후보자이며 실제 의료 적합성이나 병원 배정을 뜻하지 않습니다.
        </p>
      </header>

      {error && <p className={c.error} role="alert">{error}</p>}
      {message && <p className={c.success} role="status">{message}</p>}

      {/* 01 — 발급 화면과 같은 컴포저: 입력 섹션 위에 미리보기 카드가 붙는다. */}
      <form
        className={styles.issueComposer}
        onSubmit={event => {
          event.preventDefault();
          void run('자격 증명을 발급 중입니다...', async () => {
            const response = await apiRequest<{ vc: { id: string } }>('/credentials/issue', {
              method: 'POST',
              body: { holderAddress: trimmedAddress, bloodType, isEligible: eligible, lastDonationDate: date, daysValid },
            });
            setVcText(JSON.stringify(response.vc, null, 2));
            setRevokeId(response.vc.id);
            setVerification(null);
            setResults(null);
            setMessage('서명된 자격 증명을 저장했습니다. 아래 03에서 검증할 수 있습니다.');
          });
        }}
      >
        <section className={`${styles.issueInputSection} ${styles.issueWalletSection}`}>
          <div className={styles.issueInputHead}>
            <span>01</span>
            <div>
              <h2>자격 증명 대상 지갑</h2>
              <p>자격 증명을 받을 헌혈자의 지갑 주소를 입력합니다.</p>
            </div>
          </div>

          <label className={styles.srOnly} htmlFor="credential-holder">헌혈자 지갑 주소</label>
          <div className={styles.issueAddressBox} data-valid={addressValid}>
            <span className={styles.issueAddressPrefix}>DID</span>
            <input
              id="credential-holder"
              type="text"
              value={address}
              onChange={event => setAddress(event.target.value)}
              placeholder="EVM 지갑 주소를 입력하세요"
              spellCheck={false}
              autoComplete="off"
              disabled={busy}
            />
            {address !== '' && (
              <button
                type="button"
                className={styles.issueAddressClear}
                aria-label="입력한 지갑 주소 지우기"
                onClick={() => setAddress('')}
                disabled={busy}
              >
                ×
              </button>
            )}
          </div>

          <div className={styles.issueAddressAssist}>
            <span>
              {trimmedAddress !== '' && !addressValid
                ? '올바른 이더리움 주소 형식이 아닙니다.'
                : '같은 지갑으로 다시 발급하면 이전 자격 증명은 무효화됩니다.'}
            </span>
            {wallet.address && (
              <button type="button" onClick={() => setAddress(wallet.address || '')} disabled={busy}>
                연결된 지갑 불러오기
              </button>
            )}
          </div>
        </section>

        <section className={`${styles.issueInputSection} ${styles.issueDonationSection}`}>
          <div className={styles.issueInputHead}>
            <span>02</span>
            <div>
              <h2>가상 검사정보</h2>
              <p>이번 자격 증명에 담을 혈액형과 적격 여부를 선택합니다.</p>
            </div>
          </div>

          <div className={c.segment} role="radiogroup" aria-label="혈액형">
            {bloodTypes.map(type => (
              <Fragment key={type}>
                <input
                  type="radio"
                  id={`blood-${type}`}
                  name="blood-type"
                  value={type}
                  checked={bloodType === type}
                  onChange={() => setBloodType(type)}
                  disabled={busy}
                />
                <label htmlFor={`blood-${type}`}>{type}형</label>
              </Fragment>
            ))}
          </div>

          <div className={`${c.segment} ${c.segmentVerdict}`} role="radiogroup" aria-label="헌혈 적격 여부">
            <input type="radio" id="eligible-yes" name="eligible" checked={eligible} onChange={() => setEligible(true)} disabled={busy} />
            <label htmlFor="eligible-yes" data-tone="yes">헌혈 적격</label>
            <input type="radio" id="eligible-no" name="eligible" checked={!eligible} onChange={() => setEligible(false)} disabled={busy} />
            <label htmlFor="eligible-no" data-tone="no">헌혈 부적격</label>
          </div>

          <div className={c.fieldRow}>
            <div className={c.field}>
              <label className={c.fieldLabel} htmlFor="credential-date">최근 헌혈일</label>
              <input
                id="credential-date"
                type="date"
                value={date}
                max={today()}
                onChange={event => setDate(event.target.value)}
                disabled={busy}
                required
              />
            </div>
            <div className={c.field}>
              <label className={c.fieldLabel} htmlFor="credential-days">유효기간 (일)</label>
              <input
                id="credential-days"
                type="number"
                min="1"
                max="365"
                value={daysValid}
                onChange={event => setDaysValid(Number(event.target.value))}
                disabled={busy}
                required
              />
            </div>
          </div>
        </section>

        <aside className={styles.issuePreview}>
          <div className={styles.issuePreviewTop}>
            <span>자격 증명 미리보기</span>
            <small>PREVIEW</small>
          </div>

          <div className={styles.issuePreviewBody}>
            <div className={styles.issuePreviewMark}>VC</div>
            <span className={styles.issuePreviewToken}>CREDENTIAL ID · AUTO</span>
            <h2>{bloodType}형 헌혈 자격 증명</h2>
            <span className={`${c.previewBadge} ${eligible ? c.previewBadgeYes : c.previewBadgeNo}`}>
              {eligible ? '적격' : '부적격'}
            </span>

            <div className={styles.issuePreviewRows}>
              <div>
                <span>보유자</span>
                <strong className="mono">{addressValid ? shortenAddress(trimmedAddress) : '주소 입력 대기'}</strong>
              </div>
              <div>
                <span>최근 헌혈일</span>
                <strong>{date || '미입력'}</strong>
              </div>
              <div>
                <span>만료 예정</span>
                <strong>{expiryPreview(daysValid)}</strong>
              </div>
              <div>
                <span>발급 서명</span>
                <strong className={styles.issueReadyText}>기관 키로 자동 서명</strong>
              </div>
            </div>
          </div>

          <div className={styles.issuePrivacyStrip}>
            <span>OFF-CHAIN</span>
            자격 정보는 체인에 기록되지 않으며, 증서가 양도돼도 함께 넘어가지 않습니다.
          </div>

          <Button type="submit" className={c.previewSubmit} disabled={!issuable || busy}>
            {busy ? '발급 중...' : '자격 증명 발급·갱신'}
          </Button>
          <p className={styles.issueSubmitNote}>발급과 동시에 같은 지갑의 이전 자격 증명은 무효화됩니다.</p>
        </aside>
      </form>

      {/* 02 — 후보자 조회 */}
      <section className={c.panel} aria-labelledby="match-title">
        <div className={c.panelHead}>
          <span>02</span>
          <div>
            <h2 id="match-title">헌혈 후보자 찾기</h2>
            <p>저장된 최신 자격 증명 중 서명과 유효기간을 통과한 후보자만 조회합니다.</p>
          </div>
        </div>

        <form
          onSubmit={event => {
            event.preventDefault();
            setResults(null);
            void run('후보자를 조회하고 있습니다...', async () => {
              const response = await apiRequest('/match', {
                method: 'POST',
                body: { ...(queryType ? { bloodType: queryType } : {}), minDaysSinceLastDonation: minDays, onlyEligible },
              });
              setResults(resultSchema.parse(response));
            });
          }}
        >
          <fieldset className={c.filterGrid} disabled={busy}>
            <div className={c.field}>
              <label className={c.fieldLabel} htmlFor="match-type">혈액형</label>
              <select id="match-type" value={queryType} onChange={event => setQueryType(event.target.value)}>
                <option value="">전체</option>
                {bloodTypes.map(type => <option key={type} value={type}>{type}형</option>)}
              </select>
            </div>
            <div className={c.field}>
              <label className={c.fieldLabel} htmlFor="match-days">마지막 헌혈 후 최소 경과 일수</label>
              <input
                id="match-days"
                type="number"
                min="0"
                max="36500"
                value={minDays}
                onChange={event => setMinDays(Number(event.target.value))}
                required
              />
            </div>
            <div className={c.filterWide}>
              <label className={c.revokeCheck}>
                <input type="checkbox" checked={onlyEligible} onChange={event => setOnlyEligible(event.target.checked)} />
                적격 후보자만 조회
              </label>
              <Button type="submit" disabled={busy}>후보자 조회</Button>
            </div>
          </fieldset>
        </form>

        {results && (
          <div aria-live="polite">
            <div className={c.candidateHead}>
              <h3>후보자 {results.matchedCount}명</h3>
              <span>{queryType ? `${queryType}형` : '전체'} · {minDays}일 경과{onlyEligible ? ' · 적격만' : ''}</span>
            </div>
            {results.matches.length === 0 ? (
              <p className={c.empty}>조건에 맞는 유효한 자격 증명이 없습니다. 경과 일수를 줄이거나 혈액형을 전체로 바꿔 보세요.</p>
            ) : (
              <ul className={c.candidates}>
                {results.matches.map(candidate => (
                  <li key={candidate.holderDid}>
                    <span className={c.candidateType} aria-hidden="true">{candidate.bloodType}</span>
                    <div className={c.candidateBody}>
                      <strong>{candidate.holderDid}</strong>
                      <span>{candidate.bloodType}형 · 최근 헌혈일 {candidate.lastDonationDate}</span>
                    </div>
                    <div className={c.candidateFlags}>
                      <span className={`${c.flag} ${candidate.isEligible ? c.flagOk : c.flagMute}`}>
                        {candidate.isEligible ? '적격' : '부적격'}
                      </span>
                      <span className={`${c.flag} ${c.flagSigned}`}>서명 검증됨</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* 03 — 검증·취소 */}
      <section className={c.panel} aria-labelledby="verify-title">
        <div className={c.panelHead}>
          <span>03</span>
          <div>
            <h2 id="verify-title">자격 증명 검증·취소</h2>
            <p>발급한 자격 증명의 서명·만료·취소 여부를 확인합니다. 내용을 한 글자라도 바꾸면 검증에 실패합니다.</p>
          </div>
        </div>

        <div className={c.verifyRow}>
          <p>{vcText ? '방금 발급한 자격 증명이 준비돼 있습니다.' : '먼저 01에서 발급하거나, 아래를 열어 JSON을 붙여 넣으세요.'}</p>
          <Button
            disabled={busy || !vcText}
            onClick={() => {
              setVerification(null);
              void run('자격 증명을 검증하고 있습니다...', async () => {
                const vc = JSON.parse(vcText);
                setVerification(verifySchema.parse(await apiRequest('/credentials/verify', { method: 'POST', body: { vc } })));
              });
            }}
          >
            서명·만료·취소 여부 검증
          </Button>
        </div>

        {verification && (
          <div className={`${c.result} ${verification.isValid ? c.resultOk : c.resultFail}`} role="status">
            <span className={c.resultMark} aria-hidden="true">{verification.isValid ? '✓' : '✕'}</span>
            <div>
              <strong>{verification.isValid ? '유효한 자격 증명입니다' : '유효하지 않습니다'}</strong>
              {verification.isValid
                ? '발급 기관 서명이 일치하고, 만료되거나 취소되지 않았습니다.'
                : verification.reason || '검증 실패'}
            </div>
          </div>
        )}

        <details className={c.jsonDetails}>
          <summary className={c.jsonSummary}>자격 증명 JSON 직접 보기·붙여넣기</summary>
          <textarea
            rows={10}
            spellCheck={false}
            aria-label="자격 증명 JSON"
            value={vcText}
            disabled={busy}
            placeholder='{"@context": ...}'
            onChange={event => { setVcText(event.target.value); setVerification(null); }}
          />
        </details>

        <form
          className={c.revoke}
          onSubmit={event => {
            event.preventDefault();
            void run('자격 증명을 취소하고 있습니다...', async () => {
              await apiRequest('/credentials/revoke', { method: 'POST', body: { id: revokeId } });
              setVerification(null);
              setResults(null);
              setRevokeConfirmed(false);
              setMessage('자격 증명이 취소되었습니다. 다시 검증하면 무효로 표시되고 후보자 목록에서도 빠집니다.');
            });
          }}
        >
          <fieldset disabled={busy}>
            <div className={c.field}>
              <label className={c.fieldLabel} htmlFor="revoke-id">취소할 자격 증명 ID</label>
              <input
                id="revoke-id"
                value={revokeId}
                onChange={event => { setRevokeId(event.target.value); setRevokeConfirmed(false); }}
                placeholder="urn:uuid:…"
                spellCheck={false}
                required
              />
            </div>
            <button type="submit" className={c.ghostButton} disabled={!revokeConfirmed}>자격 증명 취소</button>
          </fieldset>
          <label className={c.revokeCheck}>
            <input
              type="checkbox"
              checked={revokeConfirmed}
              onChange={event => setRevokeConfirmed(event.target.checked)}
              disabled={busy}
              required
            />
            위 자격 증명을 취소할 것을 확인했습니다. 취소는 되돌릴 수 없습니다.
          </label>
        </form>
      </section>

      <div className={c.footer}>
        자격 증명은 DID 모듈이 기관 키로 서명해 오프체인에 보관합니다. 헌혈증서 NFT 발급은 <strong>혈액원 발급</strong> 화면에서 별도로 진행합니다.
      </div>
    </div>
  );
}
