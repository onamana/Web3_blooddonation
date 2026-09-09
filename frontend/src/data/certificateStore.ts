/**
 * 데모 모드 전용 인메모리 증서 상태.
 *
 * 양도/사용 처리가 실제로 상태를 바꿔야 "이미 사용한 증서를 다시 검증하면 막힌다"는
 * 이중사용 차단 데모가 성립하기 때문에, 목업을 읽기 전용으로 두지 않고 여기서 변형한다.
 * 새로고침하면 초기 목업으로 되돌아간다.
 */
import type { Certificate, CertificateEvent } from "../types/certificate";
import { INITIAL_CERTIFICATES } from "./certificateMock";

let certificates: Certificate[] = structuredClone(INITIAL_CERTIFICATES);
let nextBlockNumber = 7010000;
// 실제 컨트랙트에서는 tokenId를 컨트랙트가 증가시킨다. 목업도 같은 규칙으로 이어붙인다.
let nextTokenId = Math.max(...INITIAL_CERTIFICATES.map((c) => Number(c.tokenId))) + 1;

function fakeTxHash() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function find(tokenId: string) {
  return certificates.find((c) => c.tokenId === tokenId) ?? null;
}

function appendEvent(certificate: Certificate, event: Omit<CertificateEvent, "txHash" | "blockNumber">) {
  const txHash = fakeTxHash();
  certificate.history = [...certificate.history, { ...event, txHash, blockNumber: nextBlockNumber++ }];
  return txHash;
}

export const demoCertificateStore = {
  list(owner: string) {
    return certificates
      .filter((c) => c.owner.toLowerCase() === owner.toLowerCase())
      .sort((a, b) => b.issuedAt - a.issuedAt)
      .map((c) => structuredClone(c));
  },

  get(tokenId: string) {
    const found = find(tokenId);
    return found ? structuredClone(found) : null;
  },

  /**
   * 발급. 혈액원이 헌혈자 지갑으로 새 증서를 민팅하는 동작에 대응한다.
   * tokenId와 issuedAt은 호출자가 정하지 않는다(실제 컨트랙트와 같은 규칙).
   */
  issue(to: string, bloodType: Certificate["bloodType"], issuer: string) {
    const issuedAt = nowSeconds();
    const certificate: Certificate = {
      tokenId: String(nextTokenId++),
      owner: to,
      bloodType,
      issuedAt,
      issuer,
      status: "active",
      usedAt: null,
      usedBy: null,
      history: [],
    };

    // 발급 이력은 from이 zero address인 Transfer에 대응하므로 from을 null로 둔다.
    const txHash = appendEvent(certificate, {
      type: "issued",
      timestamp: issuedAt,
      from: null,
      to,
      org: issuer,
    });
    certificates = [...certificates, certificate];

    return { txHash, certificate: structuredClone(certificate) };
  },

  transfer(tokenId: string, from: string, to: string) {
    const certificate = find(tokenId);
    if (!certificate) throw new Error("존재하지 않는 증서입니다.");
    if (certificate.status === "used") throw new Error("이미 사용된 증서는 양도할 수 없습니다.");
    if (certificate.owner.toLowerCase() !== from.toLowerCase()) {
      throw new Error("이 증서의 현재 소유자가 아닙니다.");
    }

    const txHash = appendEvent(certificate, {
      type: "transferred",
      timestamp: nowSeconds(),
      from: certificate.owner,
      to,
      org: null,
    });
    certificate.owner = to;

    return { txHash, certificate: structuredClone(certificate) };
  },

  use(tokenId: string, hospital: string) {
    const certificate = find(tokenId);
    if (!certificate) throw new Error("존재하지 않는 증서입니다.");
    if (certificate.status === "used") throw new Error("이 증서는 이미 사용되었습니다.");

    const usedAt = nowSeconds();
    const txHash = appendEvent(certificate, {
      type: "used",
      timestamp: usedAt,
      from: null,
      to: null,
      org: hospital,
    });
    certificate.status = "used";
    certificate.usedAt = usedAt;
    certificate.usedBy = hospital;

    return { txHash, certificate: structuredClone(certificate) };
  },

  reset() {
    certificates = structuredClone(INITIAL_CERTIFICATES);
    nextTokenId = Math.max(...INITIAL_CERTIFICATES.map((c) => Number(c.tokenId))) + 1;
  },
};
