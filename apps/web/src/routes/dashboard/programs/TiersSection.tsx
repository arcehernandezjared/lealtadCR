import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { LoyaltyTier } from "./types";

export function TiersSection({ programId, tiers }: { programId: string; tiers: LoyaltyTier[] }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", minPoints: 0, color: "#6B7280" });
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["program", programId] });

  const createTier = useMutation({
    mutationFn: () => apiFetch(`/api/programs/${programId}/tiers`, { method: "POST", body: form }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm({ name: "", minPoints: 0, color: "#6B7280" });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear el nivel"),
  });

  const deleteTier = useMutation({
    mutationFn: (tierId: string) => apiFetch(`/api/programs/${programId}/tiers/${tierId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createTier.mutate();
  }

  const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-900">Niveles</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Agregar nivel
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-xl bg-ink-50 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Oro" />
          </div>
          <div className="flex-1">
            <Input
              label="Puntos minimos"
              type="number"
              required
              value={form.minPoints}
              onChange={(e) => setForm({ ...form, minPoints: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-700">Color</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-11 w-16 rounded-xl border border-ink-200"
            />
          </div>
          <Button type="submit" loading={createTier.isPending} size="sm">
            Guardar
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      <ul className="mt-4 divide-y divide-ink-100">
        {sorted.map((tier) => (
          <li key={tier.id} className="flex items-center justify-between py-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tier.color }} />
              <p className="font-medium text-ink-900">{tier.name}</p>
              <span className="text-ink-400">{tier.minPoints}+ puntos</span>
            </div>
            <button onClick={() => deleteTier.mutate(tier.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {sorted.length === 0 && <p className="py-4 text-center text-sm text-ink-400">Sin niveles todavia.</p>}
      </ul>
    </Card>
  );
}
