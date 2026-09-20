import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { Reward } from "./types";

export function RewardsSection({ programId, rewards }: { programId: string; rewards: Reward[] }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", pointsCost: 1 });
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["program", programId] });

  const createReward = useMutation({
    mutationFn: () => apiFetch(`/api/programs/${programId}/rewards`, { method: "POST", body: form }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm({ name: "", description: "", pointsCost: 1 });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear la recompensa"),
  });

  const deleteReward = useMutation({
    mutationFn: (rewardId: string) => apiFetch(`/api/programs/${programId}/rewards/${rewardId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createReward.mutate();
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-900">Recompensas</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Agregar recompensa
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-xl bg-ink-50 p-4">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Corte gratis" />
          <Input
            label="Descripcion"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Puntos requeridos"
            type="number"
            required
            value={form.pointsCost}
            onChange={(e) => setForm({ ...form, pointsCost: Number(e.target.value) })}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={createReward.isPending} size="sm" className="w-fit">
            Guardar recompensa
          </Button>
        </form>
      )}

      <ul className="mt-4 divide-y divide-ink-100">
        {rewards.map((reward) => (
          <li key={reward.id} className="flex items-center justify-between py-3 text-sm">
            <div>
              <p className="font-medium text-ink-900">{reward.name}</p>
              <p className="text-ink-500">{reward.pointsCost} puntos</p>
            </div>
            <button onClick={() => deleteReward.mutate(reward.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {rewards.length === 0 && <p className="py-4 text-center text-sm text-ink-400">Sin recompensas todavia.</p>}
      </ul>
    </Card>
  );
}
