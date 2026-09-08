import type { CertificateEvent, CertificateEventType } from "../../types/certificate";
import { formatOnchainDate } from "../../utils/onchain";
import { AddressDisplay } from "./AddressDisplay";
import { OnchainProof } from "./OnchainProof";
import styles from "./Certificate.module.css";

const LABEL: Record<CertificateEventType, string> = {
  issued: "발급",
  transferred: "양도",
  used: "사용",
};

/** 주소는 툴팁으로 전체를 볼 수 있게 하고, 줄이 좁으므로 복사 버튼은 두지 않는다. */
function addressOrDash(address: string | null) {
  return address ? <AddressDisplay address={address} copyable={false} /> : "-";
}

function flowText(event: CertificateEvent) {
  switch (event.type) {
    case "issued":
      return (
        <>
          {event.org ?? "혈액원"} → {addressOrDash(event.to)}
        </>
      );
    case "transferred":
      return (
        <>
          {addressOrDash(event.from)} → {addressOrDash(event.to)}
        </>
      );
    case "used":
      return <>{event.org ?? "병원"} 검증 완료</>;
  }
}

interface HistoryTimelineProps {
  history: CertificateEvent[];
}

/**
 * 이력 타임라인.
 *
 * 우리가 따로 기록하는 게 아니라 ERC-721이 전송마다 자동으로 남기는 Transfer 이벤트를
 * 읽어온 것이다(발급 = from이 zero address인 Transfer). 종이 증서로는 남길 수 없는 기록.
 */
export function HistoryTimeline({ history }: HistoryTimelineProps) {
  return (
    <ol className={styles.timeline}>
      {history.map((event, index) => (
        <li key={`${event.txHash}-${event.type}`} className={styles.timelineItem}>
          <div className={styles.timelineRail}>
            {index < history.length - 1 && <span className={styles.timelineLine} />}
            <span
              className={`${styles.timelineDot} ${event.type === "used" ? styles.timelineDotUsed : ""}`}
            />
          </div>
          <div className={styles.timelineBody}>
            <div className={styles.timelineHead}>
              <span className={`${styles.timelineDate} mono`}>{formatOnchainDate(event.timestamp)}</span>
              <span className={styles.timelineType}>{LABEL[event.type]}</span>
            </div>
            <div className={styles.timelineFlow}>{flowText(event)}</div>
            <OnchainProof txHash={event.txHash} />
          </div>
        </li>
      ))}
    </ol>
  );
}
