import { useState } from "react";
import { DEMO_MODE } from "../../api/env";
import { DemoModeBanner } from "../../components/DemoModeBanner";
import { DropIcon } from "../../components/icons";
import { LEDGER_SYNC } from "../../data/hospitalMock";
import type { MatchResult, SearchConditions, SortMode } from "../../types/hospital";
import { FilterPanel } from "./FilterPanel";
import styles from "./Hospital.module.css";
import { HistoryModal } from "./HistoryModal";
import { InsightsPanel } from "./InsightsPanel";
import { RealMatchPanel } from "./RealMatchPanel";
import { ResultsList } from "./ResultsList";

const INITIAL_CONDITIONS: SearchConditions = {
  abo: "O",
  rh: "Rh+",
  comps: ["혈소판"],
  units: 4,
  region: "대전권",
  urgency: "긴급",
};

export function HospitalConsole() {
  const [conditions, setConditions] = useState<SearchConditions>(INITIAL_CONDITIONS);
  const [searched, setSearched] = useState(false);
  const [sort, setSort] = useState<SortMode>("AI 추천순");
  const [openInsight, setOpenInsight] = useState<string | null>("demand");
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [scoreOpenId, setScoreOpenId] = useState<string | null>(null);
  const [historyResult, setHistoryResult] = useState<MatchResult | null>(null);

  return (
    <div className={styles.screen}>
      <div className={styles.topbar}>
        <div className={styles.topbarBrand}>
          <span style={{ color: "var(--pri)", display: "flex" }}>
            <DropIcon size={20} />
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}>BloodTrace</span>
          <span className={styles.topbarMeta}>혈액 매칭 콘솔</span>
        </div>
        <div className={styles.topbarRight}>
          <span className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>
            원장 동기화 {LEDGER_SYNC}
          </span>
          <span className="badge badge-ok" style={{ fontSize: 12, padding: "5px 10px" }}>
            노드 4/4 정상
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.side}>
          <FilterPanel
            conditions={conditions}
            searched={searched}
            onChange={setConditions}
            onSearch={() => setSearched(true)}
          />
        </div>

        <div className={styles.main}>
          <InsightsPanel
            openInsight={openInsight}
            onToggle={(id) => setOpenInsight((cur) => (cur === id ? null : id))}
          />

          {DEMO_MODE ? (
            <ResultsList
              searched={searched}
              region={conditions.region}
              abo={conditions.abo}
              rh={conditions.rh}
              sort={sort}
              onSortChange={setSort}
              requested={requested}
              onRequest={(id) =>
                setRequested((prev) => {
                  const next = new Set(prev);
                  next.add(id);
                  return next;
                })
              }
              scoreOpenId={scoreOpenId}
              onToggleScore={(id) => setScoreOpenId((cur) => (cur === id ? null : id))}
              onOpenHistory={setHistoryResult}
            />
          ) : (
            <RealMatchPanel conditions={conditions} searched={searched} />
          )}

          <DemoModeBanner className={`${styles.foot} mono`} />
        </div>
      </div>

      {DEMO_MODE && <HistoryModal result={historyResult} onClose={() => setHistoryResult(null)} />}
    </div>
  );
}
