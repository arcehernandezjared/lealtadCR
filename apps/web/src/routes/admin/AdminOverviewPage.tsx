import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Users, UserCog } from "lucide-react";
import { apiFetch } from "../../lib/api-client";
import { StatCard } from "../../components/ui/Card";

interface PlatformStats {
  totalBusinesses: number;
  activeBusinesses: number;
  totalCustomers: number;
  totalEmployees: number;
}

export function AdminOverviewPage() {
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch<PlatformStats>("/api/admin/stats"),
  });

  const stats = statsQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Resumen de la plataforma</h1>
        <p className="text-sm text-ink-500">Estadísticas globales de todos los negocios en LoyaltyCr</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Negocios totales" value={stats?.totalBusinesses ?? "—"} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Negocios activos" value={stats?.activeBusinesses ?? "—"} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Clientes totales" value={stats?.totalCustomers ?? "—"} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Empleados totales" value={stats?.totalEmployees ?? "—"} icon={<UserCog className="h-5 w-5" />} />
      </div>
    </div>
  );
}
