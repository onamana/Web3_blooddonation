import { PinIcon } from "../../components/icons";
import type { DonationSummary } from "../../types/donor";
import styles from "./Donor.module.css";

interface SummaryGridProps {
  summary: DonationSummary;
  patientTipOpen: boolean;
  onTogglePatientTip: () => void;
}

export function SummaryGrid({ summary, patientTipOpen, onTogglePatientTip }: SummaryGridProps) {
  return (
    <div className={styles.sec} style={{ paddingTop: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div className={styles.t2}>내 헌혈 요약</div>
        <div style={{ fontSize: 11.5, color: "var(--mute)" }}>익명 ID 기준</div>
      </div>
      <div className={styles.grid2}>
        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiLabel}>총 헌혈 횟수</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className={`${styles.kpiValue} mono`}>{summary.count}</span>
            <span style={{ fontSize: 13, color: "var(--sub)" }}>회</span>
          </div>
          <div className={`${styles.kpiLabel} mono`}>누적 {summary.volume}</div>
        </div>

        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiLabel}>마지막 헌혈</div>
          <div className="mono" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.01em" }}>
            {summary.lastDate}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11.5, color: "var(--mute)" }}>
            <PinIcon />
            <span>{summary.lastPlace}</span>
          </div>
        </div>

        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiLabel}>다음 헌혈 가능일</div>
          <div className={`${styles.kpiValue} mono`} style={{ color: "var(--pri)" }}>
            {summary.nextDday}
          </div>
          <div className={styles.aiTag}>AI 안내</div>
        </div>

        <div className={`${styles.card} ${styles.kpi}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className={styles.kpiLabel}>도움받은 추정 환자</span>
            <button
              type="button"
              className={styles.infoBtn}
              aria-label="도움받은 추정 환자 설명 보기"
              aria-expanded={patientTipOpen}
              onClick={onTogglePatientTip}
            >
              i
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className={`${styles.kpiValue} mono`}>{summary.patients}</span>
            <span style={{ fontSize: 13, color: "var(--sub)" }}>명</span>
          </div>
          {patientTipOpen && <div className={styles.tipBox}>{summary.patientTip}</div>}
        </div>
      </div>
    </div>
  );
}
