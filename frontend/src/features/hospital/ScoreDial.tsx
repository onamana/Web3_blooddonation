import styles from "./Hospital.module.css";

interface ScoreDialProps {
  score: number;
  weights: [string, number][];
  open: boolean;
  onToggle: () => void;
  resultId: string;
}

export function ScoreDial({ score, weights, open, onToggle, resultId }: ScoreDialProps) {
  const dash = Math.round((163.4 * score) / 100);
  const scoreColor = score >= 85 ? "var(--done)" : score >= 70 ? "var(--pri)" : "var(--mute)";
  const tooltipId = `score-weights-${resultId}`;

  return (
    <div className={styles.scoreWrap}>
      <button
        type="button"
        className={styles.scoreBtn}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={tooltipId}
        aria-label={`매칭 점수 ${score}점, 가중치 상세 ${open ? "닫기" : "보기"}`}
      >
        <svg width="62" height="62" viewBox="0 0 62 62" aria-hidden="true">
          <circle cx="31" cy="31" r="26" fill="none" stroke="#F5F5F4" strokeWidth={6} />
          <circle
            cx="31"
            cy="31"
            r="26"
            fill="none"
            stroke={scoreColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${dash} 400`}
            transform="rotate(-90 31 31)"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="mono" style={{ fontSize: 19, fontWeight: 600, lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: 9, color: "var(--mute)" }}>매칭</span>
        </div>
      </button>
      {open && (
        <div className={styles.wtip} id={tooltipId} role="tooltip">
          <div style={{ fontSize: 10.5, color: "#D6D3D1", letterSpacing: ".03em" }}>가중치 분해</div>
          {weights.map(([label, value]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11.5 }}>
              <span>{label}</span>
              <span className="mono">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
