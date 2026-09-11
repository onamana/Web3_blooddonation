import styles from "./Certificate.module.css";

/** 증서 조회 중 표시하는 심전도형 로딩 인디케이터. */
export function LoadingIndicator() {
  return (
    <div className={styles.loading} role="status">
      <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden="true">
        <polyline points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24" id="back" />
        <polyline points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24" id="front" />
      </svg>
      <span>불러오는 중...</span>
    </div>
  );
}
