import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./FeatureCarousel.module.css";

export interface FeatureCarouselItem {
  title: string;
  /** 캡션에 쓸 한 줄 설명. 카드 자체로 뜻이 통하면 생략해도 된다. */
  desc?: string;
  /** 카드 안에 실제로 그릴 내용 (실제 화면을 본뜬 미니 미리보기 등) */
  body: ReactNode;
}

interface FeatureCarouselProps {
  items: FeatureCarouselItem[];
}

/** i번째 카드가 index로부터 몇 칸 떨어져 있는지 (좌우 방향 포함, 최단 경로로 정규화) */
function relativeOffset(i: number, index: number, n: number) {
  const raw = (i - index + n) % n;
  return raw > n / 2 ? raw - n : raw;
}

/**
 * 가운데 카드는 정면에 온전히, 좌우 카드는 스테이지 바깥으로 잘려 일부만 보이는 평면형
 * 캐러셀 (참고: Libraries.dev 쇼케이스). 캡션은 가운데 카드에만 붙는다.
 */
export function FeatureCarousel({ items }: FeatureCarouselProps) {
  const [index, setIndex] = useState(0);
  const n = items.length;

  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLButtonElement>(null);
  const [metrics, setMetrics] = useState({ stageWidth: 0, cardWidth: 0, gap: 0 });

  useEffect(() => {
    const stage = stageRef.current;
    const track = trackRef.current;
    const card = cardRef.current;
    if (!stage || !track || !card) return;

    const update = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap || "0");
      setMetrics({
        stageWidth: stage.clientWidth,
        cardWidth: card.getBoundingClientRect().width,
        gap,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const go = (delta: number) => setIndex((i) => (i + delta + n) % n);

  const { stageWidth, cardWidth, gap } = metrics;
  const trackOffset = stageWidth / 2 - cardWidth / 2 - index * (cardWidth + gap);
  const focused = items[index]!;

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <button type="button" className={styles.navBtn} onClick={() => go(-1)} aria-label="이전 기능 보기">
          ‹
        </button>

        <div className={styles.stage} ref={stageRef}>
          <div className={styles.track} ref={trackRef} style={{ transform: `translateX(${trackOffset}px)` }}>
            {items.map((item, i) => {
              const offset = relativeOffset(i, index, n);
              const hidden = Math.abs(offset) > 1;
              const label = item.desc ? `${item.title}. ${item.desc}` : item.title;
              return (
                <button
                  key={item.title}
                  ref={i === 0 ? cardRef : undefined}
                  type="button"
                  className={styles.card}
                  data-focused={i === index}
                  aria-hidden={hidden}
                  aria-label={label}
                  title={label}
                  tabIndex={hidden ? -1 : 0}
                  style={{ pointerEvents: hidden ? "none" : "auto" }}
                  onClick={() => setIndex(i)}
                >
                  {item.body}
                </button>
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
        {focused.desc && <div className={styles.captionDesc}>{focused.desc}</div>}
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
