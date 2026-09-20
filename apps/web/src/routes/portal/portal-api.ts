const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export class PortalApiError extends Error {}

/**
 * Cliente de API separado del staff (apps/web/src/lib/api-client.ts): la
 * sesion del portal del cliente no usa refresh token en cookie ni el store
 * de auth de staff, es un JWT de corta duracion que se vuelve a pedir cada
 * vez que se abre el enlace (ver POST /api/portal/session). No hay logica
 * de refresh aqui a proposito — es deliberadamente mas simple que el auth de
 * staff porque el "login" del cliente es solo poseer el enlace/QR.
 */
export async function portalFetch<T = unknown>(path: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new PortalApiError(body?.error?.message ?? "Ocurrio un error inesperado");
  }
  return res.json();
}
