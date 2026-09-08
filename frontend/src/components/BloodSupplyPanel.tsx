import { useState } from "react";
import { BLOOD_SUPPLY_MOCK, type BloodComponent } from "../data/bloodSupplyMock";
import { getSupplyStage } from "../data/bloodSupplyStages";
import styles from "./BloodSupplyPanel.module.css";

const TABS: { key: BloodComponent; label: string }[] = [
  { key: "rbc", label: "적혈구" },
  { key: "platelet", label: "혈소판" },
];

/** 보유일수 막대의 기준 상한. 이 이상이면 막대를 꽉 채운다. */
const BAR_MAX_DAYS = 7;

function formatAsOf(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 초기 화면(지갑 미연결 상태)에서 헌혈 참여 동기를 보여주는 혈액 보유 현황 데모 위젯. */
export function BloodSupplyPanel() {
  const [tab, setTab] = useState<BloodComponent>("rbc");
  const snapshot = BLOOD_SUPPLY_MOCK[tab];

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>오늘의 혈액 보유 현황</span>
          <span className={styles.asOf}>{formatAsOf(snapshot.asOf)} 기준 · 데모 데이터</span>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="혈액 성분">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={styles.tab}
              data-active={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {snapshot.entries.map((entry) => {
          const stage = getSupplyStage(entry.days);
          const pct = Math.min(100, Math.round((entry.days / BAR_MAX_DAYS) * 100));
          return (
            <div key={entry.bloodType} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.type}>{entry.bloodType}형</span>
                <span className={styles.stage} data-stage={stage.key}>
                  {stage.label}
                </span>
              </div>
              <div className={styles.value}>
                {entry.days.toFixed(1)}
                <span className={styles.unit}>일분</span>
              </div>
              <div className={styles.bar}>
                <span className={styles.barFill} data-stage={stage.key} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <p className={styles.foot}>
        전체 평균 <strong>{snapshot.average.toFixed(1)}일분</strong> 보유 — 5일분 미만이면 관심 단계로 분류돼요.
      </p>
    </div>
  );
}
