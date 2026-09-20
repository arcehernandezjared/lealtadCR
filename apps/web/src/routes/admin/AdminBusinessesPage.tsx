import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api-client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

interface BusinessRow {
  id: string;
  publicId: string;
  name: string;
  slug: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  createdAt: string;
  subscription: { plan: { name: string } } | null;
  _count: { customers: number; employees: number };
}

const STATUS_STYLES: Record<BusinessRow["status"], string> = {
  TRIAL: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
  CANCELLED: "bg-ink-100 text-ink-500",
};

export function AdminBusinessesPage() {
  const queryClient = useQueryClient();

  const businessesQuery = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: () => apiFetch<{ items: BusinessRow[]; total: number }>("/api/admin/businesses?pageSize=100"),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) =>
      apiFetch(`/api/admin/businesses/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-businesses"] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Negocios</h1>
        <p className="text-sm text-ink-500">{businessesQuery.data?.total ?? 0} negocios registrados en la plataforma</p>
      </div>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-400">
              <th className="px-6 py-3">Negocio</th>
              <th className="px-6 py-3">Plan</th>
              <th className="px-6 py-3">Clientes</th>
              <th className="px-6 py-3">Empleados</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {businessesQuery.data?.items.map((b) => (
              <tr key={b.id}>
                <td className="px-6 py-3.5">
                  <p className="font-medium text-ink-900">{b.name}</p>
                  <p className="text-xs text-ink-400">{b.slug}</p>
                </td>
                <td className="px-6 py-3.5 text-ink-500">{b.subscription?.plan.name ?? "—"}</td>
                <td className="px-6 py-3.5 text-ink-500">{b._count.customers}</td>
                <td className="px-6 py-3.5 text-ink-500">{b._count.employees}</td>
                <td className="px-6 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[b.status]}`}>{b.status}</span>
                </td>
                <td className="px-6 py-3.5">
                  {b.status === "SUSPENDED" ? (
                    <Button size="sm" variant="outline" loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: b.id, status: "ACTIVE" })}>
                      Reactivar
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: b.id, status: "SUSPENDED" })}>
                      Suspender
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
