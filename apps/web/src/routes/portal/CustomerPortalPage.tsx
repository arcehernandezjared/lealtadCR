import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Gift, Clock } from "lucide-react";
import { portalFetch, PortalApiError } from "./portal-api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface PortalAccount {
  id: string | null;
  points: number;
  visits: number;
  stamps: number;
  program: { id: string; name: string; primaryColor: string; secondaryColor: string; logoUrl: string | null };
  currentTier: { name: string; color: string; minPoints: number } | null;
  nextTier: { name: string; color: string; minPoints: number } | null;
  nextReward: { name: string; pointsCost: number } | null;
}

interface PortalProfile {
  customer: { firstName: string; lastName: string };
  business: { name: string; logoUrl: string | null };
  accounts: PortalAccount[];
}

interface PortalReward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  status: "LOCKED" | "READY" | "PENDING" | "REDEEMED" | "EXPIRED" | "CANCELLED";
  code: string | null;
}

interface PortalHistory {
  transactions: Array<{ id: string; points: number; reason: string; createdAt: string }>;
  visits: Array<{ id: string; createdAt: string }>;
  purchases: Array<{ id: string; amount: string; createdAt: string }>;
}

export function CustomerPortalPage() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState<"apple" | "google" | null>(null);

  useEffect(() => {
    if (!qrCode) return;
    portalFetch<{ accessToken: string; businessName: string }>("/api/portal/session", null, {
      method: "POST",
      body: JSON.stringify({ qrCode }),
    })
      .then((data) => {
        setToken(data.accessToken);
        setBusinessName(data.businessName);
      })
      .catch((err) => setSessionError(err instanceof PortalApiError ? err.message : "No se pudo abrir tu tarjeta"));
  }, [qrCode]);

  const profileQuery = useQuery({
    queryKey: ["portal-me", token],
    queryFn: () => portalFetch<PortalProfile>("/api/portal/me", token),
    enabled: Boolean(token),
  });

  const rewardsQuery = useQuery({
    queryKey: ["portal-rewards", token],
    queryFn: () => portalFetch<{ rewards: PortalReward[] }>("/api/portal/rewards", token),
    enabled: Boolean(token),
  });

  const historyQuery = useQuery({
    queryKey: ["portal-history", token],
    queryFn: () => portalFetch<PortalHistory>("/api/portal/history", token),
    enabled: Boolean(token),
  });

  async function handleAddAppleWallet(programId: string) {
    if (!token) return;
    setWalletLoading("apple");
    setWalletMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/portal/wallet/apple/${programId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "No se pudo generar la tarjeta de Apple Wallet");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "loyaltycr.pkpass";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setWalletMessage(err instanceof Error ? err.message : "No se pudo agregar la tarjeta a Apple Wallet");
    } finally {
      setWalletLoading(null);
    }
  }

  async function handleAddGoogleWallet(programId: string) {
    if (!token) return;
    setWalletLoading("google");
    setWalletMessage(null);
    try {
      const data = await portalFetch<{ saveUrl: string }>(`/api/portal/wallet/google/${programId}`, token);
      window.location.href = data.saveUrl;
    } catch (err) {
      setWalletMessage(err instanceof PortalApiError ? err.message : "No se pudo agregar la tarjeta a Google Wallet");
    } finally {
      setWalletLoading(null);
    }
  }

  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-ink-900">No pudimos abrir tu tarjeta</p>
          <p className="mt-2 text-sm text-ink-500">{sessionError}</p>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  const account = profile?.accounts[0];

  return (
    <div className="min-h-screen bg-ink-50 pb-16">
      <div className="mx-auto max-w-md px-4 pt-8">
        {!profile && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-300 border-t-ink-900" />
          </div>
        )}

        {profile && account && (
          <>
            <div
              className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${account.program.primaryColor}, ${account.program.secondaryColor})`,
              }}
            >
              <p className="text-sm font-medium opacity-80">{businessName || profile.business.name}</p>
              <p className="mt-0.5 text-xs opacity-70">{account.program.name}</p>
              <p className="mt-6 text-5xl font-bold tracking-tight">{account.points}</p>
              <p className="text-sm opacity-80">puntos</p>

              <div className="mt-5 flex items-center justify-between text-xs">
                <span className="rounded-full bg-white/20 px-3 py-1 font-medium backdrop-blur">
                  {profile.customer.firstName} {profile.customer.lastName}
                </span>
                {account.currentTier && (
                  <span className="rounded-full bg-white/20 px-3 py-1 font-medium backdrop-blur">Nivel {account.currentTier.name}</span>
                )}
              </div>
            </div>

            {(account.nextTier || account.nextReward) && (
              <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-4">
                {account.nextTier && (
                  <ProgressToTarget
                    label={`${pointsRemainingPhrase(account.nextTier.minPoints - account.points)} para el nivel ${account.nextTier.name}`}
                    current={account.points}
                    target={account.nextTier.minPoints}
                    color={account.nextTier.color}
                  />
                )}
                {account.nextReward && (
                  <div className={account.nextTier ? "mt-4" : ""}>
                    <ProgressToTarget
                      label={`${pointsRemainingPhrase(account.nextReward.pointsCost - account.points)} para "${account.nextReward.name}"`}
                      current={account.points}
                      target={account.nextReward.pointsCost}
                      color={account.program.primaryColor}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAddAppleWallet(account.program.id)}
                disabled={walletLoading !== null}
                className="flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white py-3 text-sm font-medium text-ink-700 disabled:opacity-60"
              >
                <Wallet className="h-4 w-4" /> {walletLoading === "apple" ? "Generando..." : "Apple Wallet"}
              </button>
              <button
                onClick={() => handleAddGoogleWallet(account.program.id)}
                disabled={walletLoading !== null}
                className="flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white py-3 text-sm font-medium text-ink-700 disabled:opacity-60"
              >
                <Wallet className="h-4 w-4" /> {walletLoading === "google" ? "Generando..." : "Google Wallet"}
              </button>
            </div>
            {walletMessage && (
              <p className="mt-2 text-center text-xs text-ink-500">{walletMessage}</p>
            )}

            <section className="mt-8">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Gift className="h-4 w-4" /> Recompensas
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {rewardsQuery.data?.rewards.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{r.name}</p>
                      <p className="text-xs text-ink-400">{r.pointsCost} puntos</p>
                      {r.code && <p className="mt-1 font-mono text-xs text-brand-600">{r.code}</p>}
                    </div>
                    <RewardBadge status={r.status} />
                  </div>
                ))}
                {rewardsQuery.data?.rewards.length === 0 && (
                  <p className="py-4 text-center text-sm text-ink-400">Este programa todavia no tiene recompensas.</p>
                )}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Clock className="h-4 w-4" /> Actividad reciente
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {historyQuery.data?.transactions.slice(0, 10).map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm">
                    <span className="text-ink-700">{t.reason}</span>
                    <span className={t.points >= 0 ? "font-medium text-green-600" : "font-medium text-red-600"}>
                      {t.points >= 0 ? "+" : ""}
                      {t.points}
                    </span>
                  </div>
                ))}
                {historyQuery.data?.transactions.length === 0 && (
                  <p className="py-4 text-center text-sm text-ink-400">Sin actividad todavia.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function pointsRemainingPhrase(rawRemaining: number): string {
  const remaining = Math.max(rawRemaining, 0);
  if (remaining === 0) return "Ya puedes reclamarlo";
  return remaining === 1 ? "Falta 1 punto" : `Faltan ${remaining} puntos`;
}

function ProgressToTarget({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function RewardBadge({ status }: { status: PortalReward["status"] }) {
  const styles: Record<PortalReward["status"], string> = {
    LOCKED: "bg-ink-100 text-ink-500",
    READY: "bg-amber-100 text-amber-700",
    PENDING: "bg-amber-100 text-amber-700",
    REDEEMED: "bg-green-100 text-green-700",
    EXPIRED: "bg-ink-100 text-ink-400",
    CANCELLED: "bg-ink-100 text-ink-400",
  };
  const labels: Record<PortalReward["status"], string> = {
    LOCKED: "Bloqueada",
    READY: "Lista",
    PENDING: "Pendiente",
    REDEEMED: "Canjeada",
    EXPIRED: "Expirada",
    CANCELLED: "Cancelada",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}
