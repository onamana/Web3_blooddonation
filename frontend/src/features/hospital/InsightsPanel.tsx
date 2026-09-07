import { COLOR, INSIGHTS } from "../../data/hospitalMock";
import styles from "./Hospital.module.css";
import { InsightCard } from "./InsightCard";

interface InsightsPanelProps {
  openInsight: string | null;
  onToggle: (id: string) => void;
}

export function InsightsPanel({ openInsight, onToggle }: InsightsPanelProps) {
  return (
    <div className={styles.col} style={{ gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className={styles.t2}>AI 인사이트</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: COLOR.plt,
            background: "#F5F3FF",
            border: "1px solid #E4DBFF",
            borderRadius: 999,
            padding: "3px 8px",
          }}
        >
          예측 모델 v0.4 · 데모
        </span>
      </div>
      <div className={styles.insightsGrid}>
        {INSIGHTS.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            open={openInsight === insight.id}
            onToggle={() => onToggle(insight.id)}
          />
        ))}
      </div>
    </div>
  );
}
