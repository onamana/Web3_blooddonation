import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { DRAG_THRESHOLD, STEP_RATIO, cardIndexAtPoint, relativeOffset, transformFor } from "./coverflowMath";
import styles from "./CoverflowCarousel.module.css";

export interface CoverflowItem {
  title: string;
  /** 스테이지 아래에 붙는 보충 설명. 카드 안에는 긴 문장을 넣지 않는다. */
  desc: string;
  /** 카드에 들어가는 시각 자료 (실제 화면을 본뜬 미리보기) */
  visual: ReactNode;
}

interface CoverflowCarouselProps {
  items: CoverflowItem[];
}

/**
 * 코버플로우 캐러셀.
 *
 * 가운데 카드는 정면, 좌우 카드는 Y축으로 눕고 뒤로 밀려 부채처럼 펼쳐진다.
 * - 옆 카드를 누르면 그 카드가 가운데로 온다
 * - 좌우로 끌면 부채가 손가락을 그대로 따라오고, 놓으면 가장 가까운 카드로 스냅한다
 * - 좌우 방향키로도 넘길 수 있다
 */
export function CoverflowCarousel({ items }: CoverflowCarouselProps) {
  const n = items.length;
  const [index, setIndex] = useState(0);
  /** 드래그 중 부채 전체가 밀린 양 (카드 한 칸 = 1.0) */
  const [dragFraction, setDragFraction] = useState(0);
  const [dragging, setDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);

  /*
    드래그 한 칸이 몇 px인지 알기 위한 폭. 반드시 offsetWidth(레이아웃 폭)를 쓴다 —
    getBoundingClientRect().width 는 3D로 기울어진 투영 폭이라 인덱스가 바뀔 때마다
    값이 변한다.
  */
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const update = () => setCardWidth(card.offsetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + n) % n), [n]);

  /** 눌린 지점. 아직 드래그로 승격되지 않은 상태도 여기에 담긴다. */
  const pressStartX = useRef<number | null>(null);
  /** 이번 누름이 임계값을 넘겨 드래그가 됐는지 (놓을 때 클릭과 구분하는 용도) */
  const movedRef = useRef(false);
  const step = cardWidth * STEP_RATIO;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || step === 0) return;
    pressStartX.current = e.clientX;
    movedRef.current = false;
    // 여기서 캡처하지 않는다 — 캡처하면 옆 카드의 click 이 뷰포트로 재타겟된다.
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const startX = pressStartX.current;
    if (startX === null) return;

    const dx = e.clientX - startX;
    if (!movedRef.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      // 이제부터 진짜 드래그. 포인터가 카드 밖으로 나가도 계속 따라오게 캡처한다.
      movedRef.current = true;
      setDragging(true);
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

    // 움직이지 않았으면 클릭 — 누른 카드를 가운데로 가져온다.
    if (!movedRef.current) {
      const picked = cardIndexAtPoint(e.clientX, e.clientY);
      if (picked !== null && picked !== index) setIndex(picked);
      return;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* 캡처가 없었으면 해제할 것도 없다 */
    }
    setDragging(false);
    // 가장 가까운 카드로 스냅.
    const settled = Math.round(dragFraction);
    setDragFraction(0);
    if (settled !== 0) go(-settled);
  };

  const focused = items[index]!;

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <button type="button" className={styles.navBtn} onClick={() => go(-1)} aria-label="이전 기능 보기">
          ‹
        </button>

        <div
          className={styles.viewport}
          role="group"
          aria-label="서비스 소개"
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") go(-1);
            if (e.key === "ArrowRight") go(1);
          }}
          data-dragging={dragging}
        >
          <div className={styles.stage} ref={stageRef}>
            {items.map((item, i) => {
              const pos = relativeOffset(i, index, n) + dragFraction;
              const { transform, opacity, zIndex } = transformFor(pos);
              const centered = Math.round(pos) === 0;
              const hidden = opacity === 0;
              return (
                <div
                  key={item.title}
                  ref={i === 0 ? cardRef : undefined}
                  className={styles.card}
                  data-card-index={hidden ? undefined : i}
                  data-centered={centered}
                  style={{ transform, opacity, zIndex }}
                  aria-hidden={hidden}
                >
                  <div className={styles.visual}>{item.visual}</div>
                </div>
              );
            })}
          </div>
        </div>

        <button type="button" className={styles.navBtn} onClick={() => go(1)} aria-label="다음 기능 보기">
          ›
        </button>
      </div>

      <div key={index} className={styles.caption}>
        <div className={styles.captionTitle}>{focused.title}</div>
        <p className={styles.captionDesc}>{focused.desc}</p>
      </div>

      <div className={styles.dots}>
        {items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            className={styles.dot}
            data-active={i === index}
            aria-label={`${i + 1}번째 기능으로 이동`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
