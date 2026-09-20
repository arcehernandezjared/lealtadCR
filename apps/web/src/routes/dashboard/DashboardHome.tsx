import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, Footprints, Coins, Gift, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { apiFetch } from "../../lib/api-client";
import { StatCard, Card } from "../../components/ui/Card";
import clsx from "clsx";

type RangePreset = "today" | "7d" | "30d" | "90d";

const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Hoy",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
};

interface OverviewResponse {
  totalCustomers: number;
  newCustomersInRange: number;
  activeCustomers: number;
  totalVisitsInRange: number;
  pointsAwardedInRange: number;
  rewardsUnlockedInRange: number;
  rewardsRedeemedInRange: number;
  returnRate: number;
  recentActivity: Array<
    | { type: "visit"; at: string; customer: string; employee: string | null }
    | { type: "redemption"; at: string; customer: string; reward: string }
  >;
}

interface SeriesPoint {
  date: string;
  value: number;
}

interface SeriesResponse {
  series: {
    newCustomers: SeriesPoint[];
    visits: SeriesPoint[];
    pointsAwarded: SeriesPoint[];
    rewardsRedeemed: SeriesPoint[];
  };
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("es-CR", { day: "2-digit", month: "short" });
}

export function DashboardHome() {
  const [range, setRange] = useState<RangePreset>("7d");

  const overviewQuery = useQuery({
    queryKey: ["analytics-overview", range],
    queryFn: () => apiFetch<OverviewResponse>(`/api/analytics/overview?range=${range}`),
  });

  const seriesQuery = useQuery({
    queryKey: ["analytics-series", range],
    queryFn: () => apiFetch<SeriesResponse>(`/api/analytics/series?range=${range}`),
  });

  const overview = overviewQuery.data;
  const visitsSeries = seriesQuery.data?.series.visits.map((p) => ({ ...p, date: formatDay(p.date) })) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Dashboard</h1>
          <p className="text-sm text-ink-500">Resumen de tu programa de lealtad</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-ink-200 bg-white p-1">
          {(Object.keys(RANGE_LABELS) as RangePreset[]).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                range === key ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-100"
              )}
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Clientes totales" value={overview?.totalCustomers ?? "—"} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Clientes activos (30d)"
          value={overview?.activeCustomers ?? "—"}
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatCard label="Visitas" value={overview?.totalVisitsInRange ?? "—"} icon={<Footprints className="h-5 w-5" />} />
        <StatCard label="Puntos otorgados" value={overview?.pointsAwardedInRange ?? "—"} icon={<Coins className="h-5 w-5" />} />
        <StatCard
          label="Recompensas desbloqueadas"
          value={overview?.rewardsUnlockedInRange ?? "—"}
          icon={<Gift className="h-5 w-5" />}
        />
        <StatCard
          label="Recompensas canjeadas"
          value={overview?.rewardsRedeemedInRange ?? "—"}
          icon={<Gift className="h-5 w-5" />}
        />
        <StatCard
          label="Clientes nuevos"
          value={overview?.newCustomersInRange ?? "—"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Tasa de retorno"
          value={overview ? `${Math.round(overview.returnRate * 100)}%` : "—"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-ink-700">Visitas en el periodo</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visitsSeries}>
              <defs>
                <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5c3cf5" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5c3cf5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeef2" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#8f8fa3" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#8f8fa3" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #eeeef2", fontSize: 13 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="value" name="Visitas" stroke="#5c3cf5" strokeWidth={2} fill="url(#visitsGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-ink-700">Actividad reciente</h3>
        {overview?.recentActivity.length ? (
          <ul className="divide-y divide-ink-100">
            {overview.recentActivity.map((item, i) => (
              <li key={i} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <span className="font-medium text-ink-900">{item.customer}</span>{" "}
                  <span className="text-ink-500">
                    {item.type === "visit" ? "registro una visita" : `canjeo "${item.reward}"`}
                  </span>
                </div>
                <span className="text-xs text-ink-400">{new Date(item.at).toLocaleString("es-CR")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-ink-400">
            Todavia no hay actividad. Cuando registres visitas o canjes de recompensas apareceran aqui.
          </p>
        )}
      </Card>
    </div>
  );
}
