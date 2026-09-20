import { NavLink, Outlet, Navigate } from "react-router-dom";
import { ShieldCheck, LogOut, LayoutDashboard, Building2 } from "lucide-react";
import clsx from "clsx";
import { useSessionBootstrap, useMe } from "../../lib/use-session";
import { useAuthStore } from "../../lib/auth-store";
import { apiFetch } from "../../lib/api-client";

const NAV_ITEMS = [
  { to: "/admin", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/admin/businesses", label: "Negocios", icon: Building2 },
];

/**
 * Area separada del dashboard de negocio: SUPER_ADMIN no tiene
 * `employeeContext` (no pertenece a ningun negocio), asi que no tiene
 * sentido reutilizar DashboardLayout (que asume una marca/plan de negocio).
 */
export function AdminLayout() {
  const { hydrated } = useSessionBootstrap();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clear = useAuthStore((s) => s.clear);
  const meQuery = useMe();

  if (!hydrated || (accessToken && meQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-700 border-t-white" />
      </div>
    );
  }

  if (!accessToken) return <Navigate to="/login" replace />;
  if (meQuery.data && meQuery.data.kind !== "super_admin") return <Navigate to="/dashboard" replace />;

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    clear();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="flex w-64 flex-col border-r border-ink-800 bg-ink-950">
        <div className="flex h-16 items-center gap-2 px-6 text-lg font-semibold tracking-tight text-white">
          <ShieldCheck className="h-5 w-5 text-brand-400" /> Admin
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
                  isActive ? "bg-white/10 text-white" : "text-ink-400 hover:bg-white/5 hover:text-white"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-800 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
