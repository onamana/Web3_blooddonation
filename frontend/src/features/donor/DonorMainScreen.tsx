import { useState } from "react";
import { DEMO_MODE } from "../../api/env";
import { DemoModeBanner } from "../../components/DemoModeBanner";
import { DropIcon } from "../../components/icons";
import { Toast } from "../../components/Toast";
import { DONATIONS, DONOR_SUMMARY } from "../../data/donorMock";
import type { WalletState } from "../../hooks/useWallet";
import { shortenAddress } from "../../utils/donorId";
import type { JourneyNodeKey } from "../../types/donor";
import { BloodJourney } from "./BloodJourney";
import styles from "./Donor.module.css";
import { HistoryList } from "./HistoryList";
import { JourneyDetailSheet } from "./JourneyDetailSheet";
import { stepByKey } from "./journey";
import { RealDonationLookup } from "./RealDonationLookup";
import { RegionNotice } from "./RegionNotice";
import { SummaryGrid } from "./SummaryGrid";

interface DonorMainScreenProps {
  wallet: WalletState;
  onDisconnect: () => void;
}

export function DonorMainScreen({ wallet, onDisconnect }: DonorMainScreenProps) {
  const [selectedId, setSelectedId] = useState(DONATIONS[0]!.id);
  const [tampered, setTampered] = useState(false);
  const [patientTipOpen, setPatientTipOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState<JourneyNodeKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const donation = DONATIONS.find((d) => d.id === selectedId) ?? DONATIONS[0]!;
  const sheetHit = sheetKey ? stepByKey(donation, sheetKey, tampered) : null;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1400);
  };

  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
    } catch {
      // 클립보드 API를 사용할 수 없는 환경에서도 토스트만 보여주고 넘어간다.
    }
    showToast("해시가 복사되었습니다");
  };

  return (
    <div className={styles.phoneShell}>
      <div className={styles.appbar}>
        <div className={styles.appbarBrand}>
          <span style={{ color: "var(--pri)", display: "flex" }}>
            <DropIcon />
          </span>
          <span>BloodTrace</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className={`${styles.addr} ${styles.addrOn} mono`}>
            {wallet.address ? shortenAddress(wallet.address) : "지갑 미연결"}
          </span>
          {wallet.donorId && <span className={`${styles.did} mono`}>{wallet.donorId}</span>}
          <button
            type="button"
            className={styles.tbtn}
            onClick={onDisconnect}
            aria-label="지갑 연결 해제"
            title="지갑 연결 해제"
          >
            해제
          </button>
        </div>
      </div>

      {DEMO_MODE ? (
        <>
          <SummaryGrid
            summary={DONOR_SUMMARY}
            patientTipOpen={patientTipOpen}
            onTogglePatientTip={() => setPatientTipOpen((v) => !v)}
          />

          <HistoryList
            donations={DONATIONS}
            selectedId={selectedId}
            tampered={tampered}
            onSelect={(id) => {
              setSelectedId(id);
              setSheetKey(null);
            }}
          />

          <BloodJourney
            donation={donation}
            tampered={tampered}
            onToggleTamper={() => {
              setTampered((v) => !v);
              setSheetKey(null);
            }}
            onOpenNode={setSheetKey}
            onCopyHash={handleCopyHash}
          />

          <RegionNotice region={DONOR_SUMMARY.region} />

          <JourneyDetailSheet
            open={Boolean(sheetKey)}
            step={sheetHit?.step ?? null}
            ok={sheetHit?.ok ?? true}
            onClose={() => setSheetKey(null)}
            onCopyHash={handleCopyHash}
          />
        </>
      ) : (
        <RealDonationLookup />
      )}

      <DemoModeBanner className={styles.demoBanner} />

      <Toast message={toast} />
    </div>
  );
}
