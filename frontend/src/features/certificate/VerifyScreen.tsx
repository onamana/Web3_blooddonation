import { useRef, useState } from "react";
import { markCertificateUsed, verifyCertificate } from "../../api/certificate";
import { ApiError } from "../../api/client";
import { Badge } from "../../components/Badge";
import { DemoModeBanner } from "../../components/DemoModeBanner";
import { DEMO_MODE, EXPLORER_BASE_URL } from "../../api/env";
import type { CertificateVerifyResult } from "../../types/certificate";
import { formatOnchainDate, formatOnchainDateTime } from "../../utils/onchain";
import { AddressDisplay } from "./AddressDisplay";
import { BrandBar } from "./BrandBar";
import { formatTokenId } from "./certificateLabels";
import { HistoryTimeline } from "./HistoryTimeline";
import { OnchainProof } from "./OnchainProof";
import { Button } from "./Button";
import { VerifyFailure } from "./VerifyFailure";
import styles from "./Certificate.module.css";

const HOSPITAL_NAME = "충남대병원";
const NETWORK_NAME = "Sepolia";
const RECENT_LIMIT = 4;

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
  const [error, setError] = useState<VerifyError | null>(null);
  const [useTxHash, setUseTxHash] = useState<string | null>(null);
  const [usedAt, setUsedAt] = useState<number | null>(null);

  // 세션 컨텍스트. 백엔드와 무관한 클라이언트 상태이고, 새로고침하면 초기화된다.
  const [verifyCount, setVerifyCount] = useState(0);
  const [useCount, setUseCount] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => inputRef.current?.focus();

  /** 결과를 지우고 다음 환자를 받을 준비. 지금까지는 결과를 지울 방법이 없었다. */
  const handleReset = () => {
    setResult(null);
    setError(null);
    setUseTxHash(null);
    setUsedAt(null);
    setTokenId("");
    focusInput();
  };

  const runVerify = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setPending(true);
    setError(null);
    setResult(null);
    setUseTxHash(null);
    setUsedAt(null);
    try {
      const verified = await verifyCertificate(trimmed);
      setResult(verified);
      setVerifyCount((count) => count + 1);
      if (verified.status !== "notfound") {
        // 최근 조회는 "다시 눌러 재조회"가 목적이므로 존재하는 번호만 남긴다.
        setRecentIds((prev) => [trimmed, ...prev.filter((id) => id !== trimmed)].slice(0, RECENT_LIMIT));
      }
    } catch (err) {
      setError(toVerifyError(err, "검증에 실패했습니다."));
    } finally {
      setPending(false);
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
    if (!result?.certificate) return;
    setPending(true);
    setError(null);
    try {
      const used = await markCertificateUsed(result.certificate.tokenId, HOSPITAL_NAME);
      const usedEvent = [...used.certificate.history].reverse().find((event) => event.type === "used");
      setUseTxHash(used.txHash);
      setUsedAt(usedEvent?.timestamp ?? used.certificate.usedAt);
      setResult({ tokenId: used.certificate.tokenId, status: "used", certificate: used.certificate });
      setUseCount((count) => count + 1);
    } catch (err) {
      setError(toVerifyError(err, "사용 처리에 실패했습니다."));
    } finally {
      setPending(false);
    }
  };

  const valid = result?.status === "valid" ? result.certificate : null;
  // 조회 근거. 이벤트마다 blockNumber가 이미 실려 오므로 추가 요청이 필요 없다.
  const latestBlock = valid?.history.at(-1)?.blockNumber ?? null;
  const showIdleHelpers = !result && !error;

  return (
    <div className={`${styles.shell} ${styles.shellWide}`}>
      <BrandBar />

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
        <span className={styles.sessionNetwork}>
          {DEMO_MODE ? "데모 모드 · 온체인 미연결" : `${NETWORK_NAME} 연결됨`}
        </span>
      </div>

      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>증서 검증 · {HOSPITAL_NAME}</div>
          <div className={styles.subtitle}>환자가 제시한 증서 번호를 입력해 온체인 상태를 확인합니다.</div>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleVerify}>
        <input
          ref={inputRef}
          className={`${styles.input} mono`}
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="증서 번호 (예: 94)"
          aria-label="증서 번호"
          inputMode="numeric"
        />
        <Button type="submit" block disabled={!tokenId.trim() || pending}>
          {pending ? "확인 중..." : "검증하기"}
        </Button>
        <div className={styles.inputHint}>
          환자가 제시한 카드 또는 앱 화면의 증서 번호를 그대로 입력하세요. 앞의 0은 생략해도 됩니다 (094 →
          94).
        </div>
      </form>

      {showIdleHelpers && recentIds.length > 0 && (
        <div className={styles.recentChips}>
          <span className={styles.recentLabel}>최근 조회</span>
          {recentIds.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.recentChip}
              onClick={() => handleRecent(id)}
              disabled={pending}
            >
              #{id.padStart(3, "0")}
            </button>
          ))}
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
          <div className={styles.actions}>
            <Button onClick={handleReset}>다시 입력</Button>
          </div>
        </>
      )}

      {error && !error.notImplemented && (
        <div className={styles.banner} role="alert">
          <span className={styles.bannerHead}>검증할 수 없습니다</span>
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
            <Button onClick={handleReset}>새 증서 검증</Button>
            <Button to={`/certificates/${result.certificate.tokenId}`}>이력 보기</Button>
          </div>
        </>
      ) : (
        /* STATE 3 — 이중사용 차단 (하이라이트) */
        result?.status === "used" &&
        result.certificate && <VerifyFailure certificate={result.certificate} onReset={handleReset} />
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
          <div className={styles.actions}>
            <Button onClick={handleReset}>다시 입력</Button>
          </div>
        </>
      )}

      {/* STATE 2 — 사용 가능. 사용 처리 전에 "정말 이 지갑의 증서인지"를 근거로 보여준다. */}
      {valid && (
        <>
          <div className={`${styles.verdict} ${styles.verdictOk}`}>
            <div className={`${styles.verdictMark} ${styles.verdictMarkOk}`}>✓</div>
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
            {latestBlock !== null && (
              <div className={styles.row}>
                <span className={styles.rowLabel}>조회 근거</span>
                <span className={styles.rowValue}>
                  <Badge variant="stored">블록 #{latestBlock.toLocaleString()}</Badge>
                </span>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.tokenId}>이력 ({valid.history.length}건)</span>
            </div>
            <div className={styles.subtitle}>
              발급부터 현재 소유자까지의 온체인 기록입니다. 사용 처리 전에 증서의 출처를 확인하세요.
            </div>
            <HistoryTimeline history={valid.history} />
          </div>

          <div className={styles.actions}>
            <Button onClick={() => void handleUse()} disabled={pending}>
              {pending ? "처리 중..." : "사용 처리하기"}
            </Button>
            <Button to={`/certificates/${valid.tokenId}`}>이력 보기</Button>
            <Button onClick={handleReset}>다른 증서 검증</Button>
          </div>
        </>
      )}

      <div className={styles.trustFooter}>
        <span>{NETWORK_NAME} Testnet · 컨트랙트 상태를 매 요청마다 직접 조회합니다</span>
        <a className={styles.proofLink} href={EXPLORER_BASE_URL} target="_blank" rel="noreferrer">
          ↗ Etherscan
        </a>
      </div>

      <DemoModeBanner />
    </div>
  );
}
