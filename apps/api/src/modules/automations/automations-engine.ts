import { prisma } from "@loyaltycr/database";
import { applyLoyaltyDelta } from "../../engine/loyalty-ledger.js";
import { notifyWalletsOfChange } from "../wallet/wallet.service.js";
import { notifyCustomerMultiChannel } from "../notifications/notifications.service.js";
import { logger } from "../../lib/logger.js";

interface AutomationAction {
  type: "add_points" | "send_notification" | "update_wallet" | "create_reward_unlock";
  params?: Record<string, unknown>;
}

/**
 * Ejecuta las `actions` (JSON) de una automatizacion para un cliente puntual
 * y deja registro en `AutomationExecution` (exito o fallo) — nunca lanza:
 * un fallo en una automatizacion no debe tumbar el flujo que la disparo
 * (una visita, una compra, el scheduler).
 */
export async function runAutomation(
  automation: { id: string; businessId: string; name: string; actions: unknown },
  customerId: string
): Promise<void> {
  const actions = Array.isArray(automation.actions) ? (automation.actions as AutomationAction[]) : [];
  const results: Array<{ action: string; ok: boolean; error?: string }> = [];

  for (const action of actions) {
    try {
      await executeAction(automation.businessId, customerId, action);
      results.push({ action: action.type, ok: true });
    } catch (err) {
      results.push({ action: action.type, ok: false, error: err instanceof Error ? err.message : "error" });
    }
  }

  const overallOk = results.every((r) => r.ok);
  await prisma.automationExecution.create({
    data: {
      automationId: automation.id,
      customerId,
      status: overallOk ? "SUCCESS" : "FAILED",
      result: { actions: results },
    },
  });
}

async function executeAction(businessId: string, customerId: string, action: AutomationAction): Promise<void> {
  const params = action.params ?? {};

  switch (action.type) {
    case "add_points": {
      const programId = String(params.programId ?? "");
      const points = Number(params.points ?? 0);
      if (!programId || !points) throw new Error("add_points requiere programId y points");
      await applyLoyaltyDelta({
        customerId,
        programId,
        pointsDelta: points,
        reason: String(params.reason ?? "Automatizacion"),
        sourceType: "automation",
      });
      return;
    }
    case "send_notification": {
      const title = String(params.title ?? "Notificacion");
      const body = String(params.body ?? "");
      await notifyCustomerMultiChannel({ businessId, customerId, type: "automation", title, body });
      return;
    }
    case "update_wallet": {
      const programId = String(params.programId ?? "");
      if (!programId) throw new Error("update_wallet requiere programId");
      await notifyWalletsOfChange(customerId, programId);
      return;
    }
    case "create_reward_unlock": {
      const rewardId = String(params.rewardId ?? "");
      if (!rewardId) throw new Error("create_reward_unlock requiere rewardId");
      await forceUnlockReward(rewardId, customerId);
      return;
    }
  }
}

async function forceUnlockReward(rewardId: string, customerId: string): Promise<void> {
  const existingPending = await prisma.rewardRedemption.findFirst({
    where: { rewardId, customerId, status: "PENDING" },
  });
  if (existingPending) return; // ya tiene un codigo sin usar, no crear otro

  const { generateRedemptionCode } = await import("@loyaltycr/shared");
  await prisma.rewardRedemption.create({
    data: { rewardId, customerId, code: generateRedemptionCode() },
  });
}

// ---------------------------------------------------------------------------
// Disparadores por EVENTO (se evaluan en caliente, ver apps/api/src/engine/loyalty-ledger.ts)
// ---------------------------------------------------------------------------

export type EventTrigger =
  | { type: "points_threshold_reached"; points: number }
  | { type: "tier_reached"; tierId: string };

/**
 * Evalua las automatizaciones de tipo "evento" (no programadas) contra un
 * trigger puntual. `points_threshold_reached` se dispara UNA sola vez por
 * cliente (se deduplica revisando si ya existe una AutomationExecution
 * exitosa previa) — funciona como un logro de una sola vez. `tier_reached`
 * SI se puede volver a disparar (un cliente puede bajar y volver a subir de
 * nivel legitimamente), asi que no se deduplica.
 */
export async function evaluateEventAutomations(businessId: string, customerId: string, trigger: EventTrigger): Promise<void> {
  const automations = await prisma.automation.findMany({ where: { businessId, isActive: true, triggerType: trigger.type } });

  for (const automation of automations) {
    try {
      const conditions = automation.conditions as Record<string, unknown>;

      if (trigger.type === "points_threshold_reached") {
        const threshold = Number(conditions.points ?? 0);
        if (trigger.points < threshold) continue;

        const alreadyRan = await prisma.automationExecution.findFirst({
          where: { automationId: automation.id, customerId, status: "SUCCESS" },
        });
        if (alreadyRan) continue;
      }

      if (trigger.type === "tier_reached") {
        const requiredTierId = conditions.tierId as string | undefined;
        if (requiredTierId && requiredTierId !== trigger.tierId) continue;
      }

      await runAutomation(automation, customerId);
    } catch (err) {
      logger.error({ err, automationId: automation.id }, "evaluateEventAutomations fallo inesperadamente");
    }
  }
}

// ---------------------------------------------------------------------------
// Disparadores PROGRAMADOS (evaluados periodicamente, ver server.ts)
// ---------------------------------------------------------------------------

/**
 * Evalua las automatizaciones de tipo "programado" (cliente inactivo,
 * cumpleanos) contra TODOS los negocios activos. Pensado para correr
 * periodicamente (ver `scheduleAutomationRunner` en server.ts). Es
 * idempotente dentro del mismo dia: no vuelve a ejecutar una automatizacion
 * para el mismo cliente si ya corrio exitosamente en las ultimas ~20 horas
 * (evita duplicar notificaciones si el scheduler corre varias veces al dia).
 */
export async function runScheduledAutomations(): Promise<{ evaluated: number; executed: number }> {
  const automations = await prisma.automation.findMany({
    where: { isActive: true, triggerType: { in: ["customer_inactive", "customer_birthday"] } },
  });

  let executed = 0;
  const dedupWindow = new Date(Date.now() - 20 * 60 * 60 * 1000);

  for (const automation of automations) {
    try {
      const conditions = automation.conditions as Record<string, unknown>;
      const candidates =
        automation.triggerType === "customer_inactive"
          ? await findInactiveCustomers(automation.businessId, Number(conditions.daysSinceLastVisit ?? 30))
          : await findTodaysBirthdays(automation.businessId);

      for (const customer of candidates) {
        const recentRun = await prisma.automationExecution.findFirst({
          where: { automationId: automation.id, customerId: customer.id, executedAt: { gte: dedupWindow } },
        });
        if (recentRun) continue;

        await runAutomation(automation, customer.id);
        executed++;
      }
    } catch (err) {
      logger.error({ err, automationId: automation.id }, "runScheduledAutomations fallo inesperadamente para una automatizacion");
    }
  }

  return { evaluated: automations.length, executed };
}

async function findInactiveCustomers(businessId: string, daysSinceLastVisit: number) {
  const cutoff = new Date(Date.now() - daysSinceLastVisit * 24 * 60 * 60 * 1000);
  return prisma.customer.findMany({
    where: {
      businessId,
      status: "ACTIVE",
      OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null, createdAt: { lt: cutoff } }],
    },
    select: { id: true },
  });
}

async function findTodaysBirthdays(businessId: string) {
  const customers = await prisma.customer.findMany({
    where: { businessId, status: "ACTIVE", birthday: { not: null } },
    select: { id: true, birthday: true },
  });
  const today = new Date();
  return customers.filter(
    (c) => c.birthday && c.birthday.getUTCMonth() === today.getUTCMonth() && c.birthday.getUTCDate() === today.getUTCDate()
  );
}
