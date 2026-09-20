import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";

interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
  loyaltyAccounts: Array<{ points: number; program: { name: string }; currentTier: { name: string; color: string } | null }>;
}

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [error, setError] = useState<string | null>(null);

  const customersQuery = useQuery({
    queryKey: ["customers", search],
    queryFn: () =>
      apiFetch<{ items: CustomerRow[]; total: number }>(
        `/api/customers?${search ? `search=${encodeURIComponent(search)}&` : ""}pageSize=50`
      ),
  });

  const createCustomer = useMutation({
    mutationFn: () =>
      apiFetch("/api/customers", {
        method: "POST",
        body: { ...form, email: form.email || undefined, phone: form.phone || undefined },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setShowForm(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "" });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear el cliente"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createCustomer.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Clientes</h1>
          <p className="text-sm text-ink-500">Administra tus clientes y su progreso de lealtad</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo o telefono"
          className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Apellido" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Correo (opcional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Telefono (opcional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" loading={createCustomer.isPending}>
                Guardar cliente
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-400">
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Contacto</th>
              <th className="px-6 py-3">Puntos</th>
              <th className="px-6 py-3">Nivel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {customersQuery.data?.items.map((c) => {
              const account = c.loyaltyAccounts[0];
              return (
                <tr key={c.id} className="cursor-pointer hover:bg-ink-50">
                  <td className="px-6 py-3.5">
                    <Link to={`/dashboard/customers/${c.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5 text-ink-500">{c.email ?? c.phone ?? "—"}</td>
                  <td className="px-6 py-3.5 text-ink-900">{account?.points ?? 0}</td>
                  <td className="px-6 py-3.5">
                    {account?.currentTier ? (
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: account.currentTier.color }}
                      >
                        {account.currentTier.name}
                      </span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {customersQuery.data?.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-ink-400">
                  No hay clientes que coincidan con la busqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
