import { useCallback, useEffect, useState } from "react";
import { listCertificates, transferCertificate } from "../../api/certificate";
import { ApiError } from "../../api/client";
import { useWallet } from "../../hooks/walletContext";
import type { Certificate } from "../../types/certificate";
import { WalletGate } from "./WalletGate";
import { AddressDisplay } from "./AddressDisplay";
import { BrandBar } from "./BrandBar";
import { CertificateCarousel } from "./CertificateCarousel";
import { formatTokenId } from "./certificateLabels";
import { OnchainProofBox } from "./OnchainProof";
import styles from "./Certificate.module.css";
import listStyles from "./CertificateList.module.css";

/** 화면 1: 증서 목록 (지갑) — 보유 증서 카드 + 양도 */
export function CertificateListScreen() {
  const wallet = useWallet();
  const address = wallet.address;

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [transferTokenId, setTransferTokenId] = useState<string | null>(null);
  const [transferPending, setTransferPending] = useState(false);
  const [transferResult, setTransferResult] = useState<{ tokenId: string; txHash: string } | null>(null);

  const load = useCallback(async (owner: string) => {
    setStatus("loading");
    setError(null);
    try {
      setCertificates(await listCertificates(owner));
      setStatus("success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "증서를 불러오지 못했습니다.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (address) void load(address);
  }, [address, load]);

  const handleTransfer = async (tokenId: string, to: string) => {
    if (!address) return;
    setTransferPending(true);
    setError(null);
    try {
      const result = await transferCertificate({ tokenId, from: address, to });
      setTransferResult({ tokenId, txHash: result.txHash });
      setTransferTokenId(null);
      await load(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "양도에 실패했습니다.");
    } finally {
      setTransferPending(false);
    }
  };

  if (wallet.status !== "connected" || !address) {
    return (
      <WalletGate
        wallet={wallet}
        onConnect={wallet.connect}
        onConnectDemo={wallet.connectDemoWallet}
        onDismissError={wallet.dismissError}
      />
    );
  }

  return (
    <div className={styles.shell}>
      <BrandBar />

      <section className={listStyles.overview} aria-labelledby="certificate-title">
      <div className={listStyles.heading}>
        <div>
          <span className={listStyles.eyebrow}>MY BLOODPASS</span>
          <h1 id="certificate-title" className={listStyles.title}>내 헌혈 증서</h1>
          <p className={listStyles.description}>나눔의 기록을 한곳에, 소중한 마음을 다음으로.</p>
        </div>
        <div className={listStyles.wallet}><span>연결된 지갑</span><AddressDisplay address={address} /></div>
      </div>
      <div className={listStyles.stats} aria-live="polite">
        {[
          { label: "보유 증서", count: certificates.length },
          { label: "사용 가능", count: certificates.filter((c) => c.status === "active").length },
          { label: "사용 완료", count: certificates.filter((c) => c.status === "used").length },
        ].map(({ label, count }, i) => (
          <div key={label} className={listStyles.stat} data-highlight={i === 1}>
            <span>{label}</span><strong>{status === "success" ? count : "—"}<small>장</small></strong>
          </div>
        ))}
      </div>
      </section>

      {error && (
        <div className={styles.banner} role="alert">
          {error}
        </div>
      )}

      {transferResult && (
        <OnchainProofBox
          title={`${formatTokenId(transferResult.tokenId)} 양도 완료`}
          txHash={transferResult.txHash}
        />
      )}

      {status === "loading" && <div className={styles.empty}>불러오는 중...</div>}

      {status === "success" && certificates.length === 0 && (
        <div className={styles.empty}>이 지갑이 보유한 증서가 없습니다.</div>
      )}

      {status === "success" && certificates.length > 0 && (
        <section className={listStyles.collection} aria-label="보유 증서 둘러보기">
        <div className={listStyles.collectionHead}><h2>나의 나눔 기록</h2><span>카드를 눌러 상세 정보와 이력을 확인하세요</span></div>
        <CertificateCarousel
          certificates={certificates}
          transferTokenId={transferTokenId}
          transferPending={transferPending}
          onOpenTransfer={(tokenId) => {
            setTransferTokenId(tokenId);
            setTransferResult(null);
          }}
          onCancelTransfer={() => setTransferTokenId(null)}
          onTransfer={(tokenId, to) => void handleTransfer(tokenId, to)}
        />
        </section>
      )}
    </div>
  );
}
