import { useCallback, useEffect, useRef, useState } from "react";
import {
  DRAG_THRESHOLD,
  STEP_RATIO,
  cardIndexAtPoint,
  isInteractiveTarget,
  relativeOffset,
  transformFor,
} from "../../components/coverflowMath";
import type { Certificate } from "../../types/certificate";
import { FlipCertificateCard } from "./FlipCertificateCard";
import styles from "./CertificateCarousel.module.css";

interface CertificateCarouselProps {
  certificates: Certificate[];
  transferTokenId: string | null;
  transferPending: boolean;
  onOpenTransfer: (tokenId: string) => void;
  onCancelTransfer: () => void;
  onTransfer: (tokenId: string, to: string) => void;
}

/**
 * 내 증서 캐러셀.
 *
 * 기하학은 메인 화면 소개 캐러셀(CoverflowCarousel)과 같은 코버플로우다 — 좌우로 끌면
 * 부채가 손가락을 따라오고, 옆 카드를 누르면 가운데로 온다. 다른 점은 가운데 카드를
 * 한 번 더 누르면(또는 다시 누르면) 카드가 뒤집혀 상세 정보를 보여준다는 것.
 *
 * 뒤집힌 채로 드래그를 시작하면 — 상세를 보다가 옆 카드로 넘어가려는 것이므로 —
 * 곧장 앞면으로 돌려놓아 "넘어가면서 자연스럽게 앞면으로" 보이게 한다.
 */
export function CertificateCarousel({
  certificates,
  transferTokenId,
  transferPending,
  onOpenTransfer,
  onCancelTransfer,
  onTransfer,
}: CertificateCarouselProps) {
  const n = certificates.length;
  const [index, setIndex] = useState(0);
  const [dragFraction, setDragFraction] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const update = () => setCardWidth(card.offsetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // 가운데가 바뀌면 새 카드는 항상 앞면부터 보여준다.
  useEffect(() => setFlipped(false), [index]);

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + n) % n), [n]);

  const pressStartX = useRef<number | null>(null);
  const movedRef = useRef(false);
  const step = cardWidth * STEP_RATIO;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || step === 0 || isInteractiveTarget(e.target)) return;
    pressStartX.current = e.clientX;
    movedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const startX = pressStartX.current;
    if (startX === null) return;

    const dx = e.clientX - startX;
    if (!movedRef.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      movedRef.current = true;
      setDragging(true);
      // 상세를 보던 중이었다면, 옆으로 넘어가는 움직임과 함께 앞면으로 돌려놓는다.
      setFlipped(false);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* 캡처 없이도 동작한다 */
      }
    }
    setDragFraction(dx / step);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pressStartX.current === null) return;
    pressStartX.current = null;

    // 움직이지 않았으면 클릭이다.
    if (!movedRef.current) {
      if (isInteractiveTarget(e.target)) return; // 양도 버튼 등 카드 내부 동작은 그대로 둔다.
      const picked = cardIndexAtPoint(e.clientX, e.clientY);
      if (picked === null) return;
      if (picked === index) {
        setFlipped((f) => !f);
      } else {
        setIndex(picked);
      }
      return;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* 캡처가 없었으면 해제할 것도 없다 */
    }
    setDragging(false);
    const settled = Math.round(dragFraction);
    setDragFraction(0);
    if (settled !== 0) go(-settled);
  };

  if (n === 0) return null;

  return (
    <div className={styles.wrap}>
      <div
        className={styles.viewport}
        role="group"
        aria-label="내 헌혈 증서"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
        data-dragging={dragging}
      >
        <div className={styles.stage}>
          {certificates.map((certificate, i) => {
            const pos = relativeOffset(i, index, n) + dragFraction;
            const { transform, opacity, zIndex } = transformFor(pos);
            const centered = Math.round(pos) === 0;
            const hidden = opacity === 0;
            return (
              <div
                key={certificate.tokenId}
                ref={i === 0 ? cardRef : undefined}
                className={styles.card}
                data-card-index={hidden ? undefined : i}
                data-centered={centered}
                style={{ transform, opacity, zIndex }}
                aria-hidden={hidden}
              >
                <FlipCertificateCard
                  certificate={certificate}
                  flipped={centered && flipped}
                  tiltActive={centered && !dragging}
                  transferOpen={transferTokenId === certificate.tokenId}
                  transferPending={transferPending}
                  onOpenTransfer={() => onOpenTransfer(certificate.tokenId)}
                  onCancelTransfer={onCancelTransfer}
                  onTransfer={(to) => onTransfer(certificate.tokenId, to)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.dots}>
        {certificates.map((certificate, i) => (
          <button
            key={certificate.tokenId}
            type="button"
            className={styles.dot}
            data-active={i === index}
            aria-label={`${i + 1}번째 증서로 이동`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
