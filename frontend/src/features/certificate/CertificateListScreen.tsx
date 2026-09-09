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
import { formatTokenId } from "./certificateLabels";
import { OnchainProofBox } from "./OnchainProof";
import { Button } from "./Button";
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

  /** 연결을 끊고 초기(지갑 연결) 화면으로 되돌아간다. 화면에 남은 이전 결과도 같이 비운다. */
  const handleDisconnect = () => {
    setCertificates([]);
    setTransferTokenId(null);
    setTransferResult(null);
    setError(null);
    setStatus("idle");
    wallet.disconnect();
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
      <BrandBar>
        <Button size="sm" to="/issue">
          혈액원 발급
        </Button>
        <Button size="sm" to="/verify">
          병원 검증
        </Button>
        {/* 같은 주소(/certificates)에서 지갑 연결 화면으로 되돌아가는 버튼 */}
        <Button size="sm" onClick={handleDisconnect}>
          연결 해제
        </Button>
      </BrandBar>

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

      {status === "loading" && <div className={styles.empty}>불러오는 중...</div>}

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
