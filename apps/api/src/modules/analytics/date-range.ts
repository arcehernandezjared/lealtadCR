import { AppError } from "@loyaltycr/shared";
import type { DateRange } from "./analytics.service.js";

const PRESETS = ["today", "7d", "30d", "90d", "custom"] as const;
export type RangePreset = (typeof PRESETS)[number];

export function resolveDateRange(query: Record<string, unknown>): DateRange {
  const preset = (query.range as RangePreset) ?? "7d";
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (preset === "custom") {
    const from = query.from ? new Date(String(query.from)) : undefined;
    const to = query.to ? new Date(String(query.to)) : undefined;
    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw AppError.badRequest("Rango personalizado requiere 'from' y 'to' validos (ISO date)");
    }
    return { from, to };
  }

  if (!PRESETS.includes(preset)) {
    throw AppError.badRequest(`range invalido. Usa uno de: ${PRESETS.join(", ")}`);
  }

  const daysBack = preset === "today" ? 0 : preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, 0, 0, 0, 0);
  return { from, to: endOfToday };
}
