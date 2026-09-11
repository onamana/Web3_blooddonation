import type { Certificate } from "../../types/certificate";
import { formatOnchainDate, txUrl } from "../../utils/onchain";
import { formatTokenId } from "./certificateLabels";
import { HistoryTimeline } from "./HistoryTimeline";
import styles from "./Certificate.module.css";
import { EXPLORER_BASE_URL } from '../../api/env';

interface VerifyFailureProps {
  certificate: Certificate;
}

/**
 * 화면 4: 검증 실패 — 이중사용 차단.
 *
 * 이 데모의 하이라이트. 이미 사용된 증서를 다시 검증하면 여기로 떨어진다.
 * 판정만 보여주면 "왜 블록체인인가"가 설명되지 않으므로,
 * 차단 이유(한 문장) + 발급→양도→사용 전체 이력을 함께 제시한다.
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
        {usedEvent && EXPLORER_BASE_URL && (
          <a className={styles.verdictLinkFail} href={txUrl(usedEvent.txHash)} target="_blank" rel="noreferrer">
            ↗ 사용 기록을 Etherscan에서 확인
          </a>
        )}
      </div>

      <div className={styles.explain}>
        <div className={styles.explainTitle}>왜 막혔나요?</div>
        <p className={styles.explainBody}>
          스마트컨트랙트에 한 번 기록된 사용 상태는 누구도 되돌릴 수 없어, 같은 증서의 재사용이 자동으로
          차단됩니다. 아래 이력은 종이 증서로는 남길 수 없는 발급 → 양도 → 사용의 전 과정이며, 각 줄의
          링크로 실제 트랜잭션을 직접 확인할 수 있습니다.
        </p>
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
