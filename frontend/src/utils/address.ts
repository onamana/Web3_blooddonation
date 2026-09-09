/** 지갑 주소는 화면에 항상 축약해서만 노출한다 (0x1234…abcd) */
export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
