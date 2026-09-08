import { createContext, useContext } from "react";
import type { WalletControls } from "./useWallet";

/**
 * 지갑 연결 상태를 앱 전체에서 공유하기 위한 컨텍스트.
 *
 * 화면 컴포넌트가 각자 useWalletMachine()을 부르면 라우트를 옮길 때마다 컴포넌트가
 * 다시 마운트되면서 연결이 풀린다(증서 목록 → 상세 → 목록으로 돌아왔을 때 지갑 연결
 * 화면이 다시 뜨는 문제). 그래서 최상단의 WalletProvider가 한 번만 만들어 내려준다.
 */
export const WalletContext = createContext<WalletControls | null>(null);

export function useWallet(): WalletControls {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("useWallet must be used inside <WalletProvider>");
  return wallet;
}
