/**
 * 데모 목업 데이터. frontend/sample/bloodtrace-donor-app.html 의 목업 데이터를
 * 그대로 옮긴 것으로, 실제 의료 데이터가 아니다.
 */
import type { Donation, DonationSummary, TamperTarget, WalletInfo } from "../types/donor";

export const COMPONENT_COLOR = {
  적혈구: "#B3202C",
  혈장: "#B45309",
  혈소판: "#6D28D9",
} as const;

/** 데모 모드 전용 가상 지갑 (실 지갑 연동과는 무관) */
export const DEMO_WALLET: WalletInfo = {
  address: "0x7a3f0000000000000000000000000000c214",
  demoDonorId: "DNR-8F2A",
};

export const DONOR_SUMMARY: DonationSummary = {
  count: 7,
  volume: "1,850mL",
  lastDate: "2026-09-28",
  lastPlace: "대전 서구 헌혈의집",
  nextDday: "D-12",
  patients: 5,
  patientTip: "성분 분리로 한 번의 헌혈이 여러 환자에게 사용될 수 있습니다. 추정값입니다.",
  region: "대전권",
};

export const DONATIONS: Donation[] = [
  {
    id: "DN-2026-0412",
    date: "2026-09-28",
    volume: 400,
    place: "대전 서구 헌혈의집",
    stage: "3개 성분 처리 완료 (수혈 1 / 보관 1 / 폐기 1)",
    root: {
      name: "채혈 완료",
      time: "2026-09-28 10:24",
      org: "대전 서구 헌혈의집",
      hash: "0x4e21…8b03",
      block: "1,284,102",
      fields: ["헌혈 ID", "채혈량", "채혈 일시", "채혈 기관 서명"],
    },
    test: {
      name: "검사 완료",
      time: "2026-09-29 14:10",
      org: "대전혈액원",
      hash: "0x7d55…19ac",
      block: "1,284,517",
      fields: ["검사 항목 코드", "적합 여부", "성분 분리 결과", "혈액원 서명"],
    },
    branches: [
      {
        code: "RBC-0412-A",
        comp: "적혈구",
        color: COMPONENT_COLOR.적혈구,
        status: "수혈 완료",
        statusVariant: "ok",
        steps: [
          {
            name: "의료기관 공급",
            time: "2026-10-03 09:05",
            org: "충남대병원 혈액은행",
            hash: "0x9c1b…4ff0",
            block: "1,291,880",
            fields: ["성분 코드", "유닛 수", "보관 온도", "인수 기관 서명"],
          },
          {
            name: "수혈 완료",
            time: "2026-10-03 16:40",
            org: "충남대병원",
            hash: "0xa17e…22d9",
            block: "1,292,455",
            fields: ["성분 코드", "사용 구분", "처리 일시", "기관 서명"],
          },
        ],
      },
      {
        code: "PLS-0412-B",
        comp: "혈장",
        color: COMPONENT_COLOR.혈장,
        status: "재고 보관 · D-8",
        statusVariant: "stored",
        steps: [
          {
            name: "의료기관 공급",
            time: "2026-10-02 11:20",
            org: "대전성모병원 혈액은행",
            hash: "0x3f88…7c15",
            block: "1,290,604",
            fields: ["성분 코드", "유닛 수", "보관 온도", "인수 기관 서명"],
          },
          {
            name: "재고 보관",
            time: "2026-10-02 11:55",
            org: "대전성모병원 혈액은행",
            hash: "0xb420…d3a7",
            block: "1,290,733",
            fields: ["보관 위치 코드", "유효기간", "재고 상태", "기관 서명"],
            note: "유효기간 D-8 · 사용 대기",
          },
        ],
      },
      {
        code: "PLT-0412-C",
        comp: "혈소판",
        color: COMPONENT_COLOR.혈소판,
        status: "폐기",
        statusVariant: "disc",
        steps: [
          {
            name: "의료기관 공급",
            time: "2026-10-01 08:40",
            org: "세종충남대병원 혈액은행",
            hash: "0x62ac…9e01",
            block: "1,289,120",
            fields: ["성분 코드", "유닛 수", "보관 온도", "인수 기관 서명"],
          },
          {
            name: "폐기 처리",
            time: "2026-10-06 07:10",
            org: "세종충남대병원 혈액은행",
            hash: "0xd991…5b6e",
            block: "1,296,340",
            fields: ["폐기 사유 코드", "폐기 일시", "입회 기관 서명"],
            note: "사유: 유효기간 경과 (혈소판 보존 5일)",
          },
        ],
      },
    ],
  },
  {
    id: "DN-2026-0287",
    date: "2026-06-14",
    volume: 400,
    place: "대전 유성 헌혈의집",
    stage: "2개 성분 사용 완료",
    root: {
      name: "채혈 완료",
      time: "2026-06-14 13:02",
      org: "대전 유성 헌혈의집",
      hash: "0x1b7d…04c9",
      block: "1,180,441",
      fields: ["헌혈 ID", "채혈량", "채혈 일시", "채혈 기관 서명"],
    },
    test: {
      name: "검사 완료",
      time: "2026-06-15 10:30",
      org: "대전혈액원",
      hash: "0x55ea…88f2",
      block: "1,181,002",
      fields: ["검사 항목 코드", "적합 여부", "성분 분리 결과", "혈액원 서명"],
    },
    branches: [
      {
        code: "RBC-0287-A",
        comp: "적혈구",
        color: COMPONENT_COLOR.적혈구,
        status: "수혈 완료",
        statusVariant: "ok",
        steps: [
          {
            name: "의료기관 공급",
            time: "2026-06-17 09:15",
            org: "건양대병원 혈액은행",
            hash: "0x77c0…1ad4",
            block: "1,183,776",
            fields: ["성분 코드", "유닛 수", "보관 온도", "인수 기관 서명"],
          },
          {
            name: "수혈 완료",
            time: "2026-06-18 14:05",
            org: "건양대병원",
            hash: "0x9a15…6b33",
            block: "1,184,910",
            fields: ["성분 코드", "사용 구분", "처리 일시", "기관 서명"],
          },
        ],
      },
      {
        code: "PLS-0287-B",
        comp: "혈장",
        color: COMPONENT_COLOR.혈장,
        status: "수혈 완료",
        statusVariant: "ok",
        steps: [
          {
            name: "의료기관 공급",
            time: "2026-06-16 15:40",
            org: "충남대병원 혈액은행",
            hash: "0x2d4b…c810",
            block: "1,182,530",
            fields: ["성분 코드", "유닛 수", "보관 온도", "인수 기관 서명"],
          },
          {
            name: "수혈 완료",
            time: "2026-06-19 08:50",
            org: "충남대병원",
            hash: "0xe306…af71",
            block: "1,185,602",
            fields: ["성분 코드", "사용 구분", "처리 일시", "기관 서명"],
          },
        ],
      },
    ],
  },
  {
    id: "DN-2026-0119",
    date: "2026-03-02",
    volume: 320,
    place: "세종 조치원 헌혈의집",
    stage: "1개 성분 폐기 · 1개 수혈 완료",
    root: {
      name: "채혈 완료",
      time: "2026-03-02 11:48",
      org: "세종 조치원 헌혈의집",
      hash: "0x8c02…3d55",
      block: "1,092,110",
      fields: ["헌혈 ID", "채혈량", "채혈 일시", "채혈 기관 서명"],
    },
    test: {
      name: "검사 완료",
      time: "2026-03-03 09:20",
      org: "대전혈액원",
      hash: "0x40fa…7712",
      block: "1,092,884",
      fields: ["검사 항목 코드", "적합 여부", "성분 분리 결과", "혈액원 서명"],
    },
    branches: [
      {
        code: "RBC-0119-A",
        comp: "적혈구",
        color: COMPONENT_COLOR.적혈구,
        status: "수혈 완료",
        statusVariant: "ok",
        steps: [
          {
            name: "의료기관 공급",
            time: "2026-03-05 10:05",
            org: "세종충남대병원 혈액은행",
            hash: "0x6b71…9c20",
            block: "1,095,330",
            fields: ["성분 코드", "유닛 수", "보관 온도", "인수 기관 서명"],
          },
          {
            name: "수혈 완료",
            time: "2026-03-06 13:30",
            org: "세종충남대병원",
            hash: "0xc8de…1f04",
            block: "1,096,208",
            fields: ["성분 코드", "사용 구분", "처리 일시", "기관 서명"],
          },
        ],
      },
      {
        code: "PLT-0119-B",
        comp: "혈소판",
        color: COMPONENT_COLOR.혈소판,
        status: "폐기",
        statusVariant: "disc",
        steps: [
          {
            name: "폐기 처리",
            time: "2026-03-08 06:55",
            org: "대전혈액원",
            hash: "0x0f39…5e88",
            block: "1,098,470",
            fields: ["폐기 사유 코드", "폐기 일시", "입회 기관 서명"],
            note: "사유: 수요 기관 미배정 후 유효기간 경과",
          },
        ],
      },
    ],
  },
];

/** 위변조 시뮬레이션 토글 시 검증 실패로 표시할 노드 */
export const TAMPER_TARGET: TamperTarget = {
  donationId: "DN-2026-0412",
  comp: "혈장",
  step: "의료기관 공급",
};
