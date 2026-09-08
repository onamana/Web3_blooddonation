import { DEMO_MODE } from "../../api/env";
import { AlertIcon } from "../../components/icons";
import { BloodSupplyPanel } from "../../components/BloodSupplyPanel";
import { FeatureCarousel, type FeatureCarouselItem } from "../../components/FeatureCarousel";
import { ParticleFlock } from "../../components/ParticleFlock";
import type { WalletState } from "../../hooks/useWallet";
import styles from "./Certificate.module.css";

interface WalletGateProps {
  wallet: WalletState;
  onConnect: () => void;
  onConnectDemo: () => void;
}

/** 각 카드는 실제 화면 요소를 축소해 본뜬 미리보기다 — 아이콘 하나가 아니라 그 화면이 하는 일을 보여준다. */
const FEATURES: FeatureCarouselItem[] = [
  {
    title: "왜 온체인 증서인가",
    body: (
      <div className={styles.mockIntro}>
        <p className={styles.mockIntroProblem}>
          종이 헌혈증서는 위조와 분실에 취약하고, 누가 언제 누구에게 넘겼는지 나중엔 증명할 방법이
          없습니다.
        </p>
        <p className={styles.mockIntroSolution}>
          BloodPass는 증서를 ERC-721 토큰으로 발급해 발급·양도·사용 전 과정을 블록체인에 새깁니다.
        </p>
      </div>
    ),
  },
  {
    title: "내 지갑의 증서, 한눈에",
    desc: "보유 중인 헌혈 증서를 지갑에서 실시간으로 확인합니다.",
    body: (
      <div className={styles.mockCert}>
        <div className={styles.mockCertHead}>
          <span className={styles.mockTokenId}>#94</span>
          <span className={styles.mockBadgeOk}>보유중</span>
        </div>
        <div className={styles.mockCertType}>A형</div>
        <div className={styles.mockCertIssuer}>대전혈액원 · 2026.05.12 발급</div>
      </div>
    ),
  },
  {
    title: "발급부터 사용까지 전 과정 기록",
    desc: "발급·양도·사용 이력이 ERC-721 Transfer 이벤트로 온체인에 자동 기록됩니다.",
    body: (
      <div className={styles.mockTimeline}>
        {[
          { label: "발급", date: "05.12" },
          { label: "양도", date: "08.20" },
          { label: "사용", date: "09.01" },
        ].map((step) => (
          <div key={step.label} className={styles.mockTimelineRow}>
            <span className={styles.mockTimelineDot} />
            <span className={styles.mockTimelineLabel}>{step.label}</span>
            <span className={styles.mockTimelineDate}>{step.date}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "이중사용 원천 차단",
    desc: "병원이 증서 번호로 검증하면, 이미 사용된 증서는 그 자리에서 막힙니다.",
    body: (
      <div className={styles.mockVerify}>
        <div className={styles.mockInputBox}>증서 번호 94</div>
        <div className={styles.mockResultOk}>✓ 사용 가능</div>
        <div className={styles.mockResultBlocked}>✕ 이미 사용된 증서</div>
      </div>
    ),
  },
  {
    title: "누구나 검증 가능",
    desc: "트랜잭션 해시로 Etherscan에서 누구든 직접 대조해 확인할 수 있습니다.",
    body: (
      <div className={styles.mockProof}>
        <div className={styles.mockHash}>0x81c0…f0c37b</div>
        <div className={styles.mockProofLink}>↗ Etherscan에서 보기</div>
      </div>
    ),
  },
];

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

      <BloodSupplyPanel />

      <div className={`${styles.card} ${styles.gateCard}`}>
        <FeatureCarousel items={FEATURES} />
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
        <div className={styles.gateActions}>
          <button type="button" className={styles.btn} onClick={onConnect} disabled={connecting}>
            {connecting ? "연결 중..." : "지갑 연결하기"}
          </button>
          {DEMO_MODE && (
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onConnectDemo}>
              MetaMask 없이 데모로 체험하기
            </button>
          )}
        </div>
        <div className={styles.gateNote}>
          이름·주민번호·병원 기록은 저장되지 않습니다. 지갑 주소로만 조회합니다.
        </div>
      </div>
    </div>
  );
}
