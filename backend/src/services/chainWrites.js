import { ethers } from "ethers";
import { getSigner } from "../config/chain.js";
import { allPendingIssuances } from "./certificateStore.js";

// One backend process owns the relayer. Serialize writes so issue/use/record
// cannot choose the same nonce. Multi-instance deployment needs a shared queue.
let tail = Promise.resolve();
export function withChainWrite(action, recovering = {}) {
  const result = tail.then(async () => {
    const pending = allPendingIssuances();
    if (pending.length) {
      const signer = getSigner();
      const provider = signer.provider;
      try {
        const { chainId } = await provider.getNetwork();
        for (const row of pending) {
          if (!row.scope.startsWith(`${chainId}:`)) continue;
          if (row.scope === recovering.scope && row.request_id === recovering.requestId) continue;
          if (ethers.Transaction.from(row.raw_tx).from.toLowerCase() !== signer.address.toLowerCase()) continue;
          if (!await provider.getTransactionReceipt(row.tx_hash)) {
            const error = new Error("이전 발급을 같은 요청 키로 재시도한 뒤 진행하세요.");
            error.code = "PENDING_ISSUANCE";
            throw error;
          }
        }
      } finally { provider.destroy(); }
    }
    return action();
  });
  tail = result.catch(() => {});
  return result;
}
