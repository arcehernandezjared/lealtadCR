import { prisma } from "@loyaltycr/database";
import type { LoyaltyEventType } from "@loyaltycr/shared";
import { applyLoyaltyDelta, type LoyaltyDeltaResult } from "./loyalty-ledger.js";

export interface LoyaltyEvent {
  programId: string;
  customerId: string;
  eventType: LoyaltyEventType;
  sourceType: string;
  sourceId?: string;
  employeeId?: string;
  /** Datos del evento usados para evaluar condiciones, ej. { amount } para "purchase". */
  payload?: Record<string, unknown>;
}

/**
 * Evalua si una regla activa aplica a un evento, segun sus `conditions`
 * (JSON). El significado de cada condicion depende del `eventType` — el
 * catalogo de eventos soportados y su forma de condiciones vive en
 * packages/shared/src/rule-engine/registry.ts.
 */
function ruleMatchesEvent(
  conditions: Record<string, unknown>,
  eventType: LoyaltyEventType,
  payload: Record<string, unknown>
): boolean {
  if (eventType === "purchase" && typeof conditions.minAmount === "number") {
    const amount = typeof payload.amount === "number" ? payload.amount : 0;
    if (amount < conditions.minAmount) return false;
  }
  return true;
}

/**
 * Punto de entrada del motor de reglas: busca las reglas activas del
 * programa que coincidan con el `eventType` del evento, sea cual sea su
 * origen (visita, compra, cumpleanos, referido...), suma sus efectos y
 * aplica el resultado al ledger de lealtad en una sola operacion atomica.
 *
 * Si ninguna regla aplica, no pasa nada (no se crea transaccion ni se
 * altera el balance) — esto es normal, no un error: un negocio puede no
 * tener configurada una regla para un evento en particular todavia.
 */
export async function triggerLoyaltyEvent(event: LoyaltyEvent): Promise<LoyaltyDeltaResult | null> {
  const rules = await prisma.loyaltyRule.findMany({
    where: { programId: event.programId, eventType: event.eventType, isActive: true },
    orderBy: { priority: "desc" },
  });

  const payload = event.payload ?? {};
  const matchingRules = rules.filter((rule) =>
    ruleMatchesEvent(rule.conditions as Record<string, unknown>, event.eventType, payload)
  );

  if (matchingRules.length === 0) return null;

  let pointsDelta = 0;
  let visitsDelta = 0;
  let stampsDelta = 0;
  const appliedRuleNames: string[] = [];

  for (const rule of matchingRules) {
    const value = Number(rule.value);
    switch (rule.action) {
      case "add_points":
        pointsDelta += value;
        break;
      case "add_visit":
        visitsDelta += value;
        break;
      case "add_stamp":
        stampsDelta += value;
        break;
      case "multiply_points":
        pointsDelta *= value;
        break;
      default:
        continue;
    }
    appliedRuleNames.push(rule.name);
  }

  if (pointsDelta === 0 && visitsDelta === 0 && stampsDelta === 0) return null;

  return applyLoyaltyDelta({
    customerId: event.customerId,
    programId: event.programId,
    pointsDelta,
    visitsDelta,
    stampsDelta,
    reason: `Reglas aplicadas: ${appliedRuleNames.join(", ")}`,
    eventType: event.eventType,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    employeeId: event.employeeId,
  });
}
