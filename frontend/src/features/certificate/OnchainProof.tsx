import { shortenTxHash, txUrl } from "../../utils/onchain";
import styles from "./Certificate.module.css";

interface OnchainProofProps {
  txHash: string;
  /** 트랜잭션 해시 앞에 붙일 라벨 (없으면 해시만) */
  label?: string;
}

/** 트랜잭션 해시 + 익스플로러 링크. "정말 체인에 올렸다"를 클릭 한 번으로 확인시키는 용도. */
export function OnchainProof({ txHash, label }: OnchainProofProps) {
  return (
    <div className={styles.proof}>
      {label && <span>{label}</span>}
      <span className="mono">{shortenTxHash(txHash)}</span>
      <a className={styles.proofLink} href={txUrl(txHash)} target="_blank" rel="noreferrer">
        ↗ Etherscan에서 보기
      </a>
    </div>
  );
}

interface OnchainProofBoxProps {
  title: string;
  txHash: string;
}

/** 동작 완료 직후에 보여주는 강조된 온체인 증거 블록. */
export function OnchainProofBox({ title, txHash }: OnchainProofBoxProps) {
  return (
    <div className={styles.proofBox}>
      <div className={styles.proofBoxTitle}>✓ {title}</div>
      <OnchainProof txHash={txHash} />
    </div>
  );
}
