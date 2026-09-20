import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "./api-client";
import { useAuthStore } from "./auth-store";

interface MeResponse {
  kind: "staff" | "super_admin";
  user?: {
    publicId: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
  };
  role?: "OWNER" | "MANAGER" | "EMPLOYEE";
  business?: {
    publicId: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    status: string;
    currency: string;
    onboardingStep: number;
    plan: string | null;
    counts: Record<string, number>;
  };
}

/**
 * Al montar la app, si no hay access token en memoria (recarga de pagina),
 * intenta obtener uno nuevo via el refresh token httpOnly. Si funciona,
 * queda "logueado" sin que el usuario tenga que volver a escribir su password.
 */
export function useSessionBootstrap() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    if (accessToken || hydrated) {
      if (!hydrated) setHydrated(true);
      return;
    }
    apiFetch<{ accessToken: string }>("/api/auth/refresh", { method: "POST", skipAuthRetry: true })
      .then((res) => setAccessToken(res.accessToken))
      .catch(() => {
        /* no habia sesion activa */
      })
      .finally(() => setHydrated(true));
  }, [accessToken, hydrated, setAccessToken, setHydrated]);

  return { hydrated };
}

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["me", accessToken],
    queryFn: () => apiFetch<MeResponse>("/api/business/me"),
    enabled: Boolean(accessToken),
    retry: false,
  });

  useEffect(() => {
    if (query.data?.kind === "staff" && query.data.user && query.data.business) {
      setSession({ user: query.data.user, business: query.data.business, role: query.data.role ?? null });
    }
  }, [query.data, setSession]);

  useEffect(() => {
    if (query.isError && query.error instanceof ApiError && query.error.status === 401) {
      clear();
      queryClient.clear();
    }
  }, [query.isError, query.error, clear, queryClient]);

  return query;
}
