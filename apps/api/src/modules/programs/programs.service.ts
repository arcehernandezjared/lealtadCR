import { prisma, Prisma, type TenantPrismaClient } from "@loyaltycr/database";
import {
  AppError,
  type CreateProgramInput,
  type UpdateProgramInput,
  type CreateRuleInput,
  type UpdateRuleInput,
  type CreateTierInput,
} from "@loyaltycr/shared";
import { assertWithinPlanLimit } from "../subscriptions/plan-limits.js";

const PROGRAM_INCLUDE = {
  rules: { orderBy: { priority: "desc" as const } },
  tiers: { orderBy: { order: "asc" as const } },
  rewards: { orderBy: { pointsCost: "asc" as const } },
};

export async function listPrograms(tenantDb: TenantPrismaClient) {
  return tenantDb.loyaltyProgram.findMany({ include: PROGRAM_INCLUDE, orderBy: { createdAt: "asc" } });
}

export async function createProgram(tenantDb: TenantPrismaClient, businessId: string, input: CreateProgramInput) {
  await assertWithinPlanLimit(businessId, "programs");
  return tenantDb.loyaltyProgram.create({ data: { ...input, businessId }, include: PROGRAM_INCLUDE });
}

/** Verifica que el programa exista y pertenezca al tenant autenticado (via tenantDb, que ya filtra por businessId). */
export async function getOwnedProgramOrThrow(tenantDb: TenantPrismaClient, programId: string) {
  const program = await tenantDb.loyaltyProgram.findUnique({ where: { id: programId }, include: PROGRAM_INCLUDE });
  if (!program) throw AppError.notFound("Programa no encontrado");
  return program;
}

export async function updateProgram(tenantDb: TenantPrismaClient, programId: string, input: UpdateProgramInput) {
  await getOwnedProgramOrThrow(tenantDb, programId);
  return tenantDb.loyaltyProgram.update({ where: { id: programId }, data: input, include: PROGRAM_INCLUDE });
}

export async function createRule(tenantDb: TenantPrismaClient, programId: string, input: CreateRuleInput) {
  await getOwnedProgramOrThrow(tenantDb, programId);
  return prisma.loyaltyRule.create({
    data: { ...input, programId, conditions: input.conditions as Prisma.InputJsonValue },
  });
}

export async function updateRule(tenantDb: TenantPrismaClient, programId: string, ruleId: string, input: UpdateRuleInput) {
  await getOwnedProgramOrThrow(tenantDb, programId);
  const rule = await prisma.loyaltyRule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.programId !== programId) throw AppError.notFound("Regla no encontrada");
  return prisma.loyaltyRule.update({
    where: { id: ruleId },
    data: { ...input, conditions: input.conditions as Prisma.InputJsonValue | undefined },
  });
}

export async function deleteRule(tenantDb: TenantPrismaClient, programId: string, ruleId: string) {
  await getOwnedProgramOrThrow(tenantDb, programId);
  const rule = await prisma.loyaltyRule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.programId !== programId) throw AppError.notFound("Regla no encontrada");
  await prisma.loyaltyRule.delete({ where: { id: ruleId } });
}

export async function createTier(tenantDb: TenantPrismaClient, programId: string, input: CreateTierInput) {
  await getOwnedProgramOrThrow(tenantDb, programId);
  return prisma.loyaltyTier.create({ data: { ...input, programId } });
}

export async function deleteTier(tenantDb: TenantPrismaClient, programId: string, tierId: string) {
  await getOwnedProgramOrThrow(tenantDb, programId);
  const tier = await prisma.loyaltyTier.findUnique({ where: { id: tierId } });
  if (!tier || tier.programId !== programId) throw AppError.notFound("Nivel no encontrado");
  await prisma.loyaltyTier.delete({ where: { id: tierId } });
}
