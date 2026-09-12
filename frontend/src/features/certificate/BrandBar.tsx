import { DEMO_MODE } from "../../api/env";
import { NavTabs } from "../../components/NavTabs";
import { useWallet } from "../../hooks/walletContext";
import { ConnectedWallet } from "./ConnectedWallet";
import styles from "./Certificate.module.css";

/**
 * 모든 화면(초기 화면 제외) 상단 바.
 *
 * 왼쪽은 서비스명 표시뿐이고 링크가 아니다 — 눌러도 아무 일이 없고 호버 반응도 없다.
 * 화면 이동은 오른쪽 탭이 전담한다.
 */
export function BrandBar() {
  const wallet = useWallet();
  const realWalletAddress =
    wallet.status === "connected" && !wallet.isDemoWallet ? wallet.address : null;

  return (
    <div className={styles.brandBar}>
      <div className={styles.brand}>
        {/*
          픽셀 아트라서 배율이 정수여야 흐려지지 않는다. 48px 원본을 24px로 쓰면
          일반 화면에서 2:1, 레티나에서 1:1 로 딱 맞는다.
        */}
        <img
          className={styles.brandMark}
          src="/favicons/favicon-48.png"
          width={24}
          height={24}
          alt=""
        />
        <span className={styles.brandName}>BloodPass</span>
        {realWalletAddress
          ? <ConnectedWallet address={realWalletAddress} />
          : DEMO_MODE && <span className={styles.demoTag}>DEMO</span>}
      </div>
      <NavTabs />
    </div>
  );
}
