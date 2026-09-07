import { compColor } from "./compColor";
import { Badge } from "../../components/Badge";
import { ClockIcon, PinIcon } from "../../components/icons";
import type { MatchResult } from "../../types/hospital";
import styles from "./Hospital.module.css";
import { ScoreDial } from "./ScoreDial";

interface ResultCardProps {
  result: MatchResult;
  sent: boolean;
  scoreOpen: boolean;
  onToggleScore: () => void;
  onOpenHistory: () => void;
  onRequest: () => void;
}

export function ResultCard({ result, sent, scoreOpen, onToggleScore, onOpenHistory, onRequest }: ResultCardProps) {
  const near = result.expiryDays <= 5;

  return (
    <div className={`${styles.res} ${sent ? styles.resSent : ""}`}>
      <div className={styles.resInner}>
        <div className={`${styles.col} ${styles.orgCol}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>{result.org}</span>
            <span
              style={{
                fontSize: 10.5,
                color: "var(--mute)",
                border: "1px solid var(--line)",
                borderRadius: 999,
                padding: "2px 7px",
              }}
            >
              {result.kind}
            </span>
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: "var(--sub)", flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <PinIcon />
              <span className="mono">{result.distance}km</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <ClockIcon />
              <span className="mono">예상 이송 {result.eta}분</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
            <Badge variant={result.verified ? "ok" : "fail"}>{result.verified ? "이력 검증됨" : "이력 검증 실패"}</Badge>
            <button
              type="button"
              onClick={onOpenHistory}
              style={{
                background: "transparent",
                border: 0,
                padding: 0,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--pri)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              이력 보기
            </button>
          </div>
        </div>

        <div className={`${styles.col} ${styles.divider} ${styles.compCol}`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 999,
                padding: "3px 9px",
                color: "#fff",
                background: compColor(result.comp),
              }}
            >
              {result.comp}
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                background: "#F5F5F4",
                border: "1px solid var(--line)",
                borderRadius: 999,
                padding: "3px 9px",
              }}
            >
              {result.blood}
            </span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <div className={styles.col} style={{ gap: 2 }}>
              <span className={styles.hint}>보유 유닛</span>
              <span className="mono" style={{ fontSize: 19, fontWeight: 600 }}>
                {result.units}
              </span>
            </div>
            <div className={styles.col} style={{ gap: 2 }}>
              <span className={styles.hint}>유효기간</span>
              <span className="mono" style={{ fontSize: 19, fontWeight: 600, color: near ? "var(--fail)" : "var(--ink)" }}>
                D-{result.expiryDays}
              </span>
            </div>
          </div>
        </div>

        <div className={`${styles.divider} ${styles.actionCol}`}>
          <ScoreDial
            resultId={result.id}
            score={result.score}
            weights={result.weights}
            open={scoreOpen}
            onToggle={onToggleScore}
          />
          <div className={styles.col} style={{ flex: 1, minWidth: 0, gap: 7 }}>
            <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--sub)" }}>{result.reason}</div>
            <div style={{ background: "var(--done-bg)", border: "1px solid var(--done-line)", borderRadius: 8, padding: "6px 8px" }}>
              <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.45, color: "#166534" }}>{result.recover}</span>
            </div>
            <button type="button" className={`${styles.reqbtn} ${sent ? styles.reqbtnSent : ""}`} onClick={onRequest} disabled={sent}>
              {sent ? "요청 전송됨" : "요청 보내기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
