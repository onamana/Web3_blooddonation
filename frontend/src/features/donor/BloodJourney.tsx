import { COMPONENT_COLOR } from "../../data/donorMock";
import { AlertIcon, CopyIcon, SealIcon } from "../../components/icons";
import { Badge } from "../../components/Badge";
import type { Donation, JourneyNodeKey } from "../../types/donor";
import { isBadStep } from "./journey";
import styles from "./Donor.module.css";

interface BloodJourneyProps {
  donation: Donation;
  tampered: boolean;
  onToggleTamper: () => void;
  onOpenNode: (key: JourneyNodeKey) => void;
  onCopyHash: (hash: string) => void;
}

export function BloodJourney({ donation, tampered, onToggleTamper, onOpenNode, onCopyHash }: BloodJourneyProps) {
  const showFailureBanner = tampered && donation.id === "DN-2026-0412";

  return (
    <div className={styles.sec}>
      <div className={styles.journeyHeader}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div className={styles.t2}>혈액 여정</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>
            {donation.id} · {donation.volume}mL · {donation.date}
          </div>
        </div>
        <button
          type="button"
          className={`${styles.tbtn} ${tampered ? styles.tbtnOn : ""}`}
          onClick={onToggleTamper}
          aria-pressed={tampered}
        >
          <AlertIcon />
          <span>위변조 시뮬레이션</span>
        </button>
      </div>

      {showFailureBanner && (
        <div className={styles.banner} role="alert">
          <span style={{ color: "var(--fail)", display: "flex", marginTop: 1 }}>
            <AlertIcon size={17} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fail)" }}>기록 검증 실패 1건</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "#7c2d12" }}>
              혈장 성분의 공급 기록 해시가 원장과 일치하지 않습니다. 해당 노드는 검증 실패로 표시됩니다.
            </div>
          </div>
        </div>
      )}

      <div className={`${styles.card} ${styles.journeyCard}`}>
        {/* 채혈 */}
        <div className={styles.lineRow}>
          <div className={styles.lineRail}>
            <div className={styles.dot} />
            <div className={styles.railLine} style={{ minHeight: 22 }} />
          </div>
          <div className={styles.lineBody}>
            <div className={styles.stepName}>채혈 완료</div>
            <div className={`${styles.stepMeta} mono`}>
              {donation.root.time} · {donation.root.org}
            </div>
          </div>
        </div>

        {/* 검사 */}
        <div className={styles.lineRow}>
          <div className={styles.lineRail}>
            <div className={styles.dot} />
            <div className={styles.railLine} style={{ minHeight: 16 }} />
          </div>
          <button type="button" className={styles.lineBody} onClick={() => onOpenNode("test")}>
            <div className={styles.stepName}>
              <span>검사 완료</span>
              <Badge variant="ok">검증됨</Badge>
            </div>
            <div className={`${styles.stepMeta} mono`}>
              {donation.test.time} · {donation.test.org}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--mute)", marginTop: 4 }}>
              {donation.test.hash}
            </div>
          </button>
        </div>

        <div className={styles.branchDivider}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--mute)" }}>
            {donation.branches.length}개 성분으로 분기
          </span>
          <span className={styles.branchDividerLine} />
        </div>

        {donation.branches.map((branch, bi) => {
          const last = bi === donation.branches.length - 1;
          const anyBad = branch.steps.some((s) => isBadStep(donation, branch, s, tampered));
          return (
            <div key={branch.code} className={styles.branchWrap}>
              <div className={styles.branchRail} style={{ height: last ? 22 : "100%" }} />
              <div className={styles.branchTee} />
              <div className={styles.branchDot} style={{ background: branch.color }} />
              <div className={`${styles.nbox} ${anyBad ? styles.nboxBad : ""}`}>
                <div className={styles.nboxHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className={styles.tag} style={{ background: branch.color }}>
                      {branch.comp}
                    </span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                      {branch.code}
                    </span>
                  </div>
                  <Badge variant={branch.statusVariant}>{branch.status}</Badge>
                </div>

                {branch.steps.map((step, si) => {
                  const bad = isBadStep(donation, branch, step, tampered);
                  const key: JourneyNodeKey = `b${bi}-${si}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.node} ${bad ? styles.nodeBad : ""}`}
                      onClick={() => onOpenNode(key)}
                    >
                      <div className={styles.stepName} style={{ justifyContent: "space-between" }}>
                        <span>{step.name}</span>
                        <Badge variant={bad ? "fail" : "ok"}>{bad ? "검증 실패" : "검증됨"}</Badge>
                      </div>
                      <div className={`${styles.stepMeta} mono`}>
                        {step.time} · {step.org}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <span style={{ color: "var(--mute)", display: "flex" }}>
                          <SealIcon />
                        </span>
                        <span
                          className={`${styles.hash} mono`}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyHash(step.hash);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              onCopyHash(step.hash);
                            }
                          }}
                        >
                          {step.hash}
                        </span>
                        <span style={{ display: "flex", color: "var(--mute)" }}>
                          <CopyIcon />
                        </span>
                      </div>
                      {step.note && <div className={styles.note}>{step.note}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className={styles.legend}>
          <div className={styles.lg}>
            <span className={styles.legendDot} style={{ background: COMPONENT_COLOR.적혈구 }} />
            적혈구
          </div>
          <div className={styles.lg}>
            <span className={styles.legendDot} style={{ background: COMPONENT_COLOR.혈장 }} />
            혈장
          </div>
          <div className={styles.lg}>
            <span className={styles.legendDot} style={{ background: COMPONENT_COLOR.혈소판 }} />
            혈소판
          </div>
        </div>
      </div>

      <div className={styles.note}>
        한 번의 헌혈은 여러 성분으로 나뉘어 각각 다른 경로로 사용됩니다. 노드를 탭하면 기록된 필드를 볼 수 있습니다.
      </div>
    </div>
  );
}
