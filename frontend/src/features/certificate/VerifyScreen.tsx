import { useState } from "react";
import { Link } from "react-router-dom";
import { markCertificateUsed, verifyCertificate } from "../../api/certificate";
import { ApiError } from "../../api/client";
import { DemoModeBanner } from "../../components/DemoModeBanner";
import type { CertificateVerifyResult } from "../../types/certificate";
import { formatOnchainDate } from "../../utils/onchain";
import { BrandBar } from "./BrandBar";
import { formatTokenId } from "./certificateLabels";
import { OnchainProof } from "./OnchainProof";
import { VerifyFailure } from "./VerifyFailure";
import styles from "./Certificate.module.css";

const HOSPITAL_NAME = "충남대병원";

/** 화면 3: 병원 검증 — 입력 → 판정 → 사용 처리 (실패 시 화면 4로 갈림) */
export function VerifyScreen() {
  const [tokenId, setTokenId] = useState("");
  const [result, setResult] = useState<CertificateVerifyResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useTxHash, setUseTxHash] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    setUseTxHash(null);
    try {
      setResult(await verifyCertificate(tokenId.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "검증에 실패했습니다.");
    } finally {
      setPending(false);
    }
  };

  const handleUse = async () => {
    if (!result?.certificate) return;
    setPending(true);
    setError(null);
    try {
      const used = await markCertificateUsed(result.certificate.tokenId, HOSPITAL_NAME);
      setUseTxHash(used.txHash);
      setResult({ tokenId: used.certificate.tokenId, status: "used", certificate: used.certificate });
    } catch (err) {
      setError(err instanceof Error ? err.message : "사용 처리에 실패했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={`${styles.shell} ${styles.shellWide}`}>
      <BrandBar>
        <Link className={styles.actionBtn} to="/certificates">
          내 증서
        </Link>
      </BrandBar>

      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>증서 검증 · {HOSPITAL_NAME}</div>
          <div className={styles.subtitle}>환자가 제시한 증서 번호를 입력해 온체인 상태를 확인합니다.</div>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleVerify}>
        <input
          className={`${styles.input} mono`}
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="증서 번호 (예: 94)"
          aria-label="증서 번호"
          inputMode="numeric"
        />
        <button type="submit" className={styles.btn} disabled={!tokenId.trim() || pending}>
          {pending ? "확인 중..." : "검증하기"}
        </button>
      </form>

      {error && (
        <div className={styles.banner} role="alert">
          {error}
        </div>
      )}

      {/* 방금 사용 처리한 직후에는 성공 화면을, 이미 사용된 증서를 검증했을 때만 실패 화면을 보여준다. */}
      {useTxHash && result?.certificate ? (
        <div className={`${styles.verdict} ${styles.verdictOk}`}>
          <div className={`${styles.verdictMark} ${styles.verdictMarkOk}`}>✓</div>
          <div className={`${styles.verdictTitle} ${styles.verdictTitleOk}`}>사용 처리 완료</div>
          <div className={`${styles.verdictDesc} ${styles.verdictDescOk}`}>
            {formatTokenId(result.certificate.tokenId)} · {HOSPITAL_NAME}
          </div>
          <OnchainProof txHash={useTxHash} />
          <div className={styles.verdictMeta}>이제 같은 증서를 다시 검증하면 차단됩니다.</div>
        </div>
      ) : (
        result?.status === "used" &&
        result.certificate && <VerifyFailure certificate={result.certificate} />
      )}

      {result?.status === "notfound" && (
        <div className={styles.banner} role="alert">
          {formatTokenId(result.tokenId)}는 온체인에 존재하지 않는 증서입니다.
        </div>
      )}

      {result?.status === "valid" && result.certificate && (
        <>
          <div className={`${styles.verdict} ${styles.verdictOk}`}>
            <div className={`${styles.verdictMark} ${styles.verdictMarkOk}`}>✓</div>
            <div className={`${styles.verdictTitle} ${styles.verdictTitleOk}`}>사용 가능</div>
            <div className={`${styles.verdictDesc} ${styles.verdictDescOk}`}>
              {formatTokenId(result.certificate.tokenId)} · {result.certificate.bloodType}형
            </div>
            <div className={styles.verdictMeta}>
              {formatOnchainDate(result.certificate.issuedAt)} {result.certificate.issuer} 발급
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={() => void handleUse()} disabled={pending}>
              {pending ? "처리 중..." : "사용 처리하기"}
            </button>
            <Link className={`${styles.btn} ${styles.btnGhost}`} to={`/certificates/${result.certificate.tokenId}`}>
              이력 보기
            </Link>
          </div>
        </>
      )}

      <DemoModeBanner />
    </div>
  );
}
