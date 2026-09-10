import { useEffect, useRef } from "react";

/**
 * 혈액팩 카드 위에서 마우스를 따라 살짝 기우는 효과 + 커서를 따라 도는 하이라이트.
 *
 * 카드가 캐러셀 안에서 이미 3D로 배치돼 있어서, 캐러셀이 손을 뗀(가운데·드래그 아님·앞면)
 * 카드에서만 켠다 — 그 판단은 호출부(enabled)가 한다.
 */
export function useBloodTilt(enabled: boolean) {
  const bagRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bag = bagRef.current;
    if (!bag || !enabled) return;

    const handleMove = (e: MouseEvent) => {
      const rect = bag.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotY = ((x - rect.width / 2) / (rect.width / 2)) * 10;
      const rotX = -((y - rect.height / 2) / (rect.height / 2)) * 10;
      bag.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

      const glare = glareRef.current;
      if (glare) {
        const px = (x / rect.width) * 100;
        const py = (y / rect.height) * 100;
        glare.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.4), transparent 55%)`;
      }
    };

    const handleLeave = () => {
      bag.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
      const glare = glareRef.current;
      if (glare) glare.style.background = "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.35), transparent 55%)";
    };

    bag.addEventListener("mousemove", handleMove);
    bag.addEventListener("mouseleave", handleLeave);

    return () => {
      bag.removeEventListener("mousemove", handleMove);
      bag.removeEventListener("mouseleave", handleLeave);
      bag.style.transform = "";
    };
  }, [enabled]);

  return { bagRef, glareRef };
}
