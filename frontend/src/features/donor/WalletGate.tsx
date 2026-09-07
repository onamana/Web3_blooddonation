import { DEMO_MODE } from "../../api/env";
import { AlertIcon, CheckIcon, DropIcon } from "../../components/icons";
import type { WalletState } from "../../hooks/useWallet";
import styles from "./Donor.module.css";

interface WalletGateProps {
  wallet: WalletState;
  onConnect: () => void;
  onConnectDemo: () => void;
}

export function WalletGate({ wallet, onConnect, onConnectDemo }: WalletGateProps) {
  const connecting = wallet.status === "connecting";

  return (
    <div className={styles.phoneShell}>
      <div className={`${styles.gateStatusBar} mono`}>
        <span style={{ fontSize: 12, color: "var(--mute)" }}>BloodTrace</span>
        {DEMO_MODE && <span style={{ fontSize: 12, color: "var(--mute)" }}>데모</span>}
      </div>

      <div className={styles.gateBody}>
        <div className={`${styles.card} ${styles.gateCard}`}>
          <div className={styles.gateIcon}>
            <DropIcon size={22} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "center" }}>
            <div className={styles.gateTitle}>BloodTrace</div>
            <div className={styles.gateDesc}>
              내가 헌혈한 혈액이 성분으로 나뉘어 어느 지역, 어떤 단계까지 쓰였는지 블록체인 기록으로 확인합니다.
            </div>
          </div>
          <div style={{ width: "100%", height: 1, background: "var(--line)", margin: "4px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            {["헌혈 이력을 익명 ID로 조회", "성분별 이동 경로와 검증 상태 확인"].map((text) => (
              <div key={text} className={styles.gateFeature}>
                <span style={{ color: "var(--pri)", marginTop: 1, display: "flex" }}>
                  <CheckIcon />
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {wallet.status === "error" && wallet.error && (
          <div className={styles.errorBanner} role="alert">
            <span style={{ color: "var(--fail)", display: "flex", marginTop: 1 }}>
              <AlertIcon size={17} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fail)" }}>지갑 연결 실패</div>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: "#7c2d12" }}>{wallet.error}</div>
              {!wallet.hasMetaMask && (
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                  MetaMask 설치하러 가기
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.gateFooter}>
        <button type="button" className={styles.btn} onClick={onConnect} disabled={connecting}>
          {connecting ? "연결 중..." : "지갑 연결하기"}
        </button>
        {DEMO_MODE && (
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onConnectDemo}>
            MetaMask 없이 데모로 체험하기
          </button>
        )}
        <div style={{ fontSize: 11.5, lineHeight: 1.6, color: "var(--mute)", textAlign: "center" }}>
          이름·주민번호·병원 기록은 저장되지 않습니다. 익명 ID로만 조회합니다.
        </div>
      </div>
    </div>
  );
}
