import { create } from "zustand";

export interface SessionUser {
  publicId: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified?: boolean;
}

export interface SessionBusiness {
  publicId: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  status: string;
  currency: string;
  onboardingStep: number;
  plan: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: SessionUser | null;
  business: SessionBusiness | null;
  role: "OWNER" | "MANAGER" | "EMPLOYEE" | null;
  hydrated: boolean;
  setAccessToken: (token: string | null) => void;
  setSession: (data: { user: SessionUser; business?: SessionBusiness | null; role?: AuthState["role"] }) => void;
  setHydrated: (v: boolean) => void;
  clear: () => void;
}

/**
 * El access token vive SOLO en memoria (no localStorage) para reducir la
 * superficie de robo via XSS. Al recargar la pagina, el refresh token
 * httpOnly (cookie) se usa para pedir uno nuevo silenciosamente — ver
 * bootstrapSession() en App.tsx.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  business: null,
  role: null,
  hydrated: false,
  setAccessToken: (accessToken) => set({ accessToken }),
  setSession: (data) => set({ user: data.user, business: data.business ?? null, role: data.role ?? null }),
  setHydrated: (hydrated) => set({ hydrated }),
  clear: () => set({ accessToken: null, user: null, business: null, role: null }),
}));
