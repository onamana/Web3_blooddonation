import {
  ABO_OPTIONS,
  COMPONENT_OPTIONS,
  REGION_OPTIONS,
  RH_OPTIONS,
  URGENCY_OPTIONS,
} from "../../data/hospitalMock";
import type { SearchConditions } from "../../types/hospital";
import styles from "./Hospital.module.css";

interface FilterPanelProps {
  conditions: SearchConditions;
  searched: boolean;
  onChange: (next: SearchConditions) => void;
  onSearch: () => void;
}

export function FilterPanel({ conditions, searched, onChange, onSearch }: FilterPanelProps) {
  const toggleComp = (comp: SearchConditions["comps"][number]) => {
    const has = conditions.comps.includes(comp);
    onChange({
      ...conditions,
      comps: has ? conditions.comps.filter((c) => c !== comp) : [...conditions.comps, comp],
    });
  };

  return (
    <>
      <div className={styles.t2}>조건 입력</div>

      <div className={styles.fg}>
        <div className={styles.fl} id="abo-label">
          혈액형
        </div>
        <div role="group" aria-labelledby="abo-label" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ABO_OPTIONS.map((abo) => (
            <button
              key={abo}
              type="button"
              className={`${styles.chip} ${conditions.abo === abo ? styles.chipOn : ""}`}
              style={{ minWidth: 52 }}
              aria-pressed={conditions.abo === abo}
              onClick={() => onChange({ ...conditions, abo })}
            >
              {abo}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Rh 타입" style={{ display: "flex", gap: 6 }}>
          {RH_OPTIONS.map((rh) => (
            <button
              key={rh}
              type="button"
              className={`${styles.chip} ${conditions.rh === rh ? styles.chipOn : ""}`}
              style={{ flex: 1 }}
              aria-pressed={conditions.rh === rh}
              onClick={() => onChange({ ...conditions, rh })}
            >
              {rh}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.fg}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className={styles.fl} id="comp-label">
            필요 성분
          </div>
          <div className={styles.hint}>다중 선택</div>
        </div>
        <div role="group" aria-labelledby="comp-label" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {COMPONENT_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.comp} ${conditions.comps.includes(c.id) ? styles.compOn : ""}`}
              aria-pressed={conditions.comps.includes(c.id)}
              onClick={() => toggleComp(c.id)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: c.color }} />
                {c.id}
              </span>
              <span className={styles.hint}>{c.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.fg}>
        <div className={styles.fl} id="units-label">
          필요 유닛 수
        </div>
        <div className={styles.step} role="group" aria-labelledby="units-label">
          <button
            type="button"
            className={styles.sbtn}
            aria-label="유닛 수 감소"
            disabled={conditions.units <= 1}
            onClick={() => onChange({ ...conditions, units: Math.max(1, conditions.units - 1) })}
          >
            −
          </button>
          <span className="mono" style={{ fontSize: 17, fontWeight: 600 }} aria-live="polite">
            {conditions.units}
          </span>
          <button
            type="button"
            className={styles.sbtn}
            aria-label="유닛 수 증가"
            disabled={conditions.units >= 20}
            onClick={() => onChange({ ...conditions, units: Math.min(20, conditions.units + 1) })}
          >
            +
          </button>
        </div>
      </div>

      <div className={styles.fg}>
        <label className={styles.fl} htmlFor="region-select">
          지역
        </label>
        <select
          id="region-select"
          className={styles.select}
          value={conditions.region}
          onChange={(e) => onChange({ ...conditions, region: e.target.value })}
        >
          {REGION_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.fg}>
        <div className={styles.fl} id="urgency-label">
          긴급도
        </div>
        <div className={styles.seg} role="group" aria-labelledby="urgency-label">
          {URGENCY_OPTIONS.map((u) => (
            <button
              key={u}
              type="button"
              className={`${styles.segBtn} ${conditions.urgency === u ? styles.segBtnOn : ""} ${
                conditions.urgency === u && u === "응급" ? styles.segBtnUrgentOn : ""
              }`}
              aria-pressed={conditions.urgency === u}
              onClick={() => onChange({ ...conditions, urgency: u })}
            >
              {u}
            </button>
          ))}
        </div>
        {conditions.urgency === "응급" && (
          <div className={styles.urgentNote} role="note">
            응급: 이송 60분 이내 기관만 우선 표시하고 유효기간 여유 조건을 완화합니다.
          </div>
        )}
      </div>

      <button type="button" className={styles.primary} style={{ marginTop: "auto" }} onClick={onSearch}>
        혈액 찾기
      </button>
      <div className={styles.hint} style={{ textAlign: "center" }}>
        {searched
          ? `조건 적용: ${conditions.abo} ${conditions.rh} · ${
              conditions.comps.join(", ") || "성분 미선택"
            } · ${conditions.units}유닛 · ${conditions.region} · ${conditions.urgency}`
          : "조건 선택 후 [혈액 찾기]를 누르면 결과가 갱신됩니다."}
      </div>
    </>
  );
}
