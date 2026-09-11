import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/walletContext";
import styles from "./NavTabs.module.css";

interface Indicator {
  left: number;
  width: number;
}

/** 경로가 있는 탭들. 마지막 "지갑 연결 해제"는 이동이 아니라 동작이라 따로 처리한다. */
const ROUTES = [
  { label: "내 증서", to: "/certificates" },
  { label: "증서 검증", to: "/verify" },
  { label: "혈액원 발급", to: "/issue" },
];

/** /certificates/94 처럼 하위 경로도 "내 증서" 탭이 활성이어야 한다. */
function activeIndexFor(pathname: string) {
  return ROUTES.findIndex((r) => pathname === r.to || pathname.startsWith(`${r.to}/`));
}

/**
 * 상단 우측 화면 전환 탭.
 *
 * 참고: 21st.dev @yadwinder/vercel-tabs — 호버를 따라오는 알약과 활성 탭 아래로
 * 미끄러지는 밑줄, 두 개의 절대배치 인디케이터로 만든다. 위치는 탭 DOM을 실측해서 넣는다.
 */
export function NavTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { disconnect } = useWallet();

  /*
    해제만 하면 상세·검증·발급 화면은 그대로 남는다 (게이트를 띄우는 화면이
    "내 증서" 하나뿐이라서). 그래서 해제 직후 초기 화면으로 돌려보낸다.
  */
  const handleDisconnect = () => {
    void disconnect();
    navigate("/certificates");
  };

  const activeIndex = activeIndexFor(pathname);
  const [hovered, setHovered] = useState<number | null>(null);
  const [pill, setPill] = useState<Indicator | null>(null);
  const [underline, setUnderline] = useState<Indicator | null>(null);

  const rowRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLElement | null)[]>([]);

  const measure = useCallback(
    (index: number | null): Indicator | null => {
      const el = index === null ? null : tabRefs.current[index];
      if (!el) return null;
      return { left: el.offsetLeft, width: el.offsetWidth };
    },
    [],
  );

  // 활성 밑줄 — 경로가 바뀌거나 글꼴 로드로 폭이 변할 때 다시 잰다.
  useEffect(() => {
    const update = () => setUnderline(measure(activeIndex >= 0 ? activeIndex : null));
    update();

    const row = rowRef.current;
    if (!row || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => observer.disconnect();
  }, [activeIndex, measure]);

  // 호버 알약
  useEffect(() => {
    setPill(measure(hovered));
  }, [hovered, measure]);

  const tabProps = (index: number) => ({
    ref: (el: HTMLElement | null) => {
      tabRefs.current[index] = el;
    },
    className: styles.tab,
    onMouseEnter: () => setHovered(index),
    onFocus: () => setHovered(index),
  });

  return (
    <nav
      className={styles.wrap}
      aria-label="화면 이동"
      onMouseLeave={() => setHovered(null)}
      onBlur={() => setHovered(null)}
    >
      <div
        className={styles.pill}
        style={{ left: pill?.left ?? 0, width: pill?.width ?? 0, opacity: pill ? 1 : 0 }}
        aria-hidden="true"
      />
      <div
        className={styles.underline}
        style={{ left: underline?.left ?? 0, width: underline?.width ?? 0, opacity: underline ? 1 : 0 }}
        aria-hidden="true"
      />

      <div className={styles.row} ref={rowRef}>
        {ROUTES.map((route, i) => (
          <Link
            key={route.to}
            to={route.to}
            data-active={i === activeIndex}
            aria-current={i === activeIndex ? "page" : undefined}
            {...tabProps(i)}
          >
            {route.label}
          </Link>
        ))}

        {/* 이동이 아니라 동작이라 밑줄이 붙지 않는다 */}
        <button type="button" onClick={handleDisconnect} {...tabProps(ROUTES.length)}>
          지갑 연결 해제
        </button>
      </div>
    </nav>
  );
}
