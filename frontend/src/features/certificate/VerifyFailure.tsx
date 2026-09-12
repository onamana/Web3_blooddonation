import type { Certificate } from "../../types/certificate";
import { formatOnchainDate, txUrl } from "../../utils/onchain";
import { formatTokenId } from "./certificateLabels";
import { HistoryTimeline } from "./HistoryTimeline";
import styles from "./Certificate.module.css";

interface VerifyFailureProps {
  certificate: Certificate;
}

/**
 * 화면 4: 검증 실패 — 이중사용 차단.
 *
 * 이 데모의 하이라이트. 이미 사용된 증서를 다시 검증하면 여기로 떨어진다.
 * 이력은 이미 verify 응답에 들어 있는 데이터로, 추가 조회가 필요하지 않다.
 * 다른 번호 조회는 상단 검색창에서 바로 되므로 별도 리셋 버튼은 두지 않는다.
 */
export function VerifyFailure({ certificate }: VerifyFailureProps) {
  const usedEvent = [...certificate.history].reverse().find((event) => event.type === "used");

  return (
    <>
      <div className={`${styles.verdict} ${styles.verdictFail}`} role="alert">
        <div className={`${styles.verdictMark} ${styles.verdictMarkFail}`}>✗</div>
        <div className={`${styles.verdictTitle} ${styles.verdictTitleFail}`}>사용 불가</div>
        <div className={`${styles.verdictDesc} ${styles.verdictDescFail}`}>
          이 증서는 {certificate.usedAt !== null ? formatOnchainDate(certificate.usedAt) : "이전"}에 이미
          사용되었습니다
        </div>
        <div className={`${styles.verdictMeta} ${styles.verdictMetaFail}`}>
          {formatTokenId(certificate.tokenId)}
          {certificate.usedBy ? ` · ${certificate.usedBy}` : ""}
        </div>
        {usedEvent && (
          <a className={styles.verdictLinkFail} href={txUrl(usedEvent.txHash)} target="_blank" rel="noreferrer">
            ↗ 사용 기록을 Etherscan에서 확인
          </a>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.tokenId}>전체 이력 ({certificate.history.length}건)</span>
        </div>
        <HistoryTimeline history={certificate.history} />
      </div>
    </>
  );
}
