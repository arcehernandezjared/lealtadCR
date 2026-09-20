import { useState, type FormEvent, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

interface PlanUsage {
  plan: string;
  status: string;
  currentPeriodEnd: string;
  usage: Array<{ resource: string; label: string; current: number; limit: number | null }>;
}

export function SettingsPage() {
  const business = useAuthStore((s) => s.business);
  const role = useAuthStore((s) => s.role);
  const [name, setName] = useState(business?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (business?.name) setName(business.name);
  }, [business?.name]);

  const updateBusiness = useMutation({
    mutationFn: () => apiFetch("/api/business", { method: "PATCH", body: { name } }),
    onSuccess: () => setSuccess(true),
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo actualizar"),
  });

  const usageQuery = useQuery({
    queryKey: ["plan-usage"],
    queryFn: () => apiFetch<PlanUsage>("/api/business/usage"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    updateBusiness.mutate();
  }

  const canEdit = role === "OWNER";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Configuracion</h1>
        <p className="text-sm text-ink-500">Informacion general de tu negocio</p>
      </div>

      <Card className="max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nombre del negocio" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Slug</span>
            <p className="text-sm text-ink-400">{business?.slug}</p>
          </div>
          {!canEdit && <p className="text-xs text-ink-400">Solo el OWNER puede editar esta informacion.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Cambios guardados.</p>}
          {canEdit && (
            <Button type="submit" loading={updateBusiness.isPending} className="w-fit">
              Guardar cambios
            </Button>
          )}
        </form>
      </Card>

      <Card className="max-w-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink-900">Plan y uso</h3>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {usageQuery.data?.plan ?? business?.plan ?? "—"}
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {usageQuery.data?.usage.map((u) => {
            const pct = u.limit ? Math.min(100, Math.round((u.current / u.limit) * 100)) : 0;
            const isNearLimit = u.limit !== null && u.current >= u.limit;
            return (
              <div key={u.resource}>
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <span className="capitalize">{u.label}</span>
                  <span>{u.limit === null ? `${u.current} (sin límite)` : `${u.current} / ${u.limit}`}</span>
                </div>
                {u.limit !== null && (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full transition-all ${isNearLimit ? "bg-red-500" : "bg-brand-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {!usageQuery.data && <p className="text-sm text-ink-400">Cargando...</p>}
        </div>
      </Card>
    </div>
  );
}
