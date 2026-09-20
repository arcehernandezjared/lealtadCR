import { NavLink, Outlet, Navigate } from "react-router-dom";
import { LayoutDashboard, Building2, Users, Settings, LogOut, Layers, Contact, ScanLine, Megaphone, Zap } from "lucide-react";
import clsx from "clsx";
import { useSessionBootstrap, useMe } from "../../lib/use-session";
import { useAuthStore } from "../../lib/auth-store";
import { apiFetch } from "../../lib/api-client";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/pos", label: "Escanear cliente", icon: ScanLine },
  { to: "/dashboard/programs", label: "Programas", icon: Layers },
  { to: "/dashboard/customers", label: "Clientes", icon: Contact },
  { to: "/dashboard/campaigns", label: "Campañas", icon: Megaphone },
  { to: "/dashboard/automations", label: "Automatizaciones", icon: Zap },
  { to: "/dashboard/branches", label: "Sucursales", icon: Building2 },
  { to: "/dashboard/team", label: "Equipo", icon: Users },
  { to: "/dashboard/settings", label: "Configuracion", icon: Settings },
];

export function DashboardLayout() {
  const { hydrated } = useSessionBootstrap();
  const accessToken = useAuthStore((s) => s.accessToken);
  const business = useAuthStore((s) => s.business);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const clear = useAuthStore((s) => s.clear);
  const meQuery = useMe();

  if (!hydrated || (accessToken && meQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-300 border-t-ink-900" />
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (meQuery.data?.kind === "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    clear();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="flex w-64 flex-col border-r border-ink-100 bg-white">
        <div className="flex h-16 items-center px-6 text-lg font-semibold tracking-tight text-ink-900">
          Loyalty<span className="text-brand-600">Cr</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-100 p-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-ink-400">{role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              title="Cerrar sesion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex h-16 items-center justify-between border-b border-ink-100 bg-white px-8">
          <p className="text-sm font-medium text-ink-500">{business?.name ?? "Cargando negocio..."}</p>
          {business?.plan && (
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              Plan {business.plan}
            </span>
          )}
        </header>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
