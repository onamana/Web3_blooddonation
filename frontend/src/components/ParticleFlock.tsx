import { useEffect, useRef } from "react";

interface ParticleFlockProps {
  /** 파티클이 모여서 만들 글자 */
  text: string;
  /** 캔버스 높이(px). 폭은 부모를 채운다. */
  height?: number;
  className?: string;
}

/** 파티클 하나 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 목표 좌표 (글자를 이루는 지점) */
  tx: number;
  ty: number;
  r: number;
  /** 개체마다 다른 미세 흔들림 위상 */
  phase: number;
}

const SPRING = 0.09; // 목표점으로 당기는 힘
const FRICTION = 0.86;
const MOUSE_PUSH = 2.6;

/**
 * 샘플링 간격(px). 글자가 커져도 이 값을 고정해야 파티클 밀도가 일정하게 유지된다.
 * 총 개수에 상한을 걸어 간격을 늘리는 방식으로 하면, 글자를 키울수록 면적이 제곱으로
 * 늘어나 파티클이 희박해지고 글자가 붉은 구름처럼 보인다.
 */
const SAMPLE_STEP = 2;
/**
 * 성능 한계선. 여기에 걸릴 때만 간격을 벌린다.
 * 실측(1920 화면, 히어로 190px 높이)에서 5,154개가 프레임당 1.3ms — 60fps 예산의 8%였다.
 * 상한을 실사용 개수 바로 위에 두면 창 크기가 조금 바뀔 때 간격이 튀어 밀도가 갑자기
 * 절반이 되므로, 넉넉히 잡아둔다.
 */
const PERF_MAX_PARTICLES = 9000;

/**
 * 글자 모양을 유지하는 파티클 떼.
 *
 * 커서가 다가오면 반경 안의 개체가 밀려나고, 커서가 지나가면 다시 제자리로 모여
 * 글자 형태를 복구한다. 새 떼가 손을 피해 갈라지는 것과 같은 움직임.
 *
 * 접근성: 글자는 시각 효과일 뿐이라 role="img" + aria-label 로 읽히게 하고,
 * OS에서 "동작 줄이기"를 켠 사용자에게는 애니메이션 없이 완성된 글자만 한 번 그린다.
 */
export function ParticleFlock({ text, height = 96, className }: ParticleFlockProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fontFamily = getComputedStyle(wrap).fontFamily;

    let particles: Particle[] = [];
    let width = 0;
    let cssHeight = height;
    let frame = 0;
    let raf = 0;
    /** 커서 위치 (캔버스 좌표). 화면 밖이면 null */
    let mouse: { x: number; y: number } | null = null;
    /** 반발 반경. 글자 크기에 비례해야 큰 글자에서도 구멍이 시원하게 파인다. */
    const mouseRadius = Math.max(70, Math.round(height * 0.85));

    /** 글자를 오프스크린에 그려 불투명 픽셀 좌표를 뽑아낸다. */
    function sampleTargets(w: number, h: number): { x: number; y: number }[] {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d");
      if (!octx) return [];

      let size = h * 0.62;
      octx.font = `800 ${size}px ${fontFamily}`;
      const measured = octx.measureText(text).width;
      const maxWidth = w * 0.92;
      if (measured > maxWidth) {
        size = Math.max(10, (size * maxWidth) / measured);
        octx.font = `800 ${size}px ${fontFamily}`;
      }
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillStyle = "#000";
      octx.fillText(text, w / 2, h / 2);

      const { data } = octx.getImageData(0, 0, w, h);
      // 기본은 고정 간격. 성능 한계에 걸릴 때만 간격을 벌린다.
      for (let step = SAMPLE_STEP; step <= 9; step += 1) {
        const points: { x: number; y: number }[] = [];
        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            if (data[(y * w + x) * 4 + 3]! > 128) points.push({ x, y });
          }
        }
        if (points.length <= PERF_MAX_PARTICLES || step === 9) return points;
      }
      return [];
    }

    function build() {
      const rect = wrap!.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      cssHeight = height;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(cssHeight * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${cssHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targets = sampleTargets(width, cssHeight);
      particles = targets.map((t, i) => {
        const existing = particles[i];
        return {
          // 처음에는 흩어진 상태에서 시작해 글자로 모여든다
          x: existing?.x ?? Math.random() * width,
          y: existing?.y ?? Math.random() * cssHeight,
          vx: existing?.vx ?? 0,
          vy: existing?.vy ?? 0,
          tx: t.x,
          ty: t.y,
          r: 1.3 + Math.random() * 1.2,
          phase: Math.random() * Math.PI * 2,
        };
      });

      if (reduceMotion) {
        for (const p of particles) {
          p.x = p.tx;
          p.y = p.ty;
        }
      }
      // 첫 rAF 프레임을 기다리지 않고 바로 한 번 그린다.
      // 백그라운드 탭에서는 브라우저가 rAF를 멈추므로, 이게 없으면 캔버스가 빈 채로 남는다.
      draw();
    }

    function draw() {
      ctx!.clearRect(0, 0, width, cssHeight);
      ctx!.fillStyle = "#b3202c";
      for (const p of particles) {
        ctx!.globalAlpha = 0.5 + (p.r - 1.3) * 0.3;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function tick() {
      frame += 1;
      for (const p of particles) {
        let ax = (p.tx - p.x) * SPRING;
        let ay = (p.ty - p.y) * SPRING;

        // 가만히 있어도 살짝 들썩이게
        ax += Math.sin(frame * 0.03 + p.phase) * 0.03;
        ay += Math.cos(frame * 0.026 + p.phase) * 0.03;

        if (mouse) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < mouseRadius * mouseRadius) {
            const dist = Math.sqrt(dist2) || 0.001;
            const force = (1 - dist / mouseRadius) * MOUSE_PUSH;
            ax += (dx / dist) * force;
            ay += (dy / dist) * force;
          }
        }

        p.vx = (p.vx + ax) * FRICTION;
        p.vy = (p.vy + ay) * FRICTION;
        p.x += p.vx;
        p.y += p.vy;
      }
      draw();
      raf = window.requestAnimationFrame(tick);
    }

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // 캔버스 바깥이라도 반경 안이면 밀어내도록 여유를 둔다
      const margin = mouseRadius;
      mouse =
        x > -margin && x < rect.width + margin && y > -margin && y < rect.height + margin
          ? { x, y }
          : null;
    };
    const handlePointerLeave = () => {
      mouse = null;
    };

    build();

    if (!reduceMotion) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerleave", handlePointerLeave);
      raf = window.requestAnimationFrame(tick);
    }

    // 폰트가 늦게 붙으면 글자 모양이 달라지므로 다시 샘플링한다
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) build();
    });

    const observer = new ResizeObserver(() => build());
    observer.observe(wrap);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      observer.disconnect();
    };
  }, [text, height]);

  return (
    <div ref={wrapRef} className={className} style={{ width: "100%", height }}>
      <canvas ref={canvasRef} role="img" aria-label={text} style={{ display: "block" }} />
    </div>
  );
}
