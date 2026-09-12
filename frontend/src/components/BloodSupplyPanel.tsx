import { useState } from "react";
import { BLOOD_SUPPLY_MOCK, type BloodComponent, type BloodSupplyEntry } from "../data/bloodSupplyMock";
import { getSupplyStage } from "../data/bloodSupplyStages";
import { useCountUp, useInView } from "../hooks/useCountUp";
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

/**
 * 혈액형 한 칸.
 *
 * 훅을 map 콜백 안에서 부를 수 없으므로 카드를 별도 컴포넌트로 뺐다.
 * 숫자와 막대를 같은 애니메이션 값에서 그려서 둘이 따로 움직이지 않게 한다.
 */
function SupplyCard({ entry, active }: { entry: BloodSupplyEntry; active: boolean }) {
  const stage = getSupplyStage(entry.days);
  const shown = useCountUp(entry.days, active);
  const pct = Math.min(100, (shown / BAR_MAX_DAYS) * 100);

  return (
    <div className={styles.item}>
      <div className={styles.itemHead}>
        <span className={styles.type}>{entry.bloodType}형</span>
        <span className={styles.stage} data-stage={stage.key}>
          {stage.label}
        </span>
      </div>
      {/* 낭독 도구에는 올라가는 중간값이 아니라 최종 수치만 읽히게 한다. */}
      <div className={styles.value} aria-label={`${entry.days.toFixed(1)}일분`}>
        <span aria-hidden="true">{shown.toFixed(1)}</span>
        <span className={styles.unit} aria-hidden="true">
          일분
        </span>
      </div>
      <div className={styles.bar}>
        <span className={styles.barFill} data-stage={stage.key} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** 초기 화면(지갑 미연결 상태)에서 헌혈 참여 동기를 보여주는 혈액 보유 현황 데모 위젯. */
export function BloodSupplyPanel() {
  const [tab, setTab] = useState<BloodComponent>("rbc");
  const snapshot = BLOOD_SUPPLY_MOCK[tab];
  const [panelRef, inView] = useInView<HTMLDivElement>();
  // 카드만 올라가고 아래 평균이 그대로면 어긋나 보여서 같이 올린다.
  const shownAverage = useCountUp(snapshot.average, inView);

  return (
    <div className={styles.panel} ref={panelRef}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>혈액 보유 현황</span>
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
        {snapshot.entries.map((entry) => (
          // 성분 탭을 바꾸면 key가 바뀌어 카드가 새로 마운트되고, 숫자도 0부터 다시 올라간다.
          <SupplyCard key={`${tab}-${entry.bloodType}`} entry={entry} active={inView} />
        ))}
      </div>

      <p className={styles.foot}>
        전체 평균 <strong>{shownAverage.toFixed(1)}일분</strong> 보유 — 5일분 미만이면 관심 단계로 분류돼요.
      </p>
    </div>
  );
}
