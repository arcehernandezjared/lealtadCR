import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, ChevronRight } from "lucide-react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { LoyaltyProgram } from "./types";

const PROGRAM_TYPES = [
  { value: "POINTS", label: "Puntos" },
  { value: "VISITS", label: "Visitas" },
  { value: "STAMPS", label: "Sellos" },
  { value: "SPEND", label: "Dinero gastado" },
  { value: "MIXED", label: "Mixto" },
];

export function ProgramsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "POINTS",
    primaryColor: "#111827",
    secondaryColor: "#F59E0B",
  });
  const [error, setError] = useState<string | null>(null);

  const programsQuery = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiFetch<{ programs: LoyaltyProgram[] }>("/api/programs"),
  });

  const createProgram = useMutation({
    mutationFn: () => apiFetch("/api/programs", { method: "POST", body: form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setShowForm(false);
      setForm({ name: "", description: "", type: "POINTS", primaryColor: "#111827", secondaryColor: "#F59E0B" });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear el programa"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createProgram.mutate();
  }

  const programs = programsQuery.data?.programs ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Programas de lealtad</h1>
          <p className="text-sm text-ink-500">Define como tus clientes acumulan puntos y desbloquean recompensas</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo programa
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Club VIP Barberia" />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-700">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                >
                  {PROGRAM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Input
              label="Descripcion"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="1 visita = 1 punto"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-700">Color principal</label>
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-11 w-full rounded-xl border border-ink-200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-700">Color secundario</label>
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="h-11 w-full rounded-xl border border-ink-200"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={createProgram.isPending} className="w-fit">
              Crear programa
            </Button>
          </form>
        </Card>
      )}

      {programs.length === 0 && !showForm && (
        <Card className="text-center">
          <p className="text-sm text-ink-500">Todavia no tienes ningun programa de lealtad.</p>
          <Button onClick={() => setShowForm(true)} className="mx-auto mt-4 gap-2">
            <Plus className="h-4 w-4" /> Crear tu primer programa
          </Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {programs.map((program) => (
          <Link key={program.id} to={`/dashboard/programs/${program.id}`}>
            <Card className="flex items-center justify-between hover:border-brand-300">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: program.primaryColor }} />
                  <h3 className="font-semibold text-ink-900">{program.name}</h3>
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  {program.rules.length} reglas · {program.tiers.length} niveles · {program.rewards.length} recompensas
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-ink-300" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
