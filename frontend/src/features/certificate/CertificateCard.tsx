import { Badge } from "../../components/Badge";
import type { Certificate } from "../../types/certificate";
import { formatOnchainDate } from "../../utils/onchain";
import { formatTokenId, statusLabel, statusVariant } from "./certificateLabels";
import { Button } from "./Button";
import { TransferForm } from "./TransferForm";
import styles from "./Certificate.module.css";

interface CertificateCardProps {
  certificate: Certificate;
  transferOpen: boolean;
  transferPending: boolean;
  onOpenTransfer: () => void;
  onCancelTransfer: () => void;
  onTransfer: (to: string) => void;
}
export function CertificateCard({
  certificate,
  transferOpen,
  transferPending,
  onOpenTransfer,
  onCancelTransfer,
  onTransfer,
}: CertificateCardProps) {
  const used = certificate.status === "used";

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.tokenId}>{formatTokenId(certificate.tokenId)}</span>
        <Badge variant={statusVariant(certificate.status)}>{statusLabel(certificate.status)}</Badge>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>발급</span>
        <span className={styles.rowValue}>
          {formatOnchainDate(certificate.issuedAt)} · {certificate.issuer}
        </span>
      </div>
      {used && certificate.usedAt !== null && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>사용</span>
          <span className={styles.rowValue}>
            {formatOnchainDate(certificate.usedAt)} · {certificate.usedBy}
          </span>
        </div>
      )}

      {transferOpen ? (
        <TransferForm pending={transferPending} onSubmit={onTransfer} onCancel={onCancelTransfer} />
      ) : (
        <div className={styles.actions}>
          <Button to={`/certificates/${certificate.tokenId}`}>상세 보기</Button>
          <Button onClick={onOpenTransfer} disabled={used}>
            양도하기
          </Button>
        </div>
      )}
    </div>
  );
}
