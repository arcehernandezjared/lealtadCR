import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "../../lib/api-client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

interface Employee {
  publicId: string;
  role: "OWNER" | "MANAGER" | "EMPLOYEE";
  isActive: boolean;
  user: { publicId: string; firstName: string; lastName: string; email: string };
}

const ROLES: Employee["role"][] = ["EMPLOYEE", "MANAGER", "OWNER"];

export function TeamPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", role: "EMPLOYEE" as Employee["role"] });
  const [error, setError] = useState<string | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiFetch<{ employees: Employee[] }>("/api/business/employees"),
  });

  const inviteEmployee = useMutation({
    mutationFn: () => apiFetch("/api/business/employees", { method: "POST", body: form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setShowForm(false);
      setForm({ firstName: "", lastName: "", email: "", role: "EMPLOYEE" });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo invitar al empleado"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    inviteEmployee.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Equipo</h1>
          <p className="text-sm text-ink-500">Invita empleados y administra sus roles</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> Invitar
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Apellido" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Correo" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Employee["role"] })}
                className="h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={inviteEmployee.isPending}>
                Enviar invitacion
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Card>
      )}

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-400">
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Correo</th>
              <th className="px-6 py-3">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {employeesQuery.data?.employees.map((emp) => (
              <tr key={emp.publicId}>
                <td className="px-6 py-3.5 font-medium text-ink-900">
                  {emp.user.firstName} {emp.user.lastName}
                </td>
                <td className="px-6 py-3.5 text-ink-500">{emp.user.email}</td>
                <td className="px-6 py-3.5">
                  <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700">{emp.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
