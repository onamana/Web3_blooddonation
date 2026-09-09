import { useEffect } from "react";
import { DEMO_MODE } from "../../api/env";
import { AlertIcon } from "../../components/icons";
import { BloodSupplyPanel } from "../../components/BloodSupplyPanel";
import { Modal } from "../../components/Modal";
import { CoverflowCarousel, type CoverflowItem } from "../../components/CoverflowCarousel";
import { ParticleFlock } from "../../components/ParticleFlock";
import type { WalletState } from "../../hooks/useWallet";
import { Button } from "./Button";
import styles from "./Certificate.module.css";

interface WalletGateProps {
  wallet: WalletState;
  onConnect: () => void;
  onConnectDemo: () => void;
  /** 연결 실패 모달을 닫는다. */
  onDismissError: () => void;
}

/*
  각 카드는 "설명용 시각 자료" 한 장이고, 긴 설명은 카드 밖(캡션)으로 내렸다.
  카드 안에 문장을 넣으면 옆으로 누운 카드에서 글자가 잘려 어수선해진다.
*/
const FEATURES: CoverflowItem[] = [
  {
    title: "왜 온체인 증서인가",
    desc:
      "종이 헌혈증서는 위조와 분실에 취약하고, 누가 언제 누구에게 넘겼는지 나중엔 증명할 방법이 없습니다. BloodPass는 증서를 ERC-721 토큰으로 발급해 발급·양도·사용 전 과정을 블록체인에 새깁니다.",
    visual: (
      <div className={styles.mockCompare}>
        <div className={styles.mockCompareItem} data-kind="paper">
          <span className={styles.mockCompareIcon}>✕</span>
          <span>
            <span className={styles.mockCompareLabel}>종이 증서</span>
            <br />
            <span className={styles.mockCompareNote}>위조·분실, 이력 없음</span>
          </span>
        </div>
        <div className={styles.mockCompareArrow}>▼</div>
        <div className={styles.mockCompareItem} data-kind="chain">
          <span className={styles.mockCompareIcon}>✓</span>
          <span>
            <span className={styles.mockCompareLabel}>ERC-721 온체인 증서</span>
            <br />
            <span className={styles.mockCompareNote}>전 과정 영구 기록</span>
          </span>
        </div>
      </div>
    ),
  },
  {
    title: "내 지갑의 증서, 한눈에",
    desc: "보유 중인 헌혈 증서를 지갑에서 실시간으로 확인합니다.",
    visual: (
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
    visual: (
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
    visual: (
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
    visual: (
      <div className={styles.mockProof}>
        <div className={styles.mockHash}>0x81c0…f0c37b</div>
        <div className={styles.mockProofLink}>↗ Etherscan에서 보기</div>
      </div>
    ),
  },
];

/** 지갑 미연결 상태에서 증서 목록(/certificates) 자리에 대신 보여주는 초기 화면. */
export function WalletGate({ wallet, onConnect, onConnectDemo, onDismissError }: WalletGateProps) {
  const connecting = wallet.status === "connecting";
  const failed = wallet.status === "error" && wallet.error !== null;
  // MetaMask 자체가 없는 경우와, 있는데 실패한 경우(취소 등)는 안내와 다음 행동이 다르다.
  const noMetaMask = !wallet.hasMetaMask;

  /*
    초기 화면만 배경을 완전 흰색으로 둔다. 페이지 배경은 body 에 걸려 있어서
    이 화면 폭(max-width) 안에서만 칠하면 좌우가 회색으로 남는다.
    그래서 게이트가 떠 있는 동안에만 body 에 표식을 남기고 global.css 에서 칠한다.
  */
  useEffect(() => {
    document.body.dataset.screen = "gate";
    return () => {
      delete document.body.dataset.screen;
    };
  }, []);

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
        <CoverflowCarousel items={FEATURES} />
      </div>

      {/*
        지갑 연결은 이 화면의 유일한 다음 행동이라 항상 보이는 하단 바에 둔다.
        fixed 라서 레이아웃 높이를 차지하지 않아 스크롤이 생기지 않는다.
      */}
      <div className={styles.gateBar}>
        <div className={styles.gateBarInner}>
          <span className={styles.gateBarNote}>
            이름·주민번호·병원 기록은 저장되지 않습니다. 지갑 주소로만 조회합니다.
          </span>
          <Button variant="push" onClick={onConnect} disabled={connecting}>
            {connecting ? "연결 중..." : "지갑 연결하기"}
          </Button>
        </div>
      </div>

      {/*
        연결 실패는 "설치하거나 데모로 우회해야" 넘어가는 막다른 상황이라
        레이아웃을 밀어내는 인라인 배너 대신 모달로 붙잡는다.
      */}
      <Modal
        open={failed}
        onClose={onDismissError}
        title={noMetaMask ? "MetaMask가 필요합니다" : "지갑 연결 실패"}
        icon={<AlertIcon size={15} />}
        actions={
          noMetaMask ? (
            <>
              <Button href="https://metamask.io/download/" variant="arrow" block>
                MetaMask 설치하러 가기
              </Button>
              {DEMO_MODE && (
                <Button
                  variant="arrow"
                  block
                  onClick={() => {
                    onDismissError();
                    onConnectDemo();
                  }}
                >
                  설치 없이 데모로 체험하기
                </Button>
              )}
            </>
          ) : (
            <Button
              block
              onClick={() => {
                onDismissError();
                onConnect();
              }}
            >
              다시 시도
            </Button>
          )
        }
      >
        <p style={{ margin: 0 }}>{wallet.error}</p>
        {noMetaMask && (
          <p style={{ margin: 0 }}>설치를 마치고 이 화면으로 돌아와 다시 연결하면 됩니다.</p>
        )}
      </Modal>
    </div>
  );
}
