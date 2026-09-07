import { COLOR } from "../../data/hospitalMock";
import type { DemandInsight } from "../../types/hospital";

const W = 300;
const H = 96;
const MIN = 30;
const MAX = 90;

export function Sparkline({ insight }: { insight: DemandInsight }) {
  const all = insight.actual.concat(insight.forecast);
  const pts = all.map((v, i): [number, number] => [
    Math.round(i * (W / (all.length - 1))),
    Math.round((H - ((v - MIN) / (MAX - MIN)) * H) * 10) / 10,
  ]);
  const actualPts = pts.slice(0, insight.actual.length);
  const forecastPts = pts.slice(insight.actual.length - 1);
  const band =
    forecastPts.map((p) => `${p[0]},${Math.max(2, p[1] - 11)}`).join(" ") +
    " " +
    forecastPts
      .slice()
      .reverse()
      .map((p) => `${p[0]},${Math.min(H - 2, p[1] + 11)}`)
      .join(" ");

  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}>
      <svg width="100%" height={96} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="수요 예측 스파크라인">
        <polygon points={band} fill="#EDE9FE" />
        <polyline points={actualPts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--ink)" strokeWidth={1.6} />
        <polyline
          points={forecastPts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={COLOR.plt}
          strokeWidth={1.6}
          strokeDasharray="4 3"
        />
      </svg>
      <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--mute)" }}>
          <span style={{ width: 12, height: 2, background: "var(--ink)" }} />
          실제 수요 8주
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--mute)" }}>
          <span style={{ width: 12, height: 2, background: COLOR.plt }} />
          예측
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--mute)" }}>
          <span style={{ width: 12, height: 8, background: "#EDE9FE" }} />
          신뢰구간 80%
        </span>
      </div>
    </div>
  );
}
