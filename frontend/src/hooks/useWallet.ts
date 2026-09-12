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

const SELECTED_ACCOUNT_KEY = "bloodpass.selectedAccount";

function findAccount(accounts: string[], address: string | null): string | undefined {
  if (!address) return undefined;
  return accounts.find((account) => account.toLowerCase() === address.toLowerCase());
}

function readSelectedAccount(): string | null {
  try {
    return window.sessionStorage.getItem(SELECTED_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function rememberSelectedAccount(address: string | null) {
  try {
    if (address) {
      window.sessionStorage.setItem(SELECTED_ACCOUNT_KEY, address);
    } else {
      window.sessionStorage.removeItem(SELECTED_ACCOUNT_KEY);
    }
  } catch {
    // 저장소가 차단되어도 현재 탭의 지갑 연결은 정상 동작해야 한다.
  }
}

export interface WalletControls extends WalletState {
  connect: () => Promise<void>;
  selectAccount: (address: string) => void;
  cancelAccountSelection: () => void;
  connectDemoWallet: () => void;
  /** 앱 상태와 MetaMask의 이 사이트 계정 권한을 함께 해제한다. */
  /** 데모 모드 종료를 위해 페이지 이동을 직접 시작했으면 true를 반환한다. */
  disconnect: () => Promise<boolean>;
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
          if (!nextAccounts.length) {
            rememberSelectedAccount(null);
            return { ...initialState, hasMetaMask: true };
          }
          const currentAccount = findAccount(nextAccounts, current.address);
          if (currentAccount) {
            return { ...current, address: currentAccount, availableAccounts: nextAccounts };
          }
          if (nextAccounts.length === 1) {
            const [account] = nextAccounts;
            if (!account) return { ...initialState, hasMetaMask: true };
            rememberSelectedAccount(account);
            return { ...current, address: account, availableAccounts: nextAccounts, isDemoWallet: false };
          }
          rememberSelectedAccount(null);
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
      rememberSelectedAccount(null);
      setState({ ...initialState, hasMetaMask: true });
    };

    eth.on("accountsChanged", onAccountsChanged);
    eth.on("disconnect", onDisconnect);
    setState((current) => ({ ...current, hasMetaMask: true }));
    void eth.request<string[]>({ method: "eth_accounts" })
      .then((accounts) => {
        knownAccountsRef.current = accounts;
        if (!accounts.length) return;
        setState((current) => {
          if (current.status !== "disconnected") return current;
          const rememberedAccount = findAccount(accounts, readSelectedAccount());
          if (rememberedAccount) {
            return {
              status: "connected",
              address: rememberedAccount,
              error: null,
              hasMetaMask: true,
              availableAccounts: accounts,
              isDemoWallet: false,
            };
          }
          if (accounts.length > 1) {
            return {
              status: "selecting",
              address: null,
              error: null,
              hasMetaMask: true,
              availableAccounts: accounts,
              isDemoWallet: false,
            };
          }
          const [account] = accounts;
          if (!account) return current;
          rememberSelectedAccount(account);
          return {
            status: "connected",
            address: account,
            error: null,
            hasMetaMask: true,
            availableAccounts: accounts,
            isDemoWallet: false,
          };
        });
      })
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
        rememberSelectedAccount(account);
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
    rememberSelectedAccount(selected);
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
    rememberSelectedAccount(null);
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
    rememberSelectedAccount(null);
    const leavingRuntimeDemo = state.isDemoWallet && LIVE_CONTRACT_MODE;
    if (leavingRuntimeDemo) stopRuntimeDemoMode();

    const eth = window.ethereum;
    knownAccountsRef.current = [];
    setState((current) => ({ ...initialState, hasMetaMask: current.hasMetaMask }));
    if (eth) {
      try {
        await eth.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
      } catch {
        // 일부 provider는 권한 해제를 지원하지 않는다. 이 경우에도 앱의 연결은 해제한다.
      }
    }

    // 런타임 데모 플래그는 모듈 초기화 때 읽히므로, 실제 모드로 돌아가려면 새로 로드해야 한다.
    // 현재 경로에서 reload하면 화면이 잠깐 되돌아가는 것처럼 보일 수 있어 목적지를 한 번에 연다.
    if (leavingRuntimeDemo) {
      window.location.assign("/certificates");
      return true;
    }
    return false;
  }, [state.isDemoWallet]);

  return { ...state, connect, selectAccount, cancelAccountSelection, connectDemoWallet, disconnect, dismissError };
}
