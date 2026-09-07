import { Modal, ModalCloseButton } from "../../components/Modal";
import { Badge } from "../../components/Badge";
import { timelineFor } from "../../data/hospitalMock";
import type { MatchResult } from "../../types/hospital";
import styles from "./Hospital.module.css";

interface HistoryModalProps {
  result: MatchResult | null;
  onClose: () => void;
}

export function HistoryModal({ result, onClose }: HistoryModalProps) {
  if (!result) return null;
  const timeline = timelineFor(result);

  return (
    <Modal open={Boolean(result)} onClose={onClose} title={`이력 검증 — ${timeline.org}`}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div className={styles.col} style={{ gap: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em" }}>이력 검증 — {timeline.org}</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>
            {timeline.donation} · 헌혈자 신원 정보 미포함
          </div>
        </div>
        <ModalCloseButton onClose={onClose} />
      </div>

      <div className={styles.col}>
        {timeline.nodes.map((node) => (
          <div key={node.name} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch", paddingTop: 4 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  flex: "none",
                  background: node.ok ? "var(--pri)" : "#fff",
                  border: node.ok ? undefined : "1px dashed var(--fail)",
                }}
              />
              <span style={{ flex: 1, width: 1, background: "var(--line)", minHeight: 14 }} />
            </div>
            <div
              style={{
                flex: 1,
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 8,
                background: node.ok ? "var(--bg)" : "var(--fail-bg)",
                border: node.ok ? "1px solid var(--line)" : "1px dashed var(--fail)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: node.ok ? "var(--ink)" : "var(--fail)" }}>{node.name}</span>
                <Badge variant={node.ok ? "ok" : "fail"}>{node.ok ? "검증됨" : "검증 실패"}</Badge>
              </div>
              <div className="mono" style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 3 }}>
                {node.meta}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.notice}>헌혈자 화면과 동일한 원장 기록을 기관 관점으로 표시합니다. 환자·헌혈자 신원 정보는 포함되지 않습니다.</div>
    </Modal>
  );
}
