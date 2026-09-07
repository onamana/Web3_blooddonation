/**
 * 지갑 주소로부터 안정적으로 파생시킨 "데모용" donor ID.
 *
 * 실제 서비스에서는 B(DID 모듈)가 발급한 VC 기반 익명 ID를 사용해야 하지만,
 * 아직 그 API가 없으므로 같은 주소면 항상 같은 값이 나오는 간단한 해시로 대체한다.
 * 이 값은 온체인/DID 시스템의 실제 식별자가 아니다.
 */
export function deriveDemoDonorId(address: string): string {
  const normalized = address.toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  const code = hash.toString(16).toUpperCase().padStart(4, "0").slice(0, 4);
  return `DNR-${code}(DEMO)`;
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
