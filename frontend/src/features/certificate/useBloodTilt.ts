import { useEffect, useRef } from "react";

/**
 * 혈액팩 카드 위에서 마우스를 따라 살짝 기우는 효과 + 커서를 따라 도는 하이라이트.
 *
 * 카드가 캐러셀 안에서 이미 3D로 배치돼 있어서, 캐러셀이 손을 뗀(가운데·드래그 아님·앞면)
 * 카드에서만 켠다 — 그 판단은 호출부(enabled)가 한다.
 */
export function useBloodTilt(enabled: boolean) {
  const hitAreaRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bag = bagRef.current;
    const hitArea = hitAreaRef.current;
    if (!bag || !hitArea || !enabled) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let previousTime = 0;

    const animate = (time: number) => {
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
      previousTime = time;
      const blend = 1 - Math.exp(-elapsed / 85);
      currentX += (targetX - currentX) * blend;
      currentY += (targetY - currentY) * blend;
      const settled = Math.abs(targetX - currentX) + Math.abs(targetY - currentY) < 0.001;
      if (settled) { currentX = targetX; currentY = targetY; }
      bag.style.transform = `perspective(1200px) rotateX(${-currentY * 6}deg) rotateY(${currentX * 6}deg)`;

      const glare = glareRef.current;
      if (glare) {
        const px = 50 + currentX * 40;
        const py = 30 + currentY * 25;
        glare.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.4), transparent 55%)`;
      }
      frame = settled ? 0 : requestAnimationFrame(animate);
      if (settled) previousTime = 0;
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(animate);
    };
    const handleMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || reducedMotion.matches) return;
      // Measure the stationary hit area, never the bag being transformed.
      const rect = hitArea.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const clamp = (value: number) => Math.max(-1, Math.min(1, value));
      targetX = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
      targetY = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);
      schedule();
    };
    const handleLeave = () => {
      targetX = 0;
      targetY = 0;
      schedule();
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      currentX = currentY = targetX = targetY = 0;
      bag.style.transform = "";
      if (glareRef.current) glareRef.current.style.background = "";
    };

    hitArea.addEventListener("pointermove", handleMove);
    hitArea.addEventListener("pointerleave", handleLeave);
    hitArea.addEventListener("pointercancel", handleLeave);
    reducedMotion.addEventListener("change", reset);

    return () => {
      hitArea.removeEventListener("pointermove", handleMove);
      hitArea.removeEventListener("pointerleave", handleLeave);
      hitArea.removeEventListener("pointercancel", handleLeave);
      reducedMotion.removeEventListener("change", reset);
      reset();
    };
  }, [enabled]);

  return { hitAreaRef, bagRef, glareRef };
}
