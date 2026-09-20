import { prisma, type Prisma, type TransactionType } from "@loyaltycr/database";
import { generateRedemptionCode } from "@loyaltycr/shared";
import { logger } from "../lib/logger.js";
import { notifyWalletsOfChange } from "../modules/wallet/wallet.service.js";

type Tx = Prisma.TransactionClient;

export interface LoyaltyDelta {
  customerId: string;
  programId: string;
  pointsDelta: number;
  visitsDelta?: number;
  stampsDelta?: number;
  spentDelta?: number;
  reason: string;
  eventType?: string;
  sourceType: string;
  sourceId?: string;
  employeeId?: string;
}

export interface LoyaltyDeltaResult {
  account: Awaited<ReturnType<Tx["loyaltyAccount"]["update"]>>;
  transaction: Awaited<ReturnType<Tx["loyaltyTransaction"]["create"]>> | null;
  tierChanged: boolean;
  unlockedRedemptions: Awaited<ReturnType<Tx["rewardRedemption"]["create"]>>[];
}

/**
 * Punto unico de escritura del "ledger" de lealtad. Tanto el motor de reglas
 * (eventos automaticos) como los ajustes manuales de un OWNER/MANAGER pasan
 * por aqui, para que el balance, el historial y el desbloqueo de recompensas
 * nunca puedan quedar desincronizados entre distintos caminos de codigo.
 *
 * Todo ocurre dentro de una unica transaccion de Postgres: se lee el account
 * con lock implicito de la transaccion, se inserta la entrada del ledger
 * (append-only, nunca se actualiza), se recalculan los balances, se
 * reevalua el nivel (tier) y se desbloquean recompensas si corresponde.
 */
export async function applyLoyaltyDelta(delta: LoyaltyDelta): Promise<LoyaltyDeltaResult> {
  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.loyaltyAccount.upsert({
      where: { customerId_programId: { customerId: delta.customerId, programId: delta.programId } },
      update: {},
      create: { customerId: delta.customerId, programId: delta.programId },
    });

    const newPoints = account.points + delta.pointsDelta;
    const newVisits = account.visits + (delta.visitsDelta ?? 0);
    const newStamps = account.stamps + (delta.stampsDelta ?? 0);
    const newTotalSpent = Number(account.totalSpent) + (delta.spentDelta ?? 0);

    let transaction = null;
    if (delta.pointsDelta !== 0) {
      const type: TransactionType = delta.pointsDelta > 0 ? "EARN" : "ADJUST";
      transaction = await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type,
          points: delta.pointsDelta,
          balanceAfter: newPoints,
          reason: delta.reason,
          eventType: delta.eventType,
          sourceType: delta.sourceType,
          sourceId: delta.sourceId,
          employeeId: delta.employeeId,
        },
      });
    }

    // Reevaluar nivel: el mas alto cuyo minPoints no supere el nuevo balance.
    const eligibleTier = await tx.loyaltyTier.findFirst({
      where: { programId: delta.programId, minPoints: { lte: Math.max(newPoints, 0) } },
      orderBy: { minPoints: "desc" },
    });
    const tierChanged = eligibleTier?.id !== account.currentTierId;

    const updatedAccount = await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: newPoints,
        visits: newVisits,
        stamps: newStamps,
        totalSpent: newTotalSpent,
        currentTierId: eligibleTier?.id ?? null,
      },
    });

    const unlockedRedemptions = await unlockEligibleRewards(tx, updatedAccount);

    return { account: updatedAccount, transaction, tierChanged, unlockedRedemptions };
  });

  // Fuera de la transaccion (es I/O de red a Apple/Google, no debe alargar
  // el lock de la transaccion) y sin esperar su resultado: el cliente que
  // registro la visita/compra no debe esperar a que el wallet se actualice
  // para recibir su respuesta. notifyWalletsOfChange nunca lanza.
  void notifyWalletsOfChange(delta.customerId, delta.programId).catch((err) =>
    logger.error({ err }, "notifyWalletsOfChange fallo inesperadamente")
  );

  return result;
}

/**
 * Revisa las recompensas activas del programa y desbloquea (crea un
 * RewardRedemption en estado PENDING con codigo unico de canje) las que el
 * cliente ya puede reclamar, respetando `limitPerCustomer` y evitando
 * generar un segundo codigo pendiente para la misma recompensa mientras el
 * primero siga sin usarse.
 */
async function unlockEligibleRewards(
  tx: Tx,
  account: { id: string; customerId: string; programId: string; points: number }
) {
  const now = new Date();
  const candidateRewards = await tx.reward.findMany({
    where: {
      programId: account.programId,
      isActive: true,
      pointsCost: { lte: account.points },
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
    },
  });

  const unlocked: Awaited<ReturnType<Tx["rewardRedemption"]["create"]>>[] = [];

  for (const reward of candidateRewards) {
    if (reward.expiresAt && reward.expiresAt < now) continue;

    const existingForCustomer = await tx.rewardRedemption.findMany({
      where: { rewardId: reward.id, customerId: account.customerId, status: { not: "CANCELLED" } },
    });

    if (existingForCustomer.some((r) => r.status === "PENDING")) continue; // ya tiene un codigo sin usar
    if (reward.limitPerCustomer && existingForCustomer.length >= reward.limitPerCustomer) continue;

    if (reward.quantityAvailable != null) {
      const totalIssued = await tx.rewardRedemption.count({
        where: { rewardId: reward.id, status: { not: "CANCELLED" } },
      });
      if (totalIssued >= reward.quantityAvailable) continue;
    }

    const redemption = await createRedemptionWithUniqueCode(tx, {
      rewardId: reward.id,
      customerId: account.customerId,
      expiresAt: reward.expiresAt,
    });
    unlocked.push(redemption);
  }

  return unlocked;
}

async function createRedemptionWithUniqueCode(
  tx: Tx,
  data: { rewardId: string; customerId: string; expiresAt: Date | null }
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await tx.rewardRedemption.create({
        data: {
          rewardId: data.rewardId,
          customerId: data.customerId,
          code: generateRedemptionCode(),
          expiresAt: data.expiresAt,
        },
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
