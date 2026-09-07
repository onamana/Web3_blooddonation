import { CheckIcon } from "../../components/icons";
import type { Insight } from "../../types/hospital";
import styles from "./Hospital.module.css";
import { Sparkline } from "./Sparkline";

interface InsightCardProps {
  insight: Insight;
  open: boolean;
  onToggle: () => void;
}

export function InsightCard({ insight, open, onToggle }: InsightCardProps) {
  return (
    <div className={`${styles.ins} ${open ? styles.insOpen : ""}`}>
      <button
        type="button"
        className={styles.insHead}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`insight-${insight.id}-panel`}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: insight.color }} />
            {insight.title}
          </span>
          <span className={styles.hint}>{open ? "접기 −" : "자세히 +"}</span>
        </div>
        <div className={styles.insSum}>{insight.summary}</div>
        <div className={styles.insBasis}>{insight.basis}</div>
      </button>

      {open && (
        <div className={styles.exp} id={`insight-${insight.id}-panel`}>
          {insight.id === "demand" && (
            <>
              <Sparkline insight={insight} />
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {insight.reasons.map((r) => (
                  <div key={r} style={{ display: "flex", gap: 7, fontSize: 11.5, lineHeight: 1.5, color: "var(--sub)" }}>
                    <span style={{ color: "var(--plt)" }}>·</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {insight.id === "waste" && (
            <>
              <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr .9fr .7fr",
                    gap: 6,
                    padding: "7px 10px",
                    background: "var(--bg)",
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: "var(--mute)",
                  }}
                >
                  <span>기관</span>
                  <span>성분</span>
                  <span>D-day</span>
                </div>
                {insight.rows.map((row) => (
                  <div
                    key={`${row.org}-${row.comp}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr .9fr .7fr",
                      gap: 6,
                      padding: "7px 10px",
                      borderTop: "1px solid #F5F5F4",
                      fontSize: 11.5,
                    }}
                  >
                    <span>{row.org}</span>
                    <span style={{ color: row.color, fontWeight: 600 }}>{row.comp}</span>
                    <span className="mono" style={{ color: "var(--fail)" }}>
                      {row.dday}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  background: "var(--done-bg)",
                  border: "1px solid var(--done-line)",
                  borderRadius: 10,
                  padding: "9px 10px",
                }}
              >
                <span style={{ color: "var(--done)", display: "flex", marginTop: 1 }}>
                  <CheckIcon />
                </span>
                <span style={{ fontSize: 11.5, lineHeight: 1.5, color: "#166534" }}>
                  {insight.transfer.split(/(\d+유닛)/).map((chunk, i) =>
                    /\d+유닛/.test(chunk) ? <strong key={i}>{chunk}</strong> : <span key={i}>{chunk}</span>,
                  )}
                </span>
              </div>
            </>
          )}

          {insight.id === "route" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {insight.nodes.map((node) => {
                const ok = node.state === "ok";
                return (
                  <div key={node.name} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch" }}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 999,
                          flex: "none",
                          background: ok ? "var(--done)" : node.state === "missing" ? "#fff" : "var(--fail)",
                          border: node.state === "missing" ? "1px dashed var(--fail)" : undefined,
                        }}
                      />
                      <span style={{ flex: 1, width: 1, background: "var(--line)", minHeight: 8 }} />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        padding: "8px 10px",
                        background: ok ? "var(--bg)" : "var(--fail-bg)",
                        border: ok ? "1px solid var(--line)" : "1px dashed var(--fail)",
                      }}
                    >
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: ok ? "var(--ink)" : "var(--fail)" }}>
                        {node.name}
                      </div>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--mute)", marginTop: 2 }}>
                        {node.meta}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--fail)" }}>{insight.note}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
