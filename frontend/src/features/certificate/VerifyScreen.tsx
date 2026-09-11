import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { markCertificateUsed, verifyCertificate } from "../../api/certificate";
import { ApiError } from "../../api/client";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { DEMO_MODE, EXPLORER_BASE_URL } from "../../api/env";
import type { CertificateVerifyResult } from "../../types/certificate";
import { formatOnchainDate, formatOnchainDateTime } from "../../utils/onchain";
import { AddressDisplay } from "./AddressDisplay";
import { BrandBar } from "./BrandBar";
import { donationTypeLabel, formatTokenId } from "./certificateLabels";
import { BlockingLoader } from "./BlockingLoader";
import { HistoryTimeline } from "./HistoryTimeline";
import { OnchainProof } from "./OnchainProof";
import { Button } from "./Button";
import { VerifyFailure } from "./VerifyFailure";
import styles from "./Certificate.module.css";
import verifyStyles from "./Verify.module.css";

const HOSPITAL_NAME = "충남대병원";
const NETWORK_NAME = "Sepolia";
const RECENT_LIMIT = 4;
const resultLabels = { valid: "사용 가능", used: "사용됨", notfound: "번호 없음" };

/** 같은 빨간 배너로 뭉쳐 있던 오류를 화면에서 구분하기 위한 최소 분류. */
interface VerifyError {
  /** 501 — 내 입력 문제가 아니라 컨트랙트가 아직 연결되지 않은 상태 */
  notImplemented: boolean;
  message: string;
  detail?: string;
}

function toVerifyError(err: unknown, fallback: string): VerifyError {
  if (err instanceof ApiError) {
    return { notImplemented: err.notImplemented, message: err.message, detail: err.detail };
  }
  return { notImplemented: false, message: err instanceof Error ? err.message : fallback };
}

/** 화면 3: 병원 검증 — 입력 → 판정 → 사용 처리 (실패 시 화면 4로 갈림) */
export function VerifyScreen() {
  const [tokenId, setTokenId] = useState("");
  const [result, setResult] = useState<CertificateVerifyResult | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<"verify" | "use" | null>(null);
  const [error, setError] = useState<VerifyError | null>(null);
  const [useTxHash, setUseTxHash] = useState<string | null>(null);
  const [usedAt, setUsedAt] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [uncertainIds, setUncertainIds] = useState<string[]>([]);
  const busyRef = useRef(false);

  // 세션 컨텍스트. 백엔드와 무관한 클라이언트 상태이고, 새로고침하면 초기화된다.
  const [verifyCount, setVerifyCount] = useState(0);
  const [useCount, setUseCount] = useState(0);
  const [recentIds, setRecentIds] = useState<{ id: string; status: CertificateVerifyResult["status"] }[]>([]);
  const remember = (verified: CertificateVerifyResult) => setRecentIds((prev) => [
    { id: verified.tokenId, status: verified.status },
    ...prev.filter((entry) => entry.id !== verified.tokenId),
  ].slice(0, RECENT_LIMIT));

  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => inputRef.current?.focus();

  const runVerify = async (raw: string) => {
    if (busyRef.current) return;
    if (!/^\d+$/.test(raw.trim()) || raw.trim().length > 78) {
      setInputError("증서 번호는 78자리 이하의 숫자로 입력해 주세요.");
      focusInput();
      return;
    }
    const trimmed = raw.trim().replace(/^0+(?=\d)/, "");
    busyRef.current = true;
    setInputError(null);
    setTokenId(trimmed);

    setPending(true);
    setPendingAction("verify");
    setError(null);
    setResult(null);
    setUseTxHash(null);
    setUsedAt(null);
    try {
      const verified = await verifyCertificate(trimmed);
      setResult(verified);
      setVerifyCount((count) => count + 1);
      remember(verified);
      if (verified.status === "used") setUncertainIds((prev) => prev.filter((id) => id !== trimmed));
    } catch (err) {
      setError(toVerifyError(err, "검증에 실패했습니다."));
    } finally {
      busyRef.current = false;
      setPending(false);
      setPendingAction(null);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    void runVerify(tokenId);
  };

  const handleRecent = (id: string) => {
    setTokenId(id);
    void runVerify(id);
  };

  const handleUse = async () => {
    if (busyRef.current || !confirmed || result?.status !== "valid" || !result.certificate || uncertainIds.includes(result.tokenId)) return;
    const target = result.certificate;
    busyRef.current = true;
    setConfirmOpen(false);
    setConfirmed(false);
    setProcessing(true);
    setPending(true);
    setPendingAction("use");
    setError(null);
    let submitted = false;
    try {
      const fresh = await verifyCertificate(target.tokenId);
      if (fresh.status !== "valid" || !fresh.certificate) {
        setResult(fresh);
        remember(fresh);
        return;
      }
      if (fresh.certificate.owner.toLowerCase() !== target.owner.toLowerCase()) {
        setResult(fresh);
        setError({ notImplemented: false, message: "증서 소유자가 변경되었습니다. 현재 소유자를 확인하고 다시 진행해 주세요." });
        return;
      }
      submitted = true;
      const used = await markCertificateUsed(target.tokenId, HOSPITAL_NAME);
      const usedEvent = [...used.certificate.history].reverse().find((event) => event.type === "used");
      setUseTxHash(used.txHash);
      setUsedAt(usedEvent?.timestamp ?? used.certificate.usedAt);
      setResult({ tokenId: used.certificate.tokenId, status: "used", certificate: used.certificate });
      setUseCount((count) => count + 1);
      remember({ tokenId: used.certificate.tokenId, status: "used", certificate: used.certificate });
    } catch (err) {
      setError(toVerifyError(err, "사용 처리 결과를 확인하지 못했습니다."));
      if (submitted) {
        setUncertainIds((prev) => [...new Set([...prev, target.tokenId])]);
        setResult(null);
      }
    } finally {
      busyRef.current = false;
      setProcessing(false);
      setPending(false);
      setPendingAction(null);
    }
  };

  const valid = result?.status === "valid" ? result.certificate : null;
  // 조회 근거. 이벤트마다 blockNumber가 이미 실려 오므로 추가 요청이 필요 없다.
  const latestBlock = valid?.history.at(-1)?.blockNumber ?? null;
  const showIdleHelpers = !result && !error;

  return (
    <div className={`${styles.shell} ${styles.verifyShell}`}>
      <BrandBar />
      {pendingAction && (
        <BlockingLoader message={pendingAction === "verify" ? "증서를 확인 중입니다..." : "증서 사용을 처리 중입니다..."} />
      )}

      <section className={verifyStyles.hero} aria-labelledby="verify-title">
        <span className={verifyStyles.eyebrow}>CERTIFICATE VERIFICATION</span>
        <h1 id="verify-title" className={verifyStyles.title}>증서 검증</h1>
        <p className={verifyStyles.description}>환자가 제시한 증서 번호를 입력해 온체인 상태를 확인합니다.</p>
        <ol className={verifyStyles.steps} aria-label="증서 검증 절차">
          <li><span>01</span> 증서번호 입력</li>
          <li><span>02</span> 상태·이력 확인</li>
          <li><span>03</span> 사용 처리</li>
        </ol>
      <div className={styles.sessionStrip}>
        <span className={styles.sessionDot} />
        <span className={styles.sessionHospital}>{HOSPITAL_NAME}</span>
        <span className={styles.sessionSep}>·</span>
        <span>
          검증 <span className={styles.sessionValue}>{verifyCount}</span>건
        </span>
        <span className={styles.sessionSep}>·</span>
        <span>
          사용 처리 <span className={styles.sessionValue}>{useCount}</span>건
        </span>
        {!DEMO_MODE && <span className={styles.sessionNetwork}>
          {NETWORK_NAME} · 테스트 네트워크
        </span>}
      </div>
      </section>

      <section className={verifyStyles.lookup} aria-labelledby="lookup-title">
      <div className={verifyStyles.sectionHead}><h2 id="lookup-title">증서 조회</h2><span>증서의 사용 가능 여부를 확인하세요</span></div>
      <form className={verifyStyles.form} onSubmit={handleVerify}>
        <label htmlFor="verify-token" className={verifyStyles.label}>증서 번호</label>
        <div className={verifyStyles.inputRow}>
        <input
          id="verify-token"
          ref={inputRef}
          className={`${styles.input} mono`}
          value={tokenId}
          onChange={(e) => { setTokenId(e.target.value); setInputError(null); }}
          onFocus={(e) => e.currentTarget.select()}
          placeholder="예: 94"
          aria-describedby={inputError ? "verify-input-error verify-input-hint" : "verify-input-hint"}
          aria-invalid={Boolean(inputError)}
          autoComplete="off"
          inputMode="numeric"
          disabled={pending}
        />
        <Button type="submit" disabled={!tokenId.trim() || pending}>
          {pending ? "확인 중..." : "검증하기"}
        </Button>
        </div>
        <div id="verify-input-hint" className={styles.inputHint}>
          환자가 제시한 카드 또는 앱 화면의 증서 번호를 그대로 입력하세요. 앞의 0은 생략해도 됩니다 (094 →
          94).
        </div>
      </form>
      {inputError && <p id="verify-input-error" className={verifyStyles.inputError} role="alert">{inputError}</p>}

      {recentIds.length > 0 && (
        <div className={styles.recentChips}>
          <span className={styles.recentLabel}>최근 조회</span>
          {recentIds.map(({ id, status }) => (
            <button
              key={id}
              type="button"
              className={styles.recentChip}
              onClick={() => handleRecent(id)}
              disabled={pending}
            >
              #{id.padStart(3, "0")} · {resultLabels[status]}
            </button>
          ))}
        </div>
      )}
      </section>

      <section className={verifyStyles.results} aria-label="증서 검증 결과" aria-live="polite" aria-busy={pending}>
      {processing && <div className={styles.proofBox} role="status">사용 처리를 확인하고 있습니다. 완료 결과가 표시될 때까지 기다려 주세요.</div>}
      {uncertainIds.length > 0 && <div className={styles.bannerWarn}>
        <strong>완료 여부를 확인해야 하는 요청이 있습니다</strong>
        <span>응답이 없어도 사용 처리가 진행됐을 수 있습니다. 먼저 상태를 다시 조회해 주세요. 사용 가능으로 표시되더라도 이 화면에서는 재전송을 차단합니다. 미확정 요청은 운영 담당자에게 확인해 주세요.</span>
        <div className={styles.actions}>{uncertainIds.map((id) => <Button key={id} size="sm" disabled={pending} onClick={() => handleRecent(id)}>#{id} 상태 재조회</Button>)}</div>
      </div>}
      {showIdleHelpers && (
        <div className={verifyStyles.idle} role="status">
          <span className={verifyStyles.idleMark} aria-hidden="true">{pending ? "···" : "✓"}</span>
          <strong>{pending ? "증서 상태를 확인하고 있습니다" : "증서번호를 입력하면 검증 결과가 표시됩니다"}</strong>
          <p>사용 가능 여부와 온체인 이력을 확인한 뒤 사용 처리할 수 있습니다.</p>
        </div>
      )}

      {/* STATE 6 — 컨트랙트 미배포(501). 입력 실수와 혼동되지 않게 경고 톤으로 떼어놓는다. */}
      {error?.notImplemented && (
        <>
          <div className={`${styles.verdict} ${styles.verdictWarn}`} role="alert">
            <div className={`${styles.verdictMark} ${styles.verdictMarkWarn}`}>⚠</div>
            <div className={`${styles.verdictTitle} ${styles.verdictTitleWarn} ${styles.verdictTitleSm}`}>
              증서 컨트랙트 연결 대기 중
            </div>
            <div className={`${styles.verdictDesc} ${styles.verdictDescWarn}`}>
              스마트컨트랙트가 배포되면 별도 작업 없이 정상 동작합니다
            </div>
            {error.detail && (
              <div className={`${styles.verdictMeta} ${styles.verdictMetaWarn}`}>{error.detail}</div>
            )}
          </div>
          <div className={styles.explain}>
            <div className={styles.explainTitle}>입력 문제가 아닙니다</div>
            <p className={styles.explainBody}>
              지금 조회한 증서의 판정 결과가 아니라, 외부 모듈(증서 컨트랙트)이 아직 연결되지 않았다는
              안내입니다. 번호를 다시 입력해도 같은 화면이 나옵니다.
            </p>
          </div>
        </>
      )}

      {error && !error.notImplemented && (
        <div className={styles.banner} role="alert">
          <span className={styles.bannerHead}>요청을 확인해 주세요</span>
          {error.message}
          {error.detail && <span>{error.detail}</span>}
        </div>
      )}

      {/* 방금 사용 처리한 직후에는 성공 화면을, 이미 사용된 증서를 검증했을 때만 실패 화면을 보여준다. */}
      {useTxHash && result?.certificate ? (
        /* STATE 4 — 사용 처리 완료. 영수증처럼 시각·해시를 남기고 다음 환자로 이어준다. */
        <>
          <div className={`${styles.verdict} ${styles.verdictOk}`}>
            <div className={`${styles.verdictMark} ${styles.verdictMarkOk}`}>✓</div>
            <div className={`${styles.verdictTitle} ${styles.verdictTitleOk}`}>사용 처리 완료</div>
            <div className={`${styles.verdictDesc} ${styles.verdictDescOk}`}>
              {formatTokenId(result.certificate.tokenId)} · {HOSPITAL_NAME}
            </div>
            <OnchainProof txHash={useTxHash} />
            <div className={styles.verdictMeta}>이제 같은 증서를 다시 검증하면 차단됩니다.</div>
          </div>

          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>처리 시각</span>
              <span className={`${styles.rowValue} mono`}>
                {usedAt !== null ? formatOnchainDateTime(usedAt) : "-"}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>처리 기관</span>
              <span className={styles.rowValue}>{HOSPITAL_NAME}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <Button to={`/certificates/${result.certificate.tokenId}`}>이력 보기</Button>
          </div>
        </>
      ) : (
        /* STATE 3 — 이중사용 차단 (하이라이트) */
        result?.status === "used" &&
        result.certificate && <VerifyFailure certificate={result.certificate} />
      )}

      {/* STATE 5 — 존재하지 않는 번호. "그래서 뭘 확인해야 하는지"까지 알려준다. */}
      {result?.status === "notfound" && (
        <>
          <div className={`${styles.verdict} ${styles.verdictWarn}`} role="alert">
            <div className={`${styles.verdictMark} ${styles.verdictMarkWarn}`}>?</div>
            <div className={`${styles.verdictTitle} ${styles.verdictTitleWarn}`}>존재하지 않는 증서</div>
            <div className={`${styles.verdictDesc} ${styles.verdictDescWarn}`}>
              {formatTokenId(result.tokenId)}는 온체인에 존재하지 않습니다
            </div>
          </div>
          <div className={styles.explain}>
            <div className={styles.explainTitle}>다음을 확인해 주세요</div>
            <ul className={styles.reasonList}>
              <li>번호를 잘못 입력했을 수 있습니다 (오타 확인)</li>
              <li>아직 발급되지 않은 번호일 수 있습니다</li>
              <li>다른 네트워크에서 발급된 증서일 수 있습니다</li>
            </ul>
          </div>
        </>
      )}

      {/* STATE 2 — 사용 가능. 사용 처리 전에 "정말 이 지갑의 증서인지"를 근거로 보여준다. */}
      {valid && (
        <>
          <div className={`${styles.verdict} ${styles.verdictOk}`}>
            <div className={`${styles.verdictMark} ${styles.verdictMarkOk}`}>
              <Check size={20} aria-hidden="true" />
            </div>
            <div className={`${styles.verdictTitle} ${styles.verdictTitleOk}`}>사용 가능</div>
            <div className={`${styles.verdictDesc} ${styles.verdictDescOk}`}>
              {formatTokenId(valid.tokenId)}
            </div>
            <div className={styles.verdictMeta}>
              {formatOnchainDate(valid.issuedAt)} {valid.issuer} 발급
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>현재 소유자</span>
              <span className={styles.rowValue}>
                <AddressDisplay address={valid.owner} />
              </span>
            </div>
            <div className={styles.row}><span className={styles.rowLabel}>헌혈 종류</span><span className={styles.rowValue}>{donationTypeLabel(valid.donationType, valid.volumeMl)}</span></div>
            {latestBlock !== null && (
              <div className={styles.row}>
                <span className={styles.rowLabel}>조회 근거</span>
                <span className={styles.rowValue}>
                  <Badge variant="stored">블록 #{latestBlock.toLocaleString()}</Badge>
                </span>
              </div>
            )}
          </div>

          <details className={`${styles.card} ${verifyStyles.historyDetails}`} key={valid.tokenId}>
            <summary className={verifyStyles.historySummary}>
              <span className={verifyStyles.bubbleFloat} aria-hidden="true"><span className={verifyStyles.bubble} /></span>
              <span>온체인 이력 ({valid.history.length}건)</span>
            </summary>
            <div className={styles.subtitle}>
              발급부터 현재 소유자까지의 온체인 기록입니다. 사용 처리 전에 증서의 출처를 확인하세요.
            </div>
            <HistoryTimeline history={valid.history} />
          </details>

          <div className={styles.actions}>
            <Button onClick={() => { setConfirmed(false); setConfirmOpen(true); }} disabled={pending || uncertainIds.includes(valid.tokenId)}>
              {pending ? "처리 중..." : "사용 처리하기"}
            </Button>
          </div>
        </>
      )}


      </section>

      <Modal open={confirmOpen && Boolean(valid)} onClose={() => setConfirmOpen(false)} title="증서를 사용 처리할까요?" actions={<>
        <Button className={verifyStyles.secondary} onClick={() => setConfirmOpen(false)}>취소</Button>
        <Button onClick={() => void handleUse()} disabled={!confirmed || pending}>사용 처리 확정</Button>
      </>}>
        {valid && <>
          <p>처리 대상과 기관을 확인해 주세요. 완료된 증서는 다시 사용할 수 없습니다.</p>
          <dl className={verifyStyles.confirmDetails}>
            <div><dt>증서 번호</dt><dd>{formatTokenId(valid.tokenId)}</dd></div>
            <div><dt>처리 기관</dt><dd>{HOSPITAL_NAME}</dd></div>
            <div><dt>발급 기관</dt><dd>{valid.issuer}</dd></div>
            <div><dt>현재 소유자</dt><dd><AddressDisplay address={valid.owner} /></dd></div>
          </dl>
          <label className={verifyStyles.confirmCheck}><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />제시된 증서와 처리 대상을 확인했습니다.</label>
        </>}
      </Modal>

      <div className={styles.trustFooter}>
        <span>{NETWORK_NAME} Testnet · 컨트랙트 상태를 매 요청마다 직접 조회합니다</span>
        <a className={styles.proofLink} href={EXPLORER_BASE_URL} target="_blank" rel="noreferrer">
          ↗ Etherscan
        </a>
      </div>
    </div>
  );
}
