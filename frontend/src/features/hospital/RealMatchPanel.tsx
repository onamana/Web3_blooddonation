import { useState } from "react";
import { ApiError } from "../../api/client";
import { postMatch } from "../../api/match";
import type { SearchConditions } from "../../types/hospital";
import styles from "./Hospital.module.css";

interface RealMatchPanelProps {
  conditions: SearchConditions;
  searched: boolean;
}

/**
 * 실제 API 모드(VITE_DEMO_MODE=false) 전용 매칭 결과 패널.
 *
 * TODO(어댑터 미완성): B(DID 모듈)의 /match 응답 스펙이 아직 확정되지 않았다.
 * 스펙이 정해지면 이 컴포넌트를 features/hospital/matchAdapter.ts 의 매핑 함수로 교체해
 * ResultsList/ResultCard 카드 UI로 그대로 렌더링하도록 바꾼다.
 * 그 전까지는 실제 응답을 원시 JSON으로만 보여주고, 성공/오류/501을 명확히 구분한다.
 */
export function RealMatchPanel({ conditions, searched }: RealMatchPanelProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notImplemented, setNotImplemented] = useState(false);
  const [raw, setRaw] = useState<unknown>(null);

  const runSearch = async () => {
    setStatus("loading");
    setError(null);
    setNotImplemented(false);
    try {
      const result = await postMatch({
        bloodType: conditions.abo,
        rh: conditions.rh,
        components: conditions.comps,
        units: conditions.units,
        region: conditions.region,
        urgency: conditions.urgency,
      });
      setRaw(result);
      setStatus("success");
    } catch (err) {
      if (err instanceof ApiError) {
        setNotImplemented(err.notImplemented);
        setError(err.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
      setStatus("error");
    }
  };

  return (
    <>
      <div className={styles.resultsHeader}>
        <span className={styles.t2}>매칭 결과 (실제 API)</span>
        <button type="button" className={styles.primary} onClick={runSearch} disabled={status === "loading"}>
          {status === "loading" ? "요청 중..." : "실제 /match 호출"}
        </button>
      </div>

      {status === "idle" && !searched && (
        <div className={styles.emptyState}>왼쪽 조건을 입력하고 버튼을 눌러 실제 백엔드에 매칭을 요청하세요.</div>
      )}

      {status === "error" && (
        <div className={styles.errorState} role="alert">
          <strong>{notImplemented ? "아직 외부 모듈이 연결되지 않았습니다." : "요청 실패"}</strong>
          <div style={{ marginTop: 6 }}>{error}</div>
        </div>
      )}

      {status === "success" && (
        <div className={styles.col} style={{ gap: 10 }}>
          <div className={styles.notice}>
            B(DID 모듈) 응답 스펙이 아직 확정되지 않아 카드 UI로 매핑하지 않고 원시 응답만 표시합니다.
          </div>
          <pre className={styles.rawJson}>{JSON.stringify(raw, null, 2)}</pre>
        </div>
      )}
    </>
  );
}
