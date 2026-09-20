import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Zap } from "lucide-react";
import { AUTOMATION_TRIGGERS, AUTOMATION_ACTIONS, type AutomationTriggerType, type AutomationActionType } from "@loyaltycr/shared";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { LoyaltyProgram } from "../programs/types";

interface ActionDraft {
  type: AutomationActionType;
  programId?: string;
  points?: number;
  reason?: string;
  title?: string;
  body?: string;
  rewardId?: string;
}

interface Automation {
  id: string;
  name: string;
  triggerType: string;
  conditions: Record<string, unknown>;
  actions: Array<{ type: string; params?: Record<string, unknown> }>;
  isActive: boolean;
}

const TRIGGER_OPTIONS = Object.entries(AUTOMATION_TRIGGERS).map(([value, meta]) => ({ value: value as AutomationTriggerType, ...meta }));
const ACTION_OPTIONS = Object.entries(AUTOMATION_ACTIONS).map(([value, meta]) => ({ value: value as AutomationActionType, ...meta }));

function actionToPayload(action: ActionDraft) {
  switch (action.type) {
    case "add_points":
      return { type: action.type, params: { programId: action.programId, points: action.points, reason: action.reason } };
    case "send_notification":
      return { type: action.type, params: { title: action.title, body: action.body } };
    case "update_wallet":
      return { type: action.type, params: { programId: action.programId } };
    case "create_reward_unlock":
      return { type: action.type, params: { rewardId: action.rewardId } };
  }
}

export function AutomationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("customer_inactive");
  const [days, setDays] = useState(30);
  const [points, setPoints] = useState(10);
  const [actions, setActions] = useState<ActionDraft[]>([{ type: "send_notification", title: "", body: "" }]);
  const [error, setError] = useState<string | null>(null);

  const automationsQuery = useQuery({
    queryKey: ["automations"],
    queryFn: () => apiFetch<{ automations: Automation[] }>("/api/automations"),
  });

  const programsQuery = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiFetch<{ programs: LoyaltyProgram[] }>("/api/programs"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["automations"] });

  const createAutomation = useMutation({
    mutationFn: () => {
      const conditions =
        triggerType === "customer_inactive"
          ? { daysSinceLastVisit: days }
          : triggerType === "points_threshold_reached"
            ? { points }
            : {};

      return apiFetch("/api/automations", {
        method: "POST",
        body: { name, triggerType, conditions, actions: actions.map(actionToPayload) },
      });
    },
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setName("");
      setActions([{ type: "send_notification", title: "", body: "" }]);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear la automatizacion"),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/api/automations/${id}`, { method: "PATCH", body: { isActive } }),
    onSuccess: invalidate,
  });

  const deleteAutomation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/automations/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  function updateAction(index: number, patch: Partial<ActionDraft>) {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function addAction() {
    setActions((prev) => [...prev, { type: "send_notification", title: "", body: "" }]);
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createAutomation.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Automatizaciones</h1>
          <p className="text-sm text-ink-500">Reglas "si esto, entonces aquello" sin intervención manual</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva automatización
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Recordatorio de inactividad" />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">Disparador</label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}
                className="h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {TRIGGER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-400">{TRIGGER_OPTIONS.find((t) => t.value === triggerType)?.description}</p>
            </div>

            {triggerType === "customer_inactive" && (
              <Input label="Días sin visitar" type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} />
            )}
            {triggerType === "points_threshold_reached" && (
              <Input label="Puntos" type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            )}

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-ink-700">Acciones</label>
              {actions.map((action, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-xl bg-ink-50 p-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={action.type}
                      onChange={(e) => updateAction(i, { type: e.target.value as AutomationActionType })}
                      className="h-10 flex-1 rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    >
                      {ACTION_OPTIONS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    {actions.length > 1 && (
                      <button type="button" onClick={() => removeAction(i)} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {(action.type === "add_points" || action.type === "update_wallet") && (
                    <select
                      value={action.programId ?? ""}
                      onChange={(e) => updateAction(i, { programId: e.target.value })}
                      className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    >
                      <option value="">Selecciona un programa</option>
                      {programsQuery.data?.programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {action.type === "add_points" && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Puntos"
                        value={action.points ?? ""}
                        onChange={(e) => updateAction(i, { points: Number(e.target.value) })}
                        className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      />
                      <input
                        placeholder="Motivo"
                        value={action.reason ?? ""}
                        onChange={(e) => updateAction(i, { reason: e.target.value })}
                        className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      />
                    </div>
                  )}
                  {action.type === "send_notification" && (
                    <div className="flex flex-col gap-2">
                      <input
                        placeholder="Título"
                        value={action.title ?? ""}
                        onChange={(e) => updateAction(i, { title: e.target.value })}
                        className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      />
                      <input
                        placeholder="Mensaje"
                        value={action.body ?? ""}
                        onChange={(e) => updateAction(i, { body: e.target.value })}
                        className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      />
                    </div>
                  )}
                  {action.type === "create_reward_unlock" && (
                    <input
                      placeholder="ID de la recompensa"
                      value={action.rewardId ?? ""}
                      onChange={(e) => updateAction(i, { rewardId: e.target.value })}
                      className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    />
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={addAction}>
                <Plus className="h-3.5 w-3.5" /> Agregar otra acción
              </Button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={createAutomation.isPending} className="w-fit">
              Guardar automatización
            </Button>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {automationsQuery.data?.automations.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-600" />
                <h3 className="font-semibold text-ink-900">{a.name}</h3>
              </div>
              <button
                onClick={() => toggleActive.mutate({ id: a.id, isActive: !a.isActive })}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  a.isActive ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-500"
                }`}
              >
                {a.isActive ? "Activa" : "Inactiva"}
              </button>
            </div>
            <p className="mt-2 text-sm text-ink-500">
              {AUTOMATION_TRIGGERS[a.triggerType as AutomationTriggerType]?.label ?? a.triggerType}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              {a.actions.map((act) => AUTOMATION_ACTIONS[act.type as AutomationActionType]?.label ?? act.type).join(" · ")}
            </p>
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => deleteAutomation.mutate(a.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </Card>
        ))}
        {automationsQuery.data?.automations.length === 0 && (
          <p className="col-span-2 py-10 text-center text-sm text-ink-400">Todavía no has creado ninguna automatización.</p>
        )}
      </div>
    </div>
  );
}
