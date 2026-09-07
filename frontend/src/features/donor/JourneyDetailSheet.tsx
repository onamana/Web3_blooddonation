import { BottomSheet } from "../../components/BottomSheet";
import { Badge } from "../../components/Badge";
import sheetStyles from "../../components/BottomSheet.module.css";
import type { JourneyStep } from "../../types/donor";
import styles from "./Donor.module.css";

interface JourneyDetailSheetProps {
  open: boolean;
  step: JourneyStep | null;
  ok: boolean;
  onClose: () => void;
  onCopyHash: (hash: string) => void;
}

export function JourneyDetailSheet({ open, step, ok, onClose, onCopyHash }: JourneyDetailSheetProps) {
  if (!step) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title={`${step.name} 상세`}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}>{step.name}</div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--mute)" }}>
            {step.time}
          </div>
        </div>
        <button type="button" className={sheetStyles.xbtn} onClick={onClose}>
          닫기
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className={styles.row}>
          <span style={{ color: "var(--mute)" }}>서명 기관</span>
          <span style={{ fontWeight: 600 }}>{step.org}</span>
        </div>
        <div className={styles.row}>
          <span style={{ color: "var(--mute)" }}>블록 높이</span>
          <span className="mono" style={{ fontWeight: 600 }}>
            {step.block}
          </span>
        </div>
        <div className={styles.row}>
          <span style={{ color: "var(--mute)" }}>트랜잭션</span>
          <button
            type="button"
            className="mono"
            style={{
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline dotted",
              background: "transparent",
              border: 0,
              padding: 0,
            }}
            onClick={() => onCopyHash(step.hash)}
          >
            {step.hash}
          </button>
        </div>
        <div className={styles.row}>
          <span style={{ color: "var(--mute)" }}>검증 상태</span>
          <Badge variant={ok ? "ok" : "fail"}>{ok ? "검증됨" : "검증 실패"}</Badge>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--mute)", letterSpacing: ".03em" }}>
          기록된 필드
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {step.fields.map((field) => (
            <span key={field} className={styles.chipf}>
              {field}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.notice}>이 기록에는 환자·헌혈자 신원 정보가 포함되지 않습니다.</div>
    </BottomSheet>
  );
}
