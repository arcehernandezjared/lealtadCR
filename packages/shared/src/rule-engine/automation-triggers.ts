import { z } from "zod";

/**
 * Registro de disparadores de AUTOMATIZACIONES (seccion 16). A diferencia de
 * los eventos del RuleEngine (que reaccionan a un evento puntual como
 * "compra registrada"), estos disparadores incluyen condiciones de tiempo
 * transcurrido/inactividad que requieren un job programado (cron) ademas de
 * reaccion a eventos en tiempo real.
 */
export const AUTOMATION_TRIGGERS = {
  customer_inactive: {
    label: "Cliente inactivo",
    description: "Dias sin visitar. Evaluado por un job periodico (cron).",
    conditionSchema: z.object({ daysSinceLastVisit: z.number().int().positive() }).strict(),
    evaluation: "scheduled",
  },
  points_threshold_reached: {
    label: "Cliente alcanza X puntos",
    description: "Se dispara en el momento en que el balance de puntos cruza el umbral.",
    conditionSchema: z.object({ points: z.number().int().positive() }).strict(),
    evaluation: "event",
  },
  customer_birthday: {
    label: "Cumpleanos del cliente",
    description: "Evaluado diariamente por un job programado.",
    conditionSchema: z.object({}).strict(),
    evaluation: "scheduled",
  },
  tier_reached: {
    label: "Cliente alcanza un nivel",
    description: "Se dispara cuando el cliente sube de LoyaltyTier.",
    conditionSchema: z.object({ tierId: z.string().optional() }).strict(),
    evaluation: "event",
  },
} as const;

export type AutomationTriggerType = keyof typeof AUTOMATION_TRIGGERS;
export const AUTOMATION_TRIGGER_TYPES = Object.keys(AUTOMATION_TRIGGERS) as AutomationTriggerType[];

export const AUTOMATION_ACTIONS = {
  add_points: { label: "Agregar puntos" },
  send_notification: { label: "Enviar notificacion" },
  update_wallet: { label: "Actualizar Wallet" },
  create_reward_unlock: { label: "Desbloquear recompensa" },
} as const;

export type AutomationActionType = keyof typeof AUTOMATION_ACTIONS;

export const automationActionSchema = z.object({
  type: z.enum(
    Object.keys(AUTOMATION_ACTIONS) as [AutomationActionType, ...AutomationActionType[]]
  ),
  params: z.record(z.unknown()).default({}),
});

export function isAutomationTriggerType(value: string): value is AutomationTriggerType {
  return value in AUTOMATION_TRIGGERS;
}
