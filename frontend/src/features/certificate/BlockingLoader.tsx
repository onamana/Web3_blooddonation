import styles from "./Certificate.module.css";

interface BlockingLoaderProps {
  message: string;
}

/** 거래·지갑 승인처럼 화면 조작을 멈춰야 하는 비동기 작업용 오버레이. */
export function BlockingLoader({ message }: BlockingLoaderProps) {
  return (
    <div className={styles.blockingLoaderOverlay} role="status" aria-live="assertive" aria-label={message}>
      <div className={styles.blockingLoaderContent}>
        <p>{message}</p>
        <div className={styles.blockingLoaderCube} aria-hidden="true" />
      </div>
    </div>
  );
}
