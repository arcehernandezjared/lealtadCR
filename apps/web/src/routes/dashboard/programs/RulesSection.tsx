import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { LOYALTY_EVENTS, LOYALTY_ACTIONS } from "@loyaltycr/shared";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { LoyaltyRule } from "./types";

const EVENT_OPTIONS = Object.entries(LOYALTY_EVENTS).map(([value, meta]) => ({ value, label: meta.label }));
const ACTION_OPTIONS = Object.entries(LOYALTY_ACTIONS).map(([value, meta]) => ({ value, label: meta.label }));

export function RulesSection({ programId, rules }: { programId: string; rules: LoyaltyRule[] }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    eventType: "visit",
    action: "add_points",
    value: 1,
    minAmount: "",
  });
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["program", programId] });

  const createRule = useMutation({
    mutationFn: () =>
      apiFetch(`/api/programs/${programId}/rules`, {
        method: "POST",
        body: {
          name: form.name,
          eventType: form.eventType,
          action: form.action,
          value: Number(form.value),
          conditions: form.eventType === "purchase" && form.minAmount ? { minAmount: Number(form.minAmount) } : {},
        },
      }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm({ name: "", eventType: "visit", action: "add_points", value: 1, minAmount: "" });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear la regla"),
  });

  const deleteRule = useMutation({
    mutationFn: (ruleId: string) => apiFetch(`/api/programs/${programId}/rules/${ruleId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createRule.mutate();
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-900">Reglas</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Agregar regla
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-xl bg-ink-50 p-4">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="1 visita = 1 punto" />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">Evento</label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                className="h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {EVENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">Accion</label>
              <select
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                className="h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor"
              type="number"
              required
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            />
            {form.eventType === "purchase" && (
              <Input
                label="Monto minimo (opcional)"
                type="number"
                value={form.minAmount}
                onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                placeholder="10000"
              />
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={createRule.isPending} size="sm" className="w-fit">
            Guardar regla
          </Button>
        </form>
      )}

      <ul className="mt-4 divide-y divide-ink-100">
        {rules.map((rule) => (
          <li key={rule.id} className="flex items-center justify-between py-3 text-sm">
            <div>
              <p className="font-medium text-ink-900">{rule.name}</p>
              <p className="text-ink-500">
                {LOYALTY_EVENTS[rule.eventType as keyof typeof LOYALTY_EVENTS]?.label ?? rule.eventType} →{" "}
                {LOYALTY_ACTIONS[rule.action as keyof typeof LOYALTY_ACTIONS]?.label ?? rule.action} ({rule.value})
              </p>
            </div>
            <button onClick={() => deleteRule.mutate(rule.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {rules.length === 0 && <p className="py-4 text-center text-sm text-ink-400">Sin reglas todavia.</p>}
      </ul>
    </Card>
  );
}
