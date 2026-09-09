import { useWalletMachine } from "./useWallet";
import { WalletContext } from "./walletContext";

/** 지갑 연결 상태를 앱 전체에 한 번만 만들어 내려준다. 값은 useWallet()으로 받는다. */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWalletMachine();
  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
}
