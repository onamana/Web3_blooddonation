import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_WALLET_ADDRESS } from "../data/demoWallet";

export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

export interface WalletState {
  status: WalletStatus;
  /** 전체 지갑 주소. 화면에는 절대 그대로 노출하지 않고 축약해서만 표시한다. */
  address: string | null;
  error: string | null;
  hasMetaMask: boolean;
  /** true면 실제 MetaMask가 아니라 데모용 가상 지갑으로 연결된 상태 */
  isDemoWallet: boolean;
}

const initialState: WalletState = {
  status: "disconnected",
  address: null,
  error: null,
  hasMetaMask: false,
  isDemoWallet: false,
};

export interface WalletControls extends WalletState {
  connect: () => Promise<void>;
  connectDemoWallet: () => void;
  disconnect: () => void;
}

/**
 * 지갑 연결 상태 머신.
 *
 * 이 훅을 화면 컴포넌트에서 직접 부르면 화면을 옮길 때마다 상태가 초기화되므로
 * (증서 목록 → 상세 → 목록으로 돌아오면 연결이 풀림) 앱 최상단의 WalletProvider가
 * 한 번만 부르고, 화면들은 `hooks/walletContext.ts` 의 useWallet()으로 값을 받는다.
 */
export function useWalletMachine(): WalletControls {
  const [state, setState] = useState<WalletState>(initialState);
  const handlersRef = useRef<{
    onAccountsChanged?: (accounts: string[]) => void;
    onDisconnect?: () => void;
  }>({});

  useEffect(() => {
    setState((s) => ({ ...s, hasMetaMask: Boolean(window.ethereum) }));
  }, []);

  const teardownListeners = useCallback(() => {
    const eth = window.ethereum;
    if (!eth) return;
    if (handlersRef.current.onAccountsChanged) {
      eth.removeListener("accountsChanged", handlersRef.current.onAccountsChanged as (...a: unknown[]) => void);
    }
    if (handlersRef.current.onDisconnect) {
      eth.removeListener("disconnect", handlersRef.current.onDisconnect as (...a: unknown[]) => void);
    }
  }, []);

  useEffect(() => () => teardownListeners(), [teardownListeners]);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      setState((s) => ({
        ...s,
        status: "error",
        error: "MetaMask가 설치되어 있지 않습니다. 브라우저 확장 프로그램을 설치한 뒤 다시 시도해주세요.",
      }));
      return;
    }

    setState((s) => ({ ...s, status: "connecting", error: null }));

    try {
      const accounts = await eth.request<string[]>({ method: "eth_requestAccounts" });
      const address = accounts[0];
      if (!address) {
        setState((s) => ({ ...s, status: "error", error: "연결할 계정을 찾을 수 없습니다." }));
        return;
      }

      const onAccountsChanged = (nextAccounts: string[]) => {
        const next = nextAccounts[0];
        if (!next) {
          setState({ ...initialState, hasMetaMask: true });
          return;
        }
        setState((s) => ({ ...s, address: next }));
      };
      const onDisconnect = () => {
        setState({ ...initialState, hasMetaMask: true });
      };
      eth.on("accountsChanged", onAccountsChanged);
      eth.on("disconnect", onDisconnect);
      handlersRef.current = { onAccountsChanged, onDisconnect };

      setState({
        status: "connected",
        address,
        error: null,
        hasMetaMask: true,
        isDemoWallet: false,
      });
    } catch (err) {
      const message =
        err instanceof Error && "code" in err && (err as { code?: number }).code === 4001
          ? "지갑 연결 요청을 취소했습니다."
          : "지갑 연결에 실패했습니다. 잠시 후 다시 시도해주세요.";
      setState((s) => ({ ...s, status: "error", error: message }));
    }
  }, []);

  /** 데모 모드 전용: MetaMask 없이도 화면을 체험할 수 있도록 가상 지갑으로 연결한다. */
  const connectDemoWallet = useCallback(() => {
    setState({
      status: "connected",
      address: DEMO_WALLET_ADDRESS,
      error: null,
      hasMetaMask: state.hasMetaMask,
      isDemoWallet: true,
    });
  }, [state.hasMetaMask]);

  const disconnect = useCallback(() => {
    teardownListeners();
    setState((s) => ({ ...initialState, hasMetaMask: s.hasMetaMask }));
  }, [teardownListeners]);

  return { ...state, connect, connectDemoWallet, disconnect };
}
