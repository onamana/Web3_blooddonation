import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCertificate } from "../../api/certificate";
import { ApiError } from "../../api/client";
import { Badge } from "../../components/Badge";
import type { Certificate } from "../../types/certificate";
import { formatOnchainDate } from "../../utils/onchain";
import { AddressDisplay } from "./AddressDisplay";
import { BrandBar } from "./BrandBar";
import { formatTokenId, statusLabel, statusVariant } from "./certificateLabels";
import { HistoryTimeline } from "./HistoryTimeline";
import styles from "./Certificate.module.css";

/** 화면 2: 증서 상세 — 이력 타임라인 + 온체인 증거 */
export function CertificateDetailScreen() {
  const { tokenId = "" } = useParams();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getCertificate(tokenId)
      .then((result) => {
        if (cancelled) return;
        setCertificate(result);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "증서를 불러오지 못했습니다.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  return (
    <div className={styles.shell}>
      <BrandBar />

      {status === "loading" && <div className={styles.empty}>불러오는 중...</div>}

      {status === "error" && (
        <div className={styles.banner} role="alert">
          {error}
        </div>
      )}

      {status === "success" && certificate && (
        <>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.tokenId}>{formatTokenId(certificate.tokenId)}</span>
              <Badge variant={statusVariant(certificate.status)}>{statusLabel(certificate.status)}</Badge>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>발급기관</span>
              <span className={styles.rowValue}>{certificate.issuer}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>발급일</span>
              <span className={`${styles.rowValue} mono`}>{formatOnchainDate(certificate.issuedAt)}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>현재 소유자</span>
              <span className={styles.rowValue}>
                <AddressDisplay address={certificate.owner} />
              </span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.tokenId}>이력</span>
            </div>
            <div className={styles.subtitle}>
              ERC-721이 전송마다 자동으로 남기는 Transfer 이벤트를 읽어온 기록입니다. 종이 증서에는
              누가 언제 누구에게 넘겼는지가 남지 않습니다.
            </div>
            <HistoryTimeline history={certificate.history} />
          </div>
        </>
      )}
    </div>
  );
}
