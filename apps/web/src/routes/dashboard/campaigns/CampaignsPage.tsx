import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Trash2, Megaphone } from "lucide-react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { LoyaltyProgram } from "../programs/types";

const CHANNELS = [
  { value: "EMAIL", label: "Correo" },
  { value: "WEB_PUSH", label: "Web Push" },
  { value: "WALLET_UPDATE", label: "Actualizar Wallet" },
  { value: "WHATSAPP", label: "WhatsApp (no disponible aun)" },
] as const;

const SEGMENT_LABELS: Record<string, string> = {
  all: "Todos los clientes",
  inactive: "Clientes inactivos",
  tier: "Clientes de un nivel",
  min_points: "Clientes con puntos minimos",
};

interface Campaign {
  id: string;
  title: string;
  message: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "CANCELLED";
  segment: { type: string; [key: string]: unknown };
  channels: string[];
  sentAt: string | null;
}

export function CampaignsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [segmentType, setSegmentType] = useState<"all" | "inactive" | "tier" | "min_points">("all");
  const [inactiveDays, setInactiveDays] = useState(30);
  const [programId, setProgramId] = useState("");
  const [tierId, setTierId] = useState("");
  const [minPoints, setMinPoints] = useState(10);
  const [channels, setChannels] = useState<string[]>(["EMAIL"]);
  const [error, setError] = useState<string | null>(null);

  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiFetch<{ campaigns: Campaign[] }>("/api/campaigns"),
  });

  const programsQuery = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiFetch<{ programs: LoyaltyProgram[] }>("/api/programs"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["campaigns"] });

  const createCampaign = useMutation({
    mutationFn: () => {
      const segment =
        segmentType === "all"
          ? { type: "all" as const }
          : segmentType === "inactive"
            ? { type: "inactive" as const, days: inactiveDays }
            : segmentType === "tier"
              ? { type: "tier" as const, programId, tierId }
              : { type: "min_points" as const, programId, points: minPoints };

      return apiFetch("/api/campaigns", { method: "POST", body: { title, message, segment, channels } });
    },
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setTitle("");
      setMessage("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear la campana"),
  });

  const sendCampaign = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/campaigns/${id}/send`, { method: "POST" }),
    onSuccess: invalidate,
  });

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/campaigns/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  function toggleChannel(value: string) {
    setChannels((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createCampaign.mutate();
  }

  const selectedProgram = programsQuery.data?.programs.find((p) => p.id === programId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Campañas</h1>
          <p className="text-sm text-ink-500">Envía comunicaciones segmentadas a tus clientes</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva campaña
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Título" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="🔥 Te estamos esperando" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">Mensaje</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                placeholder="Han pasado 30 días desde tu última visita."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">Segmento</label>
              <select
                value={segmentType}
                onChange={(e) => setSegmentType(e.target.value as typeof segmentType)}
                className="h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {segmentType === "inactive" && (
              <Input label="Días sin visitar" type="number" value={inactiveDays} onChange={(e) => setInactiveDays(Number(e.target.value))} />
            )}

            {(segmentType === "tier" || segmentType === "min_points") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-700">Programa</label>
                <select
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className="h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                >
                  <option value="">Selecciona un programa</option>
                  {programsQuery.data?.programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {segmentType === "tier" && selectedProgram && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-700">Nivel</label>
                <select
                  value={tierId}
                  onChange={(e) => setTierId(e.target.value)}
                  className="h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                >
                  <option value="">Selecciona un nivel</option>
                  {selectedProgram.tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {segmentType === "min_points" && (
              <Input label="Puntos mínimos" type="number" value={minPoints} onChange={(e) => setMinPoints(Number(e.target.value))} />
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">Canales</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleChannel(c.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      channels.includes(c.value)
                        ? "border-ink-900 bg-ink-900 text-white"
                        : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={createCampaign.isPending} className="w-fit">
              Guardar campaña
            </Button>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {campaignsQuery.data?.campaigns.map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-brand-600" />
                <h3 className="font-semibold text-ink-900">{c.title}</h3>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  c.status === "SENT" ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-500"
                }`}
              >
                {c.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-500">{c.message}</p>
            <p className="mt-2 text-xs text-ink-400">
              {SEGMENT_LABELS[c.segment.type] ?? c.segment.type} · {c.channels.join(", ")}
            </p>
            <div className="mt-4 flex gap-2">
              {c.status === "DRAFT" && (
                <Button size="sm" className="gap-1.5" loading={sendCampaign.isPending} onClick={() => sendCampaign.mutate(c.id)}>
                  <Send className="h-3.5 w-3.5" /> Enviar ahora
                </Button>
              )}
              {c.status !== "SENT" && c.status !== "SENDING" && (
                <Button size="sm" variant="ghost" onClick={() => deleteCampaign.mutate(c.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </Card>
        ))}
        {campaignsQuery.data?.campaigns.length === 0 && (
          <p className="col-span-2 py-10 text-center text-sm text-ink-400">Todavía no has creado ninguna campaña.</p>
        )}
      </div>
    </div>
  );
}
