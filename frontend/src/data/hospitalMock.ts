/**
 * 데모 목업 데이터. frontend/sample/bloodtrace-hospital-console.html 의 목업 데이터를
 * 그대로 옮긴 것으로, 실제 의료 데이터가 아니다.
 */
import type { BloodType, RhType } from "../types/common";
import type { ComponentFilterOption, Insight, MatchResult, SortMode, Urgency } from "../types/hospital";

export const COLOR = { rbc: "#B3202C", pls: "#B45309", plt: "#6D28D9" };

export const ABO_OPTIONS: BloodType[] = ["A", "B", "O", "AB"];
export const RH_OPTIONS: RhType[] = ["Rh+", "Rh-"];
export const COMPONENT_OPTIONS: ComponentFilterOption[] = [
  { id: "적혈구", color: COLOR.rbc, hint: "보존 35일" },
  { id: "혈장", color: COLOR.pls, hint: "보존 1년" },
  { id: "혈소판", color: COLOR.plt, hint: "보존 5일" },
];
export const REGION_OPTIONS = ["대전권", "세종", "충남", "충북"];
export const URGENCY_OPTIONS: Urgency[] = ["일반", "긴급", "응급"];
export const SORT_OPTIONS: SortMode[] = ["AI 추천순", "거리순", "유효기간 임박순"];
export const SORT_TIP = "유효기간 임박순: 폐기 방지 관점의 정렬입니다. 곧 만료될 재고를 먼저 소진해 폐기 유닛을 줄입니다.";

export const LEDGER_SYNC = "2026-10-05 09:12";

export const INSIGHTS: Insight[] = [
  {
    id: "demand",
    title: "수요 예측",
    color: COLOR.plt,
    summary: "이번 주 대전권 혈소판 수요 +38% 예상 — 3일 내 부족 가능",
    basis: "예측 근거: 최근 4주 수요, 계절 패턴, 재고 회전율",
    actual: [42, 45, 44, 49, 47, 52, 55, 58],
    forecast: [64, 71, 80],
    reasons: [
      "계절 패턴: 9~10월 수술 건수 상승 구간",
      "지역 수술 일정: 대전권 대형 수술 일정 12건 집중",
      "헌혈 유입 감소: 대학 방학 종료 전 헌혈의집 방문 −17%",
    ],
  },
  {
    id: "waste",
    title: "폐기 위험",
    color: "#C2410C",
    summary: "폐기 위험 재고 12유닛 (유효기간 3일 이내)",
    basis: "예측 근거: 기관별 재고 회전율, 최근 이관 이력",
    rows: [
      { org: "대전혈액원", comp: "혈소판", dday: "D-1", color: COLOR.plt },
      { org: "충남대병원 혈액은행", comp: "혈소판", dday: "D-2", color: COLOR.plt },
      { org: "대전성모병원 혈액은행", comp: "적혈구", dday: "D-3", color: COLOR.rbc },
      { org: "건양대병원 혈액은행", comp: "혈장", dday: "D-3", color: COLOR.pls },
    ],
    transfer: "타 기관 이관 시 8유닛 회수 가능 — 대전권 내 3개 기관 수요와 일치",
  },
  {
    id: "route",
    title: "경로 이상",
    color: "#C2410C",
    summary: "공급 경로 이상 감지 1건 — 기록 누락 구간 존재",
    basis: "탐지 근거: 노드 간 서명 연속성, 예상 이송 시간 초과",
    nodes: [
      { name: "검사 완료", meta: "2026-10-01 09:12 · 대전혈액원", state: "ok" },
      { name: "공급 확인", meta: "2026-10-01 14:30 · 청주의료원 혈액은행", state: "ok" },
      { name: "인수 서명 기록 누락", meta: "예상 2026-10-01 16:00 · 원장에 기록 없음", state: "missing" },
      { name: "사용 처리", meta: "2026-10-02 10:05 · 서명 검증 실패", state: "fail" },
    ],
    note: "기록 누락 구간: 공급 확인 후 인수 서명 노드가 원장에 존재하지 않습니다.",
  },
];

export const RESULTS: MatchResult[] = [
  {
    id: "R1",
    org: "대전혈액원",
    kind: "혈액원",
    distance: 4.2,
    eta: 25,
    comp: "혈소판",
    blood: "O Rh+",
    units: 6,
    expiryDays: 11,
    score: 92,
    reason: "근거리 + 유효기간 여유 + 해당 기관 재고 과잉 → 폐기 방지 효과",
    recover: "이 기관 선택 시 폐기 예상 4유닛 회수",
    weights: [
      ["거리", 30],
      ["유효기간", 35],
      ["재고 균형", 27],
    ],
    verified: true,
  },
  {
    id: "R2",
    org: "충남대병원 혈액은행",
    kind: "병원",
    distance: 6.8,
    eta: 32,
    comp: "혈소판",
    blood: "O Rh+",
    units: 4,
    expiryDays: 6,
    score: 86,
    reason: "이송 시간 짧고 재고 회전 빠름 — 유효기간 여유는 보통",
    recover: "이 기관 선택 시 폐기 예상 3유닛 회수",
    weights: [
      ["거리", 28],
      ["유효기간", 26],
      ["재고 균형", 32],
    ],
    verified: true,
  },
  {
    id: "R3",
    org: "대전성모병원 혈액은행",
    kind: "병원",
    distance: 9.1,
    eta: 38,
    comp: "혈장",
    blood: "O Rh+",
    units: 7,
    expiryDays: 18,
    score: 81,
    reason: "유효기간 여유 충분, 다만 요청 성분 일부만 충족",
    recover: "이 기관 선택 시 폐기 예상 2유닛 회수",
    weights: [
      ["거리", 22],
      ["유효기간", 33],
      ["재고 균형", 26],
    ],
    verified: true,
  },
  {
    id: "R4",
    org: "세종충남대병원 혈액은행",
    kind: "병원",
    distance: 21.4,
    eta: 47,
    comp: "적혈구",
    blood: "O Rh+",
    units: 9,
    expiryDays: 24,
    score: 74,
    reason: "재고 과잉 구간이나 이송 거리가 길어 응급 시 불리",
    recover: "이 기관 선택 시 폐기 예상 5유닛 회수",
    weights: [
      ["거리", 14],
      ["유효기간", 35],
      ["재고 균형", 25],
    ],
    verified: true,
  },
  {
    id: "R5",
    org: "건양대병원 혈액은행",
    kind: "병원",
    distance: 7.6,
    eta: 34,
    comp: "혈소판",
    blood: "O Rh+",
    units: 3,
    expiryDays: 3,
    score: 68,
    reason: "근거리이나 유효기간 임박 — 즉시 사용 계획이 있을 때만 권장",
    recover: "이 기관 선택 시 폐기 예상 3유닛 회수",
    weights: [
      ["거리", 26],
      ["유효기간", 12],
      ["재고 균형", 30],
    ],
    verified: true,
  },
  {
    id: "R6",
    org: "청주의료원 혈액은행",
    kind: "병원",
    distance: 38.9,
    eta: 62,
    comp: "혈장",
    blood: "O Rh+",
    units: 5,
    expiryDays: 14,
    score: 54,
    reason: "이력 검증 실패 구간 존재 — 원장 재확인 후 요청 권장",
    recover: "이 기관 선택 시 폐기 예상 1유닛 회수",
    weights: [
      ["거리", 8],
      ["유효기간", 30],
      ["재고 균형", 16],
    ],
    verified: false,
  },
];

/** 이력 보기 모달 — 헌혈자 화면(혈액 여정)과 동일한 원장 조각을 기관 관점으로 표시 */
export function timelineFor(r: MatchResult) {
  return {
    org: r.org,
    donation: `DN-2026-0412 · ${r.comp} 계열 원장 조각`,
    nodes: [
      { name: "채혈 완료", meta: "2026-09-28 10:24 · 대전 서구 헌혈의집", ok: true },
      { name: "검사 완료", meta: "2026-09-29 14:10 · 대전혈액원", ok: true },
      { name: `성분 분리 · ${r.comp}`, meta: "2026-09-29 18:02 · 대전혈액원", ok: true },
      { name: "기관 입고", meta: `2026-10-02 11:20 · ${r.org}`, ok: true },
      r.verified
        ? { name: "재고 보관 (사용 대기)", meta: `2026-10-02 11:55 · ${r.org}`, ok: true }
        : { name: "인수 서명 기록 누락", meta: "원장에 해당 노드 없음", ok: false },
    ],
  };
}
