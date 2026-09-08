import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--pri)" }}>404</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>페이지를 찾을 수 없습니다</div>
      <div style={{ fontSize: 13, color: "var(--mute)" }}>주소를 다시 확인해주세요.</div>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <Link to="/certificates">내 증서로</Link>
        <Link to="/verify">병원 검증으로</Link>
      </div>
    </div>
  );
}
