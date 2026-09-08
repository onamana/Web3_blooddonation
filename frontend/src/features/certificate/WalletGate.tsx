import { DEMO_MODE } from "../../api/env";
import { AlertIcon, CheckIcon } from "../../components/icons";
import { ParticleFlock } from "../../components/ParticleFlock";
import type { WalletState } from "../../hooks/useWallet";
import styles from "./Certificate.module.css";

interface WalletGateProps {
  wallet: WalletState;
  onConnect: () => void;
  onConnectDemo: () => void;
}

const FEATURES = ["내가 보유한 헌혈 증서를 지갑에서 확인", "발급 · 양도 · 사용 이력을 온체인 기록으로 열람"];

/** 지갑 미연결 상태에서 증서 목록(/certificates) 자리에 대신 보여주는 초기 화면. */
export function WalletGate({ wallet, onConnect, onConnectDemo }: WalletGateProps) {
  const connecting = wallet.status === "connecting";

  return (
    <div className={`${styles.shell} ${styles.gateShell}`}>
      {/*
        방울들이 모여 서비스명을 만들고, 커서가 지나가면 흩어졌다 다시 모인다.
        카드 안에 두면 카드 폭(=본문 가독 폭)에 갇혀 작아지므로 카드 밖 히어로로 뺐다.
      */}
      <div className={styles.gateHero}>
        <ParticleFlock text="BloodPass" height={190} className={styles.gateFlock} />
      </div>

      <div className={`${styles.card} ${styles.gateCard}`}>
        <div className={styles.gateDesc}>
          헌혈 증서를 블록체인에 기록해, 누가 언제 누구에게 넘겼고 어디서 사용됐는지 남기고 확인합니다.
        </div>

        <div className={styles.gateFeatures}>
          {FEATURES.map((text) => (
            <div key={text} className={styles.gateFeature}>
              <span className={styles.gateFeatureIcon}>
                <CheckIcon />
              </span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {wallet.status === "error" && wallet.error && (
        <div className={styles.banner} role="alert">
          <div className={styles.bannerHead}>
            <AlertIcon size={15} />
            지갑 연결 실패
          </div>
          <div>{wallet.error}</div>
          {!wallet.hasMetaMask && (
            <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
              MetaMask 설치하러 가기
            </a>
          )}
        </div>
      )}

      <div className={styles.gateFooter}>
        <button type="button" className={styles.btn} onClick={onConnect} disabled={connecting}>
          {connecting ? "연결 중..." : "지갑 연결하기"}
        </button>
        {DEMO_MODE && (
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onConnectDemo}>
            MetaMask 없이 데모로 체험하기
          </button>
        )}
        <div className={styles.gateNote}>
          이름·주민번호·병원 기록은 저장되지 않습니다. 지갑 주소로만 조회합니다.
        </div>
      </div>
    </div>
  );
}
