import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_MODE, LIVE_CONTRACT_MODE, RUNTIME_DEMO_MODE, startRuntimeDemoMode, stopRuntimeDemoMode } from "../api/env";
import { DEMO_WALLET_ADDRESS } from "../data/demoWallet";

export type WalletStatus = "disconnected" | "connecting" | "selecting" | "connected" | "error";

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  error: string | null;
  hasMetaMask: boolean;
  /** MetaMask가 이 사이트에 공개한 계정들. 두 개 이상이면 사용자가 직접 고른다. */
  availableAccounts: string[];
  isDemoWallet: boolean;
}

const initialState: WalletState = {
  status: "disconnected",
  address: null,
  error: null,
  hasMetaMask: false,
  availableAccounts: [],
  isDemoWallet: false,
};

export interface WalletControls extends WalletState {
  connect: () => Promise<void>;
  selectAccount: (address: string) => void;
  cancelAccountSelection: () => void;
  connectDemoWallet: () => void;
  /** 앱 상태와 MetaMask의 이 사이트 계정 권한을 함께 해제한다. */
  disconnect: () => Promise<void>;
  dismissError: () => void;
}

/** MetaMask 지갑 연결 상태 머신. */
export function useWalletMachine(): WalletControls {
  const [state, setState] = useState<WalletState>(initialState);
  const knownAccountsRef = useRef<string[]>([]);

  // 실제 서비스에서 "데모 체험하기"를 누른 경우, 새로고침 후에도 데모 지갑으로 바로 들어간다.
  useEffect(() => {
    if (!RUNTIME_DEMO_MODE) return;
    setState((current) => ({
      status: "connected",
      address: DEMO_WALLET_ADDRESS,
      error: null,
      hasMetaMask: current.hasMetaMask,
      availableAccounts: [],
      isDemoWallet: true,
    }));
  }, []);

  /** 연결 전부터 계정 변경을 구독한다. */
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

    const onAccountsChanged = (nextAccounts: string[]) => {
      knownAccountsRef.current = nextAccounts;
      setState((current) => {
        if (current.status === "connected") {
          if (!nextAccounts.length) return { ...initialState, hasMetaMask: true };
          if (nextAccounts.length === 1) {
            const [account] = nextAccounts;
            if (!account) return { ...initialState, hasMetaMask: true };
            return { ...current, address: account, availableAccounts: nextAccounts, isDemoWallet: false };
          }
          return {
            ...current,
            status: "selecting",
            address: null,
            availableAccounts: nextAccounts,
            isDemoWallet: false,
          };
        }
        if (current.status === "selecting") {
          return nextAccounts.length
            ? { ...current, availableAccounts: nextAccounts }
            : { ...initialState, hasMetaMask: true };
        }
        return current;
      });
    };

    const onDisconnect = () => {
      knownAccountsRef.current = [];
      setState({ ...initialState, hasMetaMask: true });
    };

    eth.on("accountsChanged", onAccountsChanged);
    eth.on("disconnect", onDisconnect);
    setState((current) => ({ ...current, hasMetaMask: true }));
    void eth.request<string[]>({ method: "eth_accounts" })
      .then((accounts) => { knownAccountsRef.current = accounts; })
      .catch(() => {});

    return () => {
      eth.removeListener("accountsChanged", onAccountsChanged as (...args: unknown[]) => void);
      eth.removeListener("disconnect", onDisconnect as (...args: unknown[]) => void);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      setState((current) => ({
        ...current,
        status: "error",
        error: "MetaMask가 설치되어 있지 않습니다. 브라우저 확장 프로그램을 설치한 뒤 다시 시도해주세요.",
      }));
      return;
    }

    setState((current) => ({ ...current, status: "connecting", error: null }));
    try {
      const accounts = await eth.request<string[]>({ method: "eth_requestAccounts" });
      knownAccountsRef.current = accounts;
      if (!accounts.length) {
        setState((current) => ({ ...current, status: "error", error: "연결된 계정을 찾을 수 없습니다." }));
      } else if (accounts.length > 1) {
        setState({ status: "selecting", address: null, error: null, hasMetaMask: true, availableAccounts: accounts, isDemoWallet: false });
      } else {
        const [account] = accounts;
        if (!account) {
          setState((current) => ({ ...current, status: "error", error: "연결된 계정을 찾을 수 없습니다." }));
          return;
        }
        setState({ status: "connected", address: account, error: null, hasMetaMask: true, availableAccounts: accounts, isDemoWallet: false });
      }
    } catch (err) {
      const message =
        err instanceof Error && "code" in err && (err as { code?: number }).code === 4001
          ? "지갑 연결 요청을 취소했습니다."
          : "지갑 연결에 실패했습니다. 잠시 뒤 다시 시도해주세요.";
      setState((current) => ({ ...current, status: "error", error: message }));
    }
  }, []);

  const selectAccount = useCallback((address: string) => {
    const selected = knownAccountsRef.current.find((account) => account.toLowerCase() === address.toLowerCase());
    if (!selected) {
      setState((current) => ({ ...current, status: "error", error: "선택한 지갑 권한을 다시 확인해주세요." }));
      return;
    }
    setState({
      status: "connected",
      address: selected,
      error: null,
      hasMetaMask: true,
      availableAccounts: knownAccountsRef.current,
      isDemoWallet: false,
    });
  }, []);

  const cancelAccountSelection = useCallback(() => {
    setState((current) => ({ ...initialState, hasMetaMask: current.hasMetaMask }));
  }, []);

  const connectDemoWallet = useCallback(() => {
    if (!DEMO_MODE) {
      startRuntimeDemoMode();
      window.location.reload();
      return;
    }
    setState((current) => ({
      status: "connected",
      address: DEMO_WALLET_ADDRESS,
      error: null,
      hasMetaMask: current.hasMetaMask,
      availableAccounts: [],
      isDemoWallet: true,
    }));
  }, []);

  const dismissError = useCallback(() => {
    setState((current) => (current.status === "error"
      ? { ...initialState, hasMetaMask: current.hasMetaMask }
      : current));
  }, []);

  const disconnect = useCallback(async () => {
    // 실제 컨트랙트 화면에서 데모 지갑을 해제하면 런타임 데모 세션도 종료해 실제 모드로 돌아간다.
    if (state.isDemoWallet && LIVE_CONTRACT_MODE) {
      stopRuntimeDemoMode();
      window.location.reload();
      return;
    }
    const eth = window.ethereum;
    knownAccountsRef.current = [];
    setState((current) => ({ ...initialState, hasMetaMask: current.hasMetaMask }));
    if (!eth) return;
    try {
      await eth.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
    } catch {
      // 일부 provider는 권한 해제를 지원하지 않는다. 이 경우에도 앱의 연결은 해제한다.
    }
  }, [state.isDemoWallet]);

  return { ...state, connect, selectAccount, cancelAccountSelection, connectDemoWallet, disconnect, dismissError };
}
