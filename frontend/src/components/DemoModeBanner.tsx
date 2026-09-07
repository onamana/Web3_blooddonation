import { DEMO_MODE } from "../api/env";

export function DemoModeBanner({ className }: { className?: string }) {
  if (!DEMO_MODE) return null;
  return (
    <div className={className} role="note">
      데모 모드 — 화면의 수치와 이력은 실제 의료 데이터가 아닌 가상 데모 데이터입니다.
    </div>
  );
}
