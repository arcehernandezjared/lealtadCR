import { prisma, type TenantPrismaClient } from "@loyaltycr/database";
import { AppError, type CreateRewardInput, type UpdateRewardInput } from "@loyaltycr/shared";
import { getOwnedProgramOrThrow } from "../programs/programs.service.js";
import { recordAuditLog } from "../../lib/audit.js";

export async function listRewards(tenantDb: TenantPrismaClient, programId: string) {
  await getOwnedProgramOrThrow(tenantDb, programId);
  return prisma.reward.findMany({ where: { programId }, orderBy: { pointsCost: "asc" } });
}

export async function createReward(tenantDb: TenantPrismaClient, programId: string, input: CreateRewardInput) {
  await getOwnedProgramOrThrow(tenantDb, programId);
  return prisma.reward.create({
    data: {
      ...input,
      programId,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    },
  });
}

async function getOwnedRewardOrThrow(tenantDb: TenantPrismaClient, programId: string, rewardId: string) {
  await getOwnedProgramOrThrow(tenantDb, programId);
  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward || reward.programId !== programId) throw AppError.notFound("Recompensa no encontrada");
  return reward;
}

export async function updateReward(
  tenantDb: TenantPrismaClient,
  programId: string,
  rewardId: string,
  input: UpdateRewardInput
) {
  await getOwnedRewardOrThrow(tenantDb, programId, rewardId);
  return prisma.reward.update({
    where: { id: rewardId },
    data: {
      ...input,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    },
  });
}

export async function deleteReward(tenantDb: TenantPrismaClient, programId: string, rewardId: string) {
  await getOwnedRewardOrThrow(tenantDb, programId, rewardId);
  await prisma.reward.delete({ where: { id: rewardId } });
}

/**
 * Canje de una recompensa por codigo. Este es el UNICO camino de la API que
 * necesita reconstruir el businessId "hacia arriba" (redemption -> reward ->
 * program -> businessId) porque el empleado solo tiene el codigo, no un id
 * de cliente/programa ya verificado como en el resto del modulo.
 */
export async function redeemByCode(businessId: string, employeeId: string, code: string) {
  const redemption = await prisma.rewardRedemption.findUnique({
    where: { code },
    include: { reward: { include: { program: true } }, customer: true },
  });

  // Mensaje generico a proposito: no distinguir "no existe" de "es de otro negocio".
  if (!redemption || redemption.reward.program.businessId !== businessId) {
    throw AppError.notFound("Codigo de canje no encontrado");
  }

  if (redemption.status !== "PENDING") {
    throw AppError.conflict(`Este codigo ya fue ${redemption.status === "REDEEMED" ? "canjeado" : "invalidado"}`);
  }

  if (redemption.expiresAt && redemption.expiresAt < new Date()) {
    await prisma.rewardRedemption.update({ where: { id: redemption.id }, data: { status: "EXPIRED" } });
    throw AppError.badRequest("Este codigo ya expiro");
  }

  const updated = await prisma.rewardRedemption.update({
    where: { id: redemption.id },
    data: { status: "REDEEMED", redeemedAt: new Date(), redeemedByEmployeeId: employeeId },
    include: { reward: true, customer: true },
  });

  await recordAuditLog({
    businessId,
    actorEmployeeId: employeeId,
    action: "reward.redeemed",
    entityType: "RewardRedemption",
    entityId: updated.id,
    metadata: { code, rewardName: updated.reward.name, customerId: updated.customerId },
  });

  return updated;
}
