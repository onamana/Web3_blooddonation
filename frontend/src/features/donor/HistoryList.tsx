import { Badge } from "../../components/Badge";
import type { Donation } from "../../types/donor";
import { donationHasFailure } from "./journey";
import styles from "./Donor.module.css";

interface HistoryListProps {
  donations: Donation[];
  selectedId: string;
  tampered: boolean;
  onSelect: (id: string) => void;
}

export function HistoryList({ donations, selectedId, tampered, onSelect }: HistoryListProps) {
  return (
    <div className={styles.sec}>
      <div className={styles.t2}>헌혈 이력</div>
      {donations.map((donation) => {
        const on = donation.id === selectedId;
        const bad = on && donationHasFailure(donation, tampered);
        return (
          <button
            key={donation.id}
            type="button"
            className={`${styles.hist} ${on ? styles.histOn : ""}`}
            onClick={() => onSelect(donation.id)}
            aria-pressed={on}
          >
            <div className={styles.histTopRow}>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                {donation.id}
              </span>
              <Badge variant={bad ? "fail" : "ok"}>{bad ? "검증 실패 1건" : "검증됨"}</Badge>
            </div>
            <div className={`${styles.histMetaRow} mono`}>
              <span>{donation.date}</span>
              <span>·</span>
              <span>{donation.volume}mL</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--mute)" }}>{donation.place}</div>
            <div className={styles.histFooter}>
              <span style={{ fontSize: 12 }}>{donation.stage}</span>
              <span style={{ fontSize: 11.5, color: "var(--pri)", fontWeight: 600 }}>
                {on ? "여정 보기 ↓" : "탭하여 여정 보기"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
