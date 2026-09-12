import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { shortenAddress } from "../../utils/address";
import styles from "./ConnectedWallet.module.css";

export function ConnectedWallet({ address }: { address: string }) {
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 1800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setNotice("주소를 복사했습니다");
    } catch {
      setNotice("복사하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  return (
    <div className={styles.wallet}>
      <span className={styles.address} title={address} aria-label={`연결된 지갑 ${address}`}>
        {shortenAddress(address)}
      </span>
      <button className={styles.copy} type="button" onClick={() => void copy()} aria-label="지갑 주소 복사">
        <Copy className={styles.copyIcon} size={10} strokeWidth={2} aria-hidden="true" />
      </button>
      <div className={styles.toast} data-visible={Boolean(notice)} role="status" aria-live="polite">{notice}</div>
    </div>
  );
}
