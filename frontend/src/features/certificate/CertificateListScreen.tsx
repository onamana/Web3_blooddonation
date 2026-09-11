import { useCallback, useEffect, useState } from "react";
import { listCertificates, transferCertificate } from "../../api/certificate";
import { ApiError } from "../../api/client";
import { DemoModeBanner } from "../../components/DemoModeBanner";
import { useWallet } from "../../hooks/walletContext";
import type { Certificate } from "../../types/certificate";
import { WalletGate } from "./WalletGate";
import { AddressDisplay } from "./AddressDisplay";
import { BrandBar } from "./BrandBar";
import { CertificateCard } from "./CertificateCard";
import { BlockingLoader } from "./BlockingLoader";
import { LoadingIndicator } from "./LoadingIndicator";
import { formatTokenId } from "./certificateLabels";
import { OnchainProofBox } from "./OnchainProof";
import styles from "./Certificate.module.css";

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
        onSelectAccount={wallet.selectAccount}
        onCancelAccountSelection={wallet.cancelAccountSelection}
        onConnectDemo={wallet.connectDemoWallet}
        onDismissError={wallet.dismissError}
      />
    );
  }

  return (
    <div className={styles.shell}>
      <BrandBar />
      {transferPending && <BlockingLoader message="증서를 양도 중입니다..." />}

      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>내 헌혈 증서</div>
          <div className={styles.subtitle}>
            <AddressDisplay address={address} />
          </div>
        </div>
      </div>

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

      {status === "loading" && <LoadingIndicator />}

      {status === "success" && certificates.length === 0 && (
        <div className={styles.empty}>이 지갑이 보유한 증서가 없습니다.</div>
      )}

      {certificates.map((certificate) => (
        <CertificateCard
          key={certificate.tokenId}
          certificate={certificate}
          transferOpen={transferTokenId === certificate.tokenId}
          transferPending={transferPending}
          onOpenTransfer={() => {
            setTransferTokenId(certificate.tokenId);
            setTransferResult(null);
          }}
          onCancelTransfer={() => setTransferTokenId(null)}
          onTransfer={(to) => void handleTransfer(certificate.tokenId, to)}
        />
      ))}

      <DemoModeBanner />
    </div>
  );
}
