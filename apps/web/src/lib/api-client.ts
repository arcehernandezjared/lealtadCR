import { useAuthStore } from "./auth-store";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return data.accessToken as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRetry, headers, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const doFetch = (accessToken: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await doFetch(token);

  if (response.status === 401 && !skipAuthRetry && path !== "/api/auth/refresh") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      useAuthStore.getState().setAccessToken(newToken);
      response = await doFetch(newToken);
    } else {
      useAuthStore.getState().clear();
    }
  }

  if (!response.ok) {
    let payload: { error?: { code?: string; message?: string; details?: unknown } } = {};
    try {
      payload = await response.json();
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(
      response.status,
      payload.error?.code ?? "UNKNOWN_ERROR",
      payload.error?.message ?? "Ocurrio un error inesperado",
      payload.error?.details
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
