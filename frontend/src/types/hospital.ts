import type { BloodComponent, BloodType, RhType } from "./common";

export type Urgency = "일반" | "긴급" | "응급";
export type SortMode = "AI 추천순" | "거리순" | "유효기간 임박순";

export interface ComponentFilterOption {
  id: BloodComponent;
  color: string;
  hint: string;
}

export interface SearchConditions {
  abo: BloodType;
  rh: RhType;
  comps: BloodComponent[];
  units: number;
  region: string;
  urgency: Urgency;
}

export interface DemandInsight {
  id: "demand";
  title: string;
  color: string;
  summary: string;
  basis: string;
  actual: number[];
  forecast: number[];
  reasons: string[];
}

export interface WasteRiskRow {
  org: string;
  comp: BloodComponent;
  dday: string;
  color: string;
}

export interface WasteInsight {
  id: "waste";
  title: string;
  color: string;
  summary: string;
  basis: string;
  rows: WasteRiskRow[];
  transfer: string;
}

export type RouteNodeState = "ok" | "missing" | "fail";

export interface RouteNode {
  name: string;
  meta: string;
  state: RouteNodeState;
}

export interface RouteInsight {
  id: "route";
  title: string;
  color: string;
  summary: string;
  basis: string;
  nodes: RouteNode[];
  note: string;
}

export type Insight = DemandInsight | WasteInsight | RouteInsight;

export interface MatchResult {
  id: string;
  org: string;
  kind: string;
  distance: number;
  eta: number;
  comp: BloodComponent;
  blood: string;
  units: number;
  expiryDays: number;
  score: number;
  reason: string;
  recover: string;
  weights: [string, number][];
  verified: boolean;
}

export interface TimelineNode {
  name: string;
  meta: string;
  ok: boolean;
}

export interface ResultTimeline {
  org: string;
  donation: string;
  nodes: TimelineNode[];
}
