import { useState, type FormEvent, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

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
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Plan actual</span>
            <p className="text-sm text-ink-400">{business?.plan ?? "—"}</p>
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
    </div>
  );
}
