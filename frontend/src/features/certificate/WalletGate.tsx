import { useEffect, useState } from "react";
import { AlertIcon } from "../../components/icons";
import { BloodSupplyPanel } from "../../components/BloodSupplyPanel";
import { Modal } from "../../components/Modal";
import { CoverflowCarousel, type CoverflowItem } from "../../components/CoverflowCarousel";
import { ParticleFlock } from "../../components/ParticleFlock";
import type { WalletState } from "../../hooks/useWallet";
import { shortenAddress } from "../../utils/address";
import { Button } from "./Button";
import { BlockingLoader } from "./BlockingLoader";
import styles from "./Certificate.module.css";

interface WalletGateProps {
  wallet: WalletState;
  onConnect: () => void;
  onSelectAccount: (address: string) => void;
  onCancelAccountSelection: () => void;
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
    desc: "지갑을 연결하면 그 주소가 보유한 증서를 온체인에서 바로 조회합니다.",
    visual: (
      <div className={styles.mockCert}>
        <div className={styles.mockCertHead}>
          <span className={styles.mockTokenId}>증서 #94</span>
          <span className={styles.mockBadgeOk}>사용 가능</span>
        </div>
        <div className={styles.mockCertType}>전혈 320mL</div>
        <div className={styles.mockCertIssuer}>대전혈액원 · 2026.05.12 발급</div>
      </div>
    ),
  },
  {
    title: "발급부터 사용까지 전 과정 기록",
    desc: "발급·양도는 ERC-721 Transfer 이벤트로, 사용은 CertificateUsed 이벤트로 온체인에 기록됩니다.",
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
        <div className={styles.mockResultBlocked}>✕ 사용 불가</div>
      </div>
    ),
  },
  {
    title: "누구나 검증 가능",
    desc: "트랜잭션 해시로 Etherscan에서 누구든 직접 대조해 확인할 수 있습니다.",
    visual: (
      <div className={styles.mockProof}>
        <div className={styles.mockHash}>0x50afbe…50da</div>
        <div className={styles.mockProofLink}>↗ Etherscan에서 보기</div>
      </div>
    ),
  },
];

/** 지갑 미연결 상태에서 증서 목록(/certificates) 자리에 대신 보여주는 초기 화면. */
export function WalletGate({ wallet, onConnect, onSelectAccount, onCancelAccountSelection, onConnectDemo, onDismissError }: WalletGateProps) {
  const [startChoiceOpen, setStartChoiceOpen] = useState(false);
  const connecting = wallet.status === "connecting";
  const selecting = wallet.status === "selecting";
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
      {connecting && <BlockingLoader message="지갑 연결을 요청 중입니다..." />}
      {/*
        방울들이 모여 서비스명을 만들고, 커서가 지나가면 흩어졌다 다시 모인다.
        카드 안에 두면 카드 폭(=본문 가독 폭)에 갇혀 작아지므로 카드 밖 히어로로 뺐다.
      */}
      <div className={styles.gateHero}>
        <ParticleFlock text="BloodPass" height={190} className={styles.gateFlock} />
      </div>

      <BloodSupplyPanel />

      {selecting && (
        <section className={styles.walletChoicePanel} aria-labelledby="wallet-choice-title">
          <span className={styles.walletChoiceEyebrow}>WALLET SELECTION</span>
          <h2 id="wallet-choice-title">연결할 지갑을 선택하세요</h2>
          <p>MetaMask가 이 사이트에 허용한 지갑입니다.</p>
          <div className={styles.walletChoiceList}>
            {wallet.availableAccounts.map((address) => (
              <Button key={address} variant="arrow" block onClick={() => onSelectAccount(address)}>
                {shortenAddress(address)}
              </Button>
            ))}
          </div>
          <Button onClick={onCancelAccountSelection}>취소</Button>
        </section>
      )}

      <div className={`${styles.card} ${styles.gateCard}`}>
        <CoverflowCarousel items={FEATURES} />
      </div>

      {/*
        지갑 연결은 이 화면의 유일한 다음 행동이라 항상 보이는 하단 바에 둔다.
        fixed 라서 레이아웃 높이를 차지하지 않아 스크롤이 생기지 않는다.
      */}
      {!selecting && <div className={styles.gateBar}>
        <div className={styles.gateBarInner}>
          <span className={styles.gateBarNote}>
            이름·주민번호·혈액형은 온체인에 기록하지 않습니다. 지갑 주소로만 조회합니다.
          </span>
          <Button variant="push" onClick={() => setStartChoiceOpen(true)} disabled={connecting}>
            {connecting ? "연결 중..." : "지갑 연결하기"}
          </Button>
        </div>
      </div>}

      <Modal
        open={startChoiceOpen}
        onClose={() => setStartChoiceOpen(false)}
        title="시작 방법을 선택하세요"
        actions={
          <>
            <Button
              variant="arrow"
              block
              onClick={() => {
                setStartChoiceOpen(false);
                if (window.ethereum) {
                  onConnect();
                } else {
                  window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
                  // 설치 페이지는 새 탭에서 열고, 돌아올 원래 화면은 최신 확장 프로그램 상태로 갱신한다.
                  window.location.reload();
                }
              }}
            >
              MetaMask로 시작하기
            </Button>
            <Button
              block
              onClick={() => {
                setStartChoiceOpen(false);
                onConnectDemo();
              }}
            >
              데모 체험하기
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          MetaMask를 연결해 실제 Sepolia 증서를 확인하거나, 설치 없이 데모 흐름을 체험할 수 있습니다.
        </p>
      </Modal>

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
