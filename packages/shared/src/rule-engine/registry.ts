import { z } from "zod";

/**
 * Registro central de EVENTOS y ACCIONES del motor de reglas de lealtad.
 *
 * Por que esto existe: la seccion 7 del brief pide que se puedan agregar
 * nuevos eventos/acciones "sin tener que reescribir todo el sistema". La
 * columna `LoyaltyRule.eventType`/`action` en la base de datos es un String
 * (no un enum de Postgres) a proposito: agregar un evento nuevo es agregar
 * una entrada aqui + su handler en el RuleEngine del backend, sin migracion.
 *
 * Este registro es la UNICA fuente de verdad compartida entre:
 *  - el backend (RuleEngine.evaluate valida `conditions` contra el schema de aqui)
 *  - el frontend (el constructor visual de reglas usa `LOYALTY_EVENTS`/`LOYALTY_ACTIONS`
 *    para renderizar el formulario correcto por tipo de evento)
 */

export const LOYALTY_EVENTS = {
  appointment_completed: {
    label: "Cita completada",
    description: "Se dispara cuando una cita/servicio se marca como completado.",
    conditionSchema: z.object({}).strict(),
  },
  visit: {
    label: "Visita registrada",
    description: "Se dispara cada vez que un empleado registra una visita del cliente.",
    conditionSchema: z.object({}).strict(),
  },
  purchase: {
    label: "Compra realizada",
    description: "Se dispara cuando se registra una compra. Permite condicionar por monto minimo.",
    conditionSchema: z
      .object({
        minAmount: z.number().nonnegative().optional(),
      })
      .strict(),
  },
  birthday: {
    label: "Cumpleanos del cliente",
    description: "Se dispara automaticamente el dia del cumpleanos del cliente.",
    conditionSchema: z.object({}).strict(),
  },
  referral_completed: {
    label: "Referido completado",
    description: "Se dispara cuando un cliente referido cumple la condicion de activacion.",
    conditionSchema: z.object({}).strict(),
  },
  manual_adjustment: {
    label: "Ajuste manual",
    description: "Un OWNER/MANAGER ajusta puntos manualmente desde el dashboard.",
    conditionSchema: z.object({}).strict(),
  },
  promotion: {
    label: "Promocion especial",
    description: "Evento disparado manualmente como parte de una promocion o campana.",
    conditionSchema: z.object({}).strict(),
  },
} as const;

export type LoyaltyEventType = keyof typeof LOYALTY_EVENTS;

export const LOYALTY_EVENT_TYPES = Object.keys(LOYALTY_EVENTS) as LoyaltyEventType[];

export const LOYALTY_ACTIONS = {
  add_points: {
    label: "Agregar puntos",
    description: "Suma `value` puntos a la cuenta de lealtad del cliente.",
  },
  add_visit: {
    label: "Agregar visita",
    description: "Suma `value` visitas a la cuenta de lealtad del cliente.",
  },
  add_stamp: {
    label: "Agregar sello",
    description: "Suma `value` sellos (para programas tipo tarjeta de sellos).",
  },
  multiply_points: {
    label: "Multiplicar puntos",
    description: "Multiplica los puntos ganados en el evento por `value` (ej. doble puntos).",
  },
} as const;

export type LoyaltyActionType = keyof typeof LOYALTY_ACTIONS;

export const LOYALTY_ACTION_TYPES = Object.keys(LOYALTY_ACTIONS) as LoyaltyActionType[];

export function isLoyaltyEventType(value: string): value is LoyaltyEventType {
  return value in LOYALTY_EVENTS;
}

export function isLoyaltyActionType(value: string): value is LoyaltyActionType {
  return value in LOYALTY_ACTIONS;
}

export function getConditionSchemaForEvent(eventType: LoyaltyEventType) {
  return LOYALTY_EVENTS[eventType].conditionSchema;
}
