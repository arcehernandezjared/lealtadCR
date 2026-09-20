import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanLine, Search, Footprints, ShoppingBag, Coins, Gift, Sparkles, X } from "lucide-react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { LoyaltyProgram } from "../programs/types";

interface CustomerProfile {
  customer: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };
  loyaltyAccounts: Array<{
    id: string;
    points: number;
    visits: number;
    program: { publicId: string; name: string };
    currentTier: { name: string; color: string } | null;
  }>;
  redemptions: Array<{ id: string; code: string; status: string; reward: { name: string; pointsCost: number } }>;
}

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

type ActionType = "visit" | "purchase" | "points" | "redeem";

/**
 * Interfaz de mostrador para empleados: pensada para que registrar una
 * visita/compra/canje tome pocos segundos. El campo de "escaneo" funciona
 * tanto con lectores de codigo de barras USB/Bluetooth (que escriben el
 * valor como si fuera un teclado y mandan Enter) como con entrada manual del
 * codigo. El escaneo por camara del navegador queda fuera de esta fase: no
 * hay forma de probarlo de punta a punta en este entorno (sin camara real),
 * y esta interfaz ya cubre el flujo "escanear o introducir el codigo" que
 * pide la seccion 13 del brief.
 */
export function PosPage() {
  const queryClient = useQueryClient();
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [scanValue, setScanValue] = useState("");
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [programId, setProgramId] = useState("");
  const [amount, setAmount] = useState(0);
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const programsQuery = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiFetch<{ programs: LoyaltyProgram[] }>("/api/programs"),
  });

  const profileQuery = useQuery({
    queryKey: ["pos-customer", customerId],
    queryFn: () => apiFetch<CustomerProfile>(`/api/customers/${customerId}`),
    enabled: Boolean(customerId),
  });

  const searchQuery = useQuery({
    queryKey: ["pos-search", search],
    queryFn: () => apiFetch<{ items: SearchResult[] }>(`/api/customers?search=${encodeURIComponent(search)}&pageSize=6`),
    enabled: search.length >= 2,
  });

  function selectCustomer(id: string) {
    setCustomerId(id);
    setSearch("");
    setScanValue("");
    setScanError(null);
    setFeedback(null);
    if (programsQuery.data?.programs[0]) setProgramId(programsQuery.data.programs[0].id);
  }

  async function handleScanSubmit(e: FormEvent) {
    e.preventDefault();
    if (!scanValue.trim()) return;
    setScanError(null);
    try {
      const profile = await apiFetch<CustomerProfile>(`/api/customers/by-qr/${encodeURIComponent(scanValue.trim())}`);
      selectCustomer(profile.customer.id);
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : "No se pudo leer el codigo");
    }
  }

  function handleScanKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Los lectores de codigo de barras tipean el valor y luego mandan Enter.
    if (e.key === "Enter") handleScanSubmit(e as unknown as FormEvent);
  }

  function reset() {
    setCustomerId(null);
    setActiveAction(null);
    setFeedback(null);
    scanInputRef.current?.focus();
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["pos-customer", customerId] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const registerVisit = useMutation({
    mutationFn: () => apiFetch(`/api/customers/${customerId}/visit`, { method: "POST", body: { programId } }),
    onSuccess: (data: any) => {
      invalidate();
      setActiveAction(null);
      setFeedback(summarize(data.loyalty));
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "No se pudo registrar la visita"),
  });

  const registerPurchase = useMutation({
    mutationFn: () => apiFetch(`/api/customers/${customerId}/purchase`, { method: "POST", body: { programId, amount } }),
    onSuccess: (data: any) => {
      invalidate();
      setActiveAction(null);
      setFeedback(summarize(data.loyalty));
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "No se pudo registrar la compra"),
  });

  const addPoints = useMutation({
    mutationFn: () => apiFetch(`/api/customers/${customerId}/points`, { method: "POST", body: { programId, points, reason } }),
    onSuccess: (data: any) => {
      invalidate();
      setActiveAction(null);
      setFeedback(summarize(data));
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "No se pudieron agregar los puntos"),
  });

  const redeem = useMutation({
    mutationFn: () => apiFetch("/api/rewards/redeem", { method: "POST", body: { code: redeemCode } }),
    onSuccess: (data: any) => {
      invalidate();
      setActiveAction(null);
      setRedeemCode("");
      setFeedback(`Recompensa "${data.reward.name}" canjeada con exito.`);
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Codigo invalido"),
  });

  function openAction(action: ActionType) {
    setActionError(null);
    setFeedback(null);
    setActiveAction(action);
  }

  function handleActionSubmit(e: FormEvent) {
    e.preventDefault();
    setActionError(null);
    if (activeAction === "visit") registerVisit.mutate();
    if (activeAction === "purchase") registerPurchase.mutate();
    if (activeAction === "points") addPoints.mutate();
    if (activeAction === "redeem") redeem.mutate();
  }

  const profile = profileQuery.data;
  const isPending = registerVisit.isPending || registerPurchase.isPending || addPoints.isPending || redeem.isPending;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Escanear cliente</h1>
        <p className="text-sm text-ink-500">Escanea el QR de la tarjeta o busca al cliente por nombre.</p>
      </div>

      {!customerId && (
        <>
          <Card>
            <form onSubmit={handleScanSubmit} className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  ref={scanInputRef}
                  label="Codigo QR"
                  autoFocus
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={handleScanKeyDown}
                  placeholder="Escanea o pega el codigo aqui"
                />
              </div>
              <Button type="submit" className="gap-1.5">
                <ScanLine className="h-4 w-4" /> Buscar
              </Button>
            </form>
            {scanError && <p className="mt-2 text-sm text-red-600">{scanError}</p>}
          </Card>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="O busca por nombre, correo o telefono"
              className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>

          {search.length >= 2 && (
            <Card className="p-0">
              <ul className="divide-y divide-ink-100">
                {searchQuery.data?.items.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => selectCustomer(c.id)}
                      className="flex w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-ink-50"
                    >
                      <span className="font-medium text-ink-900">
                        {c.firstName} {c.lastName}
                      </span>
                      <span className="text-ink-400">{c.email ?? c.phone ?? ""}</span>
                    </button>
                  </li>
                ))}
                {searchQuery.data?.items.length === 0 && (
                  <li className="px-5 py-4 text-center text-sm text-ink-400">Sin resultados.</li>
                )}
              </ul>
            </Card>
          )}
        </>
      )}

      {customerId && profile && (
        <>
          <Card className="relative">
            <button onClick={reset} className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-semibold text-ink-900">
              {profile.customer.firstName} {profile.customer.lastName}
            </h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {profile.loyaltyAccounts.map((a) => (
                <div key={a.id} className="rounded-xl bg-ink-50 px-4 py-2.5">
                  <p className="text-xs text-ink-500">{a.program.name}</p>
                  <p className="text-lg font-semibold text-ink-900">⭐ {a.points} pts</p>
                  {a.currentTier && (
                    <span
                      className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: a.currentTier.color }}
                    >
                      {a.currentTier.name}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Button size="lg" variant="outline" className="flex-col gap-1.5 py-4" onClick={() => openAction("visit")}>
                <Footprints className="h-5 w-5" />
                <span className="text-xs">Visita</span>
              </Button>
              <Button size="lg" variant="outline" className="flex-col gap-1.5 py-4" onClick={() => openAction("purchase")}>
                <ShoppingBag className="h-5 w-5" />
                <span className="text-xs">Compra</span>
              </Button>
              <Button size="lg" variant="outline" className="flex-col gap-1.5 py-4" onClick={() => openAction("points")}>
                <Coins className="h-5 w-5" />
                <span className="text-xs">Puntos</span>
              </Button>
              <Button size="lg" variant="outline" className="flex-col gap-1.5 py-4" onClick={() => openAction("redeem")}>
                <Gift className="h-5 w-5" />
                <span className="text-xs">Canjear</span>
              </Button>
            </div>
          </Card>

          {feedback && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <Sparkles className="h-4 w-4" /> {feedback}
            </div>
          )}

          {activeAction && (
            <Card>
              <form onSubmit={handleActionSubmit} className="flex flex-wrap items-end gap-3">
                {activeAction !== "redeem" && (
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
                )}
                {activeAction === "purchase" && (
                  <Input label="Monto" type="number" required autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                )}
                {activeAction === "points" && (
                  <>
                    <Input label="Puntos (+/-)" type="number" required autoFocus value={points} onChange={(e) => setPoints(Number(e.target.value))} />
                    <Input label="Motivo" required value={reason} onChange={(e) => setReason(e.target.value)} />
                  </>
                )}
                {activeAction === "redeem" && (
                  <Input
                    label="Codigo de canje"
                    required
                    autoFocus
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                    placeholder="LOYAL-XXXXXX"
                  />
                )}
                <Button type="submit" loading={isPending}>
                  Confirmar
                </Button>
                <Button type="button" variant="ghost" onClick={() => setActiveAction(null)}>
                  Cancelar
                </Button>
              </form>
              {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
            </Card>
          )}

          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Gift className="h-4 w-4" /> Recompensas pendientes de canje
            </h3>
            <ul className="divide-y divide-ink-100">
              {profile.redemptions
                .filter((r) => r.status === "PENDING")
                .map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-ink-900">{r.reward.name}</span>
                    <span className="font-mono text-xs text-ink-400">{r.code}</span>
                  </li>
                ))}
              {profile.redemptions.filter((r) => r.status === "PENDING").length === 0 && (
                <p className="py-3 text-center text-sm text-ink-400">Sin recompensas pendientes.</p>
              )}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function summarize(loyalty: any): string {
  if (!loyalty) return "Registrado. No aplico ninguna regla de puntos.";
  const parts = [`Nuevo balance: ${loyalty.account.points} pts`];
  if (loyalty.tierChanged) parts.push("nivel actualizado");
  if (loyalty.unlockedRedemptions?.length) parts.push(`🎉 ${loyalty.unlockedRedemptions.length} recompensa(s) desbloqueada(s)`);
  return parts.join(" · ");
}
