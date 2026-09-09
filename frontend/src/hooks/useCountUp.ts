import { useEffect, useRef, useState } from "react";

/**
 * 화면에 들어왔는지 알려준다. 한 번 보이면 계속 true로 둔다
 * (스크롤로 오갈 때마다 숫자가 다시 0으로 떨어지면 산만하다).
 */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // IntersectionObserver가 없는 환경에서는 그냥 바로 보여준다.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView] as const;
}

const DEFAULT_DURATION = 1200;

/** easeOutCubic — 처음에 빠르게 오르다 목표치 근처에서 잦아든다. */
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 0에서 target까지 굴러 올라가는 숫자.
 *
 * 참고: 21st.dev @lavikatiyar/card-4 — 화면에 들어오면
 * requestAnimationFrame 으로 elapsed/duration 을 easeOut 해서 값을 채운다.
 *
 * `active`가 true가 될 때 시작하고, target이 바뀌면(성분 탭 전환) 다시 0부터 올라간다.
 * 모션을 줄이도록 설정한 사용자에게는 애니메이션 없이 목표치를 바로 보여준다.
 */
export function useCountUp(target: number, active: boolean, duration = DEFAULT_DURATION) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start = 0;

    const tick = (now: number) => {
      if (start === 0) start = now;
      const t = Math.min(1, (now - start) / duration);
      setValue(target * easeOut(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    /*
      숨은 탭에서는 브라우저가 rAF를 멈춘다. 그때 바로 시작해두면 탭을 열었을 때
      경과 시간이 이미 duration을 넘어 숫자가 툭 튀어 목표치로 가버린다.
      그래서 문서가 보이는 순간부터 재기 시작한다(다른 탭으로 열어둔 경우도 정상 동작).
    */
    const begin = () => {
      start = 0;
      frame = requestAnimationFrame(tick);
    };

    if (document.visibilityState === "visible") {
      begin();
    } else {
      const onVisible = () => {
        if (document.visibilityState !== "visible") return;
        document.removeEventListener("visibilitychange", onVisible);
        begin();
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        document.removeEventListener("visibilitychange", onVisible);
        cancelAnimationFrame(frame);
      };
    }

    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);

  return value;
}
