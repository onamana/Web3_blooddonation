import { API_BASE_URL } from "./env";

export class ApiError extends Error {
  status: number;
  /** 501: 아직 외부 모듈(스마트컨트랙트/DID)이 연결되지 않은 상태 */
  notImplemented: boolean;
  detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.notImplemented = status === 501;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    throw new ApiError(0, "백엔드 서버에 연결할 수 없습니다.", err instanceof Error ? err.message : String(err));
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorBody = payload as { error?: string; detail?: string } | null;
    const message =
      response.status === 501
        ? "아직 외부 모듈이 연결되지 않았습니다."
        : errorBody?.error ?? `요청이 실패했습니다 (HTTP ${response.status})`;
    throw new ApiError(response.status, message, errorBody?.detail);
  }

  return payload as T;
}
