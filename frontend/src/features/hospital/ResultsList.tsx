import { RESULTS, SORT_OPTIONS, SORT_TIP } from "../../data/hospitalMock";
import type { MatchResult, SortMode } from "../../types/hospital";
import styles from "./Hospital.module.css";
import { ResultCard } from "./ResultCard";

interface ResultsListProps {
  searched: boolean;
  region: string;
  abo: string;
  rh: string;
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
  requested: Set<string>;
  onRequest: (id: string) => void;
  scoreOpenId: string | null;
  onToggleScore: (id: string) => void;
  onOpenHistory: (result: MatchResult) => void;
}

function sortResults(results: MatchResult[], sort: SortMode): MatchResult[] {
  const arr = results.slice();
  if (sort === "거리순") return arr.sort((a, b) => a.distance - b.distance);
  if (sort === "유효기간 임박순") return arr.sort((a, b) => a.expiryDays - b.expiryDays);
  return arr.sort((a, b) => b.score - a.score);
}

export function ResultsList({
  searched,
  region,
  abo,
  rh,
  sort,
  onSortChange,
  requested,
  onRequest,
  scoreOpenId,
  onToggleScore,
  onOpenHistory,
}: ResultsListProps) {
  const sorted = sortResults(RESULTS, sort);

  return (
    <>
      <div className={styles.resultsHeader}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className={styles.t2}>매칭 결과</span>
          <span style={{ fontSize: 12, color: "var(--mute)" }}>
            {searched ? `${region} · ${abo} ${rh} · ` : ""}
            {RESULTS.length}개 기관
          </span>
        </div>
        <div className={styles.sorts} role="group" aria-label="정렬 방식">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.sortBtn} ${sort === s ? styles.sortBtnOn : ""}`}
              aria-pressed={sort === s}
              onClick={() => onSortChange(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {sort === "유효기간 임박순" && (
        <div className={styles.tip} role="note">
          {SORT_TIP}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className={styles.emptyState}>조건에 맞는 기관을 찾지 못했습니다.</div>
      ) : (
        <div className={styles.col} style={{ gap: 12 }}>
          {sorted.map((result) => (
            <ResultCard
              key={result.id}
              result={result}
              sent={requested.has(result.id)}
              scoreOpen={scoreOpenId === result.id}
              onToggleScore={() => onToggleScore(result.id)}
              onOpenHistory={() => onOpenHistory(result)}
              onRequest={() => onRequest(result.id)}
            />
          ))}
        </div>
      )}

      <div className={`${styles.foot} mono`}>모든 수치는 가상 데모 데이터입니다. 실명·환자 정보·진료 기록은 포함되지 않습니다.</div>
    </>
  );
}
