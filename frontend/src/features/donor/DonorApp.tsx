import { useWallet } from "../../hooks/useWallet";
import { DonorMainScreen } from "./DonorMainScreen";
import { WalletGate } from "./WalletGate";

export function DonorApp() {
  const wallet = useWallet();

  if (wallet.status === "connected") {
    return <DonorMainScreen wallet={wallet} onDisconnect={wallet.disconnect} />;
  }

  return <WalletGate wallet={wallet} onConnect={wallet.connect} onConnectDemo={wallet.connectDemoWallet} />;
}
