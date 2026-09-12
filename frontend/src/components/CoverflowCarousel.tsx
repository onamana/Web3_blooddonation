import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

/*
  21st.dev @ruixen.ui/coverflow-carousel 의 배치를 실측해서 옮긴 값들.
  프리뷰에서 오프셋 1~6의 transform 을 읽어 역산했고, 깊이/회전 곡선은
  n^0.56 이 여섯 지점 모두 소수 4자리까지 일치했다.
*/
const STEP_RATIO = 1.05; // x = 카드폭 * 1.05 * offset (원본 gap 0.05)
const DEPTH_RATIO = 0.6; // z = -카드폭 * 0.6 * curve
const CURVE_EXP = 0.56; // curve = |offset| ^ 0.56
const ROT_BASE = 44; // offset 1 에서 44deg
const ROT_MAX = 82; // 그 이상은 82deg 에서 잘린다
const OPACITY_STEP = 0.1;
const OPACITY_MIN = 0.5;
/** 좌우로 이만큼까지만 보여주고 나머지는 투명하게 둔다. */
const VISIBLE = 3;
/**
 * 이만큼(px) 움직이기 전까지는 드래그로 보지 않는다.
 *
 * pointerdown 에서 바로 setPointerCapture 를 걸면 이후 click 이 캡처한 요소(뷰포트)로
 * 재타겟돼서, 옆 카드의 클릭이 영영 도착하지 않는다. 그래서 실제로 움직인 뒤에야
 * 드래그를 시작한다.
 */
const DRAG_THRESHOLD = 4;

/** i번째 카드가 index에서 몇 칸 떨어져 있는지 (좌우 방향 포함, 최단 경로) */
function relativeOffset(i: number, index: number, n: number) {
  const raw = (i - index + n) % n;
  return raw > n / 2 ? raw - n : raw;
}

/**
 * 분수 오프셋(드래그 중)도 그대로 받는다.
 *
 * x·z 를 px 로 계산하지 않고 카드 폭(--cf-card)의 배수로 넘긴다.
 * 카드 폭을 JS로 재서 넣으면, 기울어진 카드의 투영 폭이 섞여 들어가
 * 부채가 스스로 접히는 문제가 생긴다. CSS 가 직접 곱하게 두면 그 고리가 끊긴다.
 */
function transformFor(pos: number) {
  const mag = Math.abs(pos);
  const curve = mag === 0 ? 0 : Math.pow(mag, CURVE_EXP);
  const xMul = (STEP_RATIO * pos).toFixed(4);
  const zMul = (-DEPTH_RATIO * curve).toFixed(4);
  const rotateY = -Math.sign(pos) * Math.min(ROT_BASE * curve, ROT_MAX);
  return {
    transform: `translateX(calc(-50% + var(--cf-card) * ${xMul})) translateZ(calc(var(--cf-card) * ${zMul})) rotateY(${rotateY.toFixed(2)}deg)`,
    opacity: mag > VISIBLE + 0.5 ? 0 : Math.max(OPACITY_MIN, 1 - OPACITY_STEP * mag),
    zIndex: 100 - Math.round(mag),
  };
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

  /**
   * 포인터 아래에 실제로 보이는 최상단 카드를 찾는다.
   *
   * 카드를 3D로 겹쳐 놓으면 카드마다 투명 버튼을 얹어도 옆 카드 버튼에 가려져
   * 클릭이 엉뚱한 곳으로 간다. elementsFromPoint 는 실제 그려진 순서(위→아래)를
   * 돌려주므로, 사용자가 눈으로 보고 누른 그 카드를 그대로 집어낼 수 있다.
   */
  const cardIndexAtPoint = (x: number, y: number) => {
    for (const el of document.elementsFromPoint(x, y)) {
      const card = (el as HTMLElement).closest?.("[data-card-index]");
      if (card) return Number(card.getAttribute("data-card-index"));
    }
    return null;
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
