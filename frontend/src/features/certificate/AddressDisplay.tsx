import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "../../components/icons";
import { shortenAddress } from "../../utils/address";
import styles from "./Certificate.module.css";

interface AddressDisplayProps {
  address: string;
  /** false면 툴팁만 제공하고 복사 버튼은 숨긴다 (타임라인처럼 줄이 좁은 곳). */
  copyable?: boolean;
}

/**
 * 지갑 주소 표시.
 *
 * 42자를 그대로 두면 읽히지도 않고 레이아웃을 밀어내므로 축약해서 보여주고,
 * 마우스를 올리면 전체 주소를 툴팁으로, 오른쪽 버튼으로는 전체 주소를 복사하게 한다.
 */
export function AddressDisplay({ address, copyable = true }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // 클립보드 API를 쓸 수 없는 환경(비 HTTPS 등)에서도 흐름은 끊지 않는다.
    }
    setCopied(true);
  };

  return (
    <span className={styles.address}>
      <span className={styles.addressWrap} tabIndex={0}>
        <span className={`${styles.addressText} mono`}>{shortenAddress(address)}</span>
        <span className={`${styles.tooltip} mono`} role="tooltip">
          {address}
        </span>
      </span>

      {copyable && (
        <button
          type="button"
          className={styles.copyBtn}
          onClick={() => void handleCopy()}
          aria-label="전체 주소 복사"
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
        </button>
      )}
      {copied && (
        <span className={styles.copiedNote} role="status">
          복사됨
        </span>
      )}
    </span>
  );
}
