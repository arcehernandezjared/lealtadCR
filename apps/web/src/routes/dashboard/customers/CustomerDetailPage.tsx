import { useState, useEffect, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Footprints, ShoppingBag, Coins, Gift, Sparkles } from "lucide-react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { LoyaltyProgram } from "../programs/types";

interface CustomerProfile {
  customer: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; totalSpent: string };
  loyaltyAccounts: Array<{
    id: string;
    points: number;
    visits: number;
    program: { publicId: string; name: string };
    currentTier: { name: string; color: string } | null;
  }>;
  visits: Array<{ id: string; createdAt: string }>;
  purchases: Array<{ id: string; amount: string; createdAt: string }>;
  redemptions: Array<{ id: string; code: string; status: string; unlockedAt: string; reward: { name: string; pointsCost: number } }>;
  transactions: Array<{ id: string; points: number; reason: string; type: string; createdAt: string }>;
}

type ActionType = "visit" | "purchase" | "points";

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [programId, setProgramId] = useState<string>("");
  const [amount, setAmount] = useState(0);
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => apiFetch<CustomerProfile>(`/api/customers/${customerId}`),
    enabled: Boolean(customerId),
  });

  const programsQuery = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiFetch<{ programs: LoyaltyProgram[] }>("/api/programs"),
  });

  useEffect(() => {
    if (!programId && programsQuery.data?.programs.length) {
      setProgramId(programsQuery.data.programs[0]!.id);
    }
  }, [programId, programsQuery.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const registerVisit = useMutation({
    mutationFn: () => apiFetch(`/api/customers/${customerId}/visit`, { method: "POST", body: { programId } }),
    onSuccess: (data: any) => {
      invalidate();
      setActiveAction(null);
      setSuccess(summarizeLoyaltyResult(data.loyalty));
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo registrar la visita"),
  });

  const registerPurchase = useMutation({
    mutationFn: () => apiFetch(`/api/customers/${customerId}/purchase`, { method: "POST", body: { programId, amount } }),
    onSuccess: (data: any) => {
      invalidate();
      setActiveAction(null);
      setSuccess(summarizeLoyaltyResult(data.loyalty));
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo registrar la compra"),
  });

  const addPoints = useMutation({
    mutationFn: () => apiFetch(`/api/customers/${customerId}/points`, { method: "POST", body: { programId, points, reason } }),
    onSuccess: (data: any) => {
      invalidate();
      setActiveAction(null);
      setSuccess(summarizeLoyaltyResult(data));
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudieron agregar los puntos"),
  });

  function openAction(action: ActionType) {
    setError(null);
    setSuccess(null);
    setActiveAction(action);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (activeAction === "visit") registerVisit.mutate();
    if (activeAction === "purchase") registerPurchase.mutate();
    if (activeAction === "points") addPoints.mutate();
  }

  const profile = profileQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/dashboard/customers" className="flex w-fit items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Link>

      {profile && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
                {profile.customer.firstName} {profile.customer.lastName}
              </h1>
              <p className="text-sm text-ink-500">{profile.customer.email ?? profile.customer.phone ?? "Sin contacto registrado"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openAction("visit")}>
                <Footprints className="h-4 w-4" /> Registrar visita
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openAction("purchase")}>
                <ShoppingBag className="h-4 w-4" /> Registrar compra
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openAction("points")}>
                <Coins className="h-4 w-4" /> Agregar puntos
              </Button>
            </div>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <Sparkles className="h-4 w-4" /> {success}
            </div>
          )}

          {activeAction && (
            <Card>
              <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-ink-700">Programa</label>
                  <select
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className="h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  >
                    {programsQuery.data?.programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {activeAction === "purchase" && (
                  <Input label="Monto" type="number" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                )}
                {activeAction === "points" && (
                  <>
                    <Input label="Puntos (+/-)" type="number" required value={points} onChange={(e) => setPoints(Number(e.target.value))} />
                    <Input label="Motivo" required value={reason} onChange={(e) => setReason(e.target.value)} />
                  </>
                )}
                <Button
                  type="submit"
                  loading={registerVisit.isPending || registerPurchase.isPending || addPoints.isPending}
                  disabled={!programId}
                >
                  Confirmar
                </Button>
                <Button type="button" variant="ghost" onClick={() => setActiveAction(null)}>
                  Cancelar
                </Button>
              </form>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.loyaltyAccounts.map((account) => (
              <Card key={account.id}>
                <p className="text-sm text-ink-500">{account.program.name}</p>
                <p className="mt-1 text-3xl font-semibold text-ink-900">{account.points} pts</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-ink-400">
                  <span>{account.visits} visitas</span>
                  {account.currentTier && (
                    <span
                      className="rounded-full px-2 py-0.5 font-medium text-white"
                      style={{ backgroundColor: account.currentTier.color }}
                    >
                      {account.currentTier.name}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink-900">
              <Gift className="h-4 w-4" /> Recompensas
            </h3>
            <ul className="divide-y divide-ink-100">
              {profile.redemptions.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-ink-900">{r.reward.name}</p>
                    <p className="font-mono text-xs text-ink-400">{r.code}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      r.status === "REDEEMED"
                        ? "bg-green-100 text-green-700"
                        : r.status === "PENDING"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {r.status}
                  </span>
                </li>
              ))}
              {profile.redemptions.length === 0 && <p className="py-4 text-center text-sm text-ink-400">Sin recompensas todavia.</p>}
            </ul>
          </Card>

          <Card>
            <h3 className="mb-3 font-semibold text-ink-900">Historial de puntos</h3>
            <ul className="divide-y divide-ink-100">
              {profile.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                  <p className="text-ink-700">{t.reason}</p>
                  <span className={t.points >= 0 ? "font-medium text-green-600" : "font-medium text-red-600"}>
                    {t.points >= 0 ? "+" : ""}
                    {t.points}
                  </span>
                </li>
              ))}
              {profile.transactions.length === 0 && <p className="py-4 text-center text-sm text-ink-400">Sin movimientos todavia.</p>}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function summarizeLoyaltyResult(loyalty: any): string {
  if (!loyalty) return "Registrado. No aplico ninguna regla de puntos.";
  const parts = [`Nuevo balance: ${loyalty.account.points} pts`];
  if (loyalty.tierChanged) parts.push("nivel actualizado");
  if (loyalty.unlockedRedemptions?.length) parts.push(`${loyalty.unlockedRedemptions.length} recompensa(s) desbloqueada(s)`);
  return parts.join(" · ");
}
