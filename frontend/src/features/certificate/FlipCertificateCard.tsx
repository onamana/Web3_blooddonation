import { Badge } from "../../components/Badge";
import type { Certificate } from "../../types/certificate";
import { formatOnchainDate } from "../../utils/onchain";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./Button";
import { HistoryTimeline } from "./HistoryTimeline";
import { TransferForm } from "./TransferForm";
import { useBloodTilt } from "./useBloodTilt";
import { donationTypeLabel, formatTokenId, statusLabel, statusVariant } from "./certificateLabels";
import styles from "./FlipCertificateCard.module.css";

interface FlipCertificateCardProps {
  certificate: Certificate;
  /** 발급 미리보기에서는 실제 카드 앞면만 렌더링한다. */
  previewOnly?: boolean;
  /** 캐러셀 중앙 카드에서만 true가 될 수 있다 — 중앙이 아니면 항상 앞면이다. */
  flipped: boolean;
  /** 가운데·드래그 중이 아님 — 이때만 혈액팩이 마우스를 따라 기울고 액체가 출렁인다. */
  tiltActive: boolean;
  transferOpen: boolean;
  transferPending: boolean;
  onOpenTransfer: () => void;
  onCancelTransfer: () => void;
  onTransfer: (to: string) => void;
}

/**
 * 증서 한 장.
 *
 * 앞면은 sample/blood-pack-sloshing.html 의 혈액팩 카드를 옮긴 시각 자료 —
 * 마우스를 올리면 카드가 기울고(perspective tilt) 그 관성으로 액체가 출렁인다(useBloodTilt).
 * 뒷면은 sample/new-card-design-sample 처럼 오른쪽에서 왼쪽으로 뒤집혀 상세 정보를 보여준다.
 * 뒤집는 트리거는 이 카드가 아니라 캐러셀(중앙 카드 클릭)이 쥐고 있다 — 여기서는 상태만 반영한다.
 */
export function FlipCertificateCard({
  certificate,
  previewOnly = false,
  flipped,
  tiltActive,
  transferOpen,
  transferPending,
  onOpenTransfer,
  onCancelTransfer,
  onTransfer,
}: FlipCertificateCardProps) {
  const used = certificate.status === "used";
  const { hitAreaRef, bagRef, glareRef } = useBloodTilt(tiltActive && !flipped);

  return (
    <div className={styles.flipOuter}>
      <div className={styles.flipInner} data-flipped={flipped}>
        {/*
          앞면 — 사용자가 준 Desktop/sam/Blood Bag.dc 디자인을 그대로 이식한 것.
          거기 있던 좌표(612x612 캔버스 안의 152,116 ~ 460,584 박스)를 이 박스 기준
          퍼센트로 환산해서 옮겼다. 라벨 칸의 값만 우리 데이터로 채웠다.
        */}
        <div className={styles.face} data-side="front" ref={hitAreaRef}>
          <div className={styles.bag} data-used={used} ref={bagRef}>
            {/* 위쪽 튜브 포트 3개 */}
            <div className={styles.port} style={{ left: "30.19%" }}>
              <div className={styles.portBandShort} />
            </div>
            <div className={styles.port} style={{ left: "45.13%" }}>
              <div className={styles.portBandLong} />
            </div>
            <div className={styles.port} style={{ left: "60.06%" }}>
              <div className={styles.portBandShort} />
            </div>

            {/* 겉을 감싸는 플라스틱 팩 껍질 (겉면 광택까지 포함) */}
            <div className={styles.shell} />

            {/* 아래쪽 배출구 */}
            <div className={styles.spout} />

            {/* 안쪽 혈액 — 사용됨이면 색이 바랜다 */}
            <div className={styles.fill}>
              <div className={styles.fillHighlight1} />
              <div className={styles.fillHighlight2} />
            </div>

            {/* 팩에 붙은 정보 라벨 */}
            <div className={styles.label}>
              <div className={styles.labelHeader}>
                <div className={styles.labelHeaderCol}>
                  <span className={`${styles.labelHeaderValue} mono`}>{formatTokenId(certificate.tokenId)}</span>
                </div>
                <div className={styles.labelHeaderCol} data-last>
                  <span
                    className={styles.labelHeaderValue}
                    data-ok={certificate.status === "active"}
                    data-used={used}
                  >
                    {statusLabel(certificate.status)}
                  </span>
                </div>
              </div>

              <div className={styles.labelBody}>
                <div className={styles.labelBodyLeft}>
                  <div className={styles.labelBodyLeftMain}>
                    <div className={styles.labelCaption}>헌혈 종류</div>
                    <div className={styles.labelBig}>{donationTypeLabel(certificate.donationType, certificate.volumeMl)}</div>
                    <div className={styles.labelIssuer}>{certificate.issuer}</div>
                  </div>
                  <div className={styles.labelFooterStrip} data-center>
                    <span>헌혈일자</span>
                    <span className="mono">{formatOnchainDate(certificate.issuedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.bagGlare} ref={glareRef} aria-hidden="true" />
          </div>
        </div>

        {!previewOnly && <div className={styles.face} data-side="back">
          <div className={styles.detail}>
            {/* 기본 정보 — 고정. 이력만 아래에서 따로 스크롤된다. */}
            <div className={styles.detailTop}>
              <div className={styles.detailHead}>
                <span className={`${styles.bagTokenId} mono`}>{formatTokenId(certificate.tokenId)}</span>
                <Badge variant={statusVariant(certificate.status)}>{statusLabel(certificate.status)}</Badge>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>헌혈 종류</span>
                <span className={styles.detailValue}>{donationTypeLabel(certificate.donationType, certificate.volumeMl)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>발급기관</span>
                <span className={styles.detailValue}>{certificate.issuer}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>발급일</span>
                <span className={`${styles.detailValue} mono`}>{formatOnchainDate(certificate.issuedAt)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>소유자</span>
                <span className={styles.detailValue}>
                  <AddressDisplay address={certificate.owner} copyable={false} />
                </span>
              </div>
              {used && certificate.usedAt !== null && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>사용</span>
                  <span className={styles.detailValue}>
                    {formatOnchainDate(certificate.usedAt)} · {certificate.usedBy}
                  </span>
                </div>
              )}
            </div>

            {/* 이력 — 이 칸만 따로 스크롤(드래그)된다. */}
            <div className={styles.detailHistoryCard}>
              <div className={styles.detailHistoryTitle}>이력</div>
              <div className={styles.detailHistoryScroll} data-scrollable>
                <HistoryTimeline history={certificate.history} />
              </div>
            </div>

            {/* 양도 버튼 — 고정. */}
            <div className={styles.detailFooter}>
              {transferOpen ? (
                <TransferForm pending={transferPending} onSubmit={onTransfer} onCancel={onCancelTransfer} />
              ) : (
                <Button size="sm" onClick={onOpenTransfer} disabled={used}>
                  양도하기
                </Button>
              )}
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}
