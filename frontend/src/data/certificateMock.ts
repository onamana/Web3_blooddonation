/**
 * 데모 모드(VITE_DEMO_MODE=true) 전용 증서 목업.
 * 실제 컨트랙트가 배포되면 백엔드 /certificate 응답이 같은 모양으로 이 자리를 대체한다.
 */
import type { Certificate } from "../types/certificate";
import { DEMO_WALLET_ADDRESS } from "./demoWallet";

const OTHER_WALLET = "0x9b2e000000000000000000000000000000007f31";

const ts = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

export const INITIAL_CERTIFICATES: Certificate[] = [
  {
    tokenId: "94",
    owner: DEMO_WALLET_ADDRESS,
    bloodType: "A",
    donationType: "whole",
    issuedAt: ts("2026-05-12T10:24:00+09:00"),
    issuer: "대전혈액원",
    status: "active",
    usedAt: null,
    usedBy: null,
    history: [
      {
        type: "issued",
        timestamp: ts("2026-05-12T10:24:00+09:00"),
        from: null,
        to: DEMO_WALLET_ADDRESS,
        org: "대전혈액원",
        txHash: "0x4f2a8c1b6d3e90a7f5c284be71d0396af8c5e2b41d7a6039c85b2fe147a09b1d",
        blockNumber: 6821044,
      },
    ],
  },
  {
    tokenId: "95",
    owner: DEMO_WALLET_ADDRESS,
    bloodType: "O",
    donationType: "platelet",
    issuedAt: ts("2026-07-03T14:10:00+09:00"),
    issuer: "대전혈액원",
    status: "active",
    usedAt: null,
    usedBy: null,
    history: [
      {
        type: "issued",
        timestamp: ts("2026-07-03T14:10:00+09:00"),
        from: null,
        to: OTHER_WALLET,
        org: "대전혈액원",
        txHash: "0x81c07de4a5b6392f0d47ae128b5c96370fe2a8d419c07b3546ea9218d5f0c37b",
        blockNumber: 6905317,
      },
      {
        type: "transferred",
        timestamp: ts("2026-08-20T09:02:00+09:00"),
        from: OTHER_WALLET,
        to: DEMO_WALLET_ADDRESS,
        org: null,
        txHash: "0x2d94ba07f3186c5e0a7b4d3928fc6501eab72d90c4f83165ae0d27b9143c8e6f",
        blockNumber: 6988402,
      },
    ],
  },
  {
    tokenId: "88",
    owner: DEMO_WALLET_ADDRESS,
    bloodType: "B",
    donationType: "plasma",
    issuedAt: ts("2026-03-11T11:40:00+09:00"),
    issuer: "충남혈액원",
    status: "used",
    usedAt: ts("2026-09-01T16:35:00+09:00"),
    usedBy: "충남대병원",
    history: [
      {
        type: "issued",
        timestamp: ts("2026-03-11T11:40:00+09:00"),
        from: null,
        to: DEMO_WALLET_ADDRESS,
        org: "충남혈액원",
        txHash: "0x7ae3f01c9d24b586037fa1e4c82b95d60371ea5f9c8b402d16ae73f5019c2b84",
        blockNumber: 6702118,
      },
      {
        type: "used",
        timestamp: ts("2026-09-01T16:35:00+09:00"),
        from: null,
        to: null,
        org: "충남대병원",
        txHash: "0xb5019fc7a2e386d40b17ca92f5308e6d419a70bc2853fd1046e9b7a3c02f581e",
        blockNumber: 7002915,
      },
    ],
  },
];
