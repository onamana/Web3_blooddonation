/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface EthereumProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] | object }): Promise<T>;
  on(eventName: "accountsChanged", handler: (accounts: string[]) => void): void;
  on(eventName: "chainChanged", handler: (chainId: string) => void): void;
  on(eventName: "disconnect", handler: (error: { code: number; message: string }) => void): void;
  removeListener(eventName: string, handler: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
}

interface Window {
  ethereum?: EthereumProvider;
}
