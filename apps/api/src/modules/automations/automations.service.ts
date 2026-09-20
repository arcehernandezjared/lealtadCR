import { prisma, type TenantPrismaClient } from "@loyaltycr/database";
import { AppError } from "@loyaltycr/shared";

export async function listAutomations(tenantDb: TenantPrismaClient) {
  return tenantDb.automation.findMany({ orderBy: { createdAt: "desc" } });
}

export interface CreateAutomationInput {
  name: string;
  triggerType: string;
  conditions: Record<string, unknown>;
  actions: Array<{ type: string; params?: Record<string, unknown> }>;
  isActive?: boolean;
}

export async function createAutomation(tenantDb: TenantPrismaClient, businessId: string, input: CreateAutomationInput) {
  return tenantDb.automation.create({
    data: {
      businessId,
      name: input.name,
      triggerType: input.triggerType,
      conditions: input.conditions as object,
      actions: input.actions as unknown as object,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateAutomation(
  tenantDb: TenantPrismaClient,
  automationId: string,
  input: Partial<CreateAutomationInput>
) {
  const existing = await tenantDb.automation.findUnique({ where: { id: automationId } });
  if (!existing) throw AppError.notFound("Automatizacion no encontrada");

  return tenantDb.automation.update({
    where: { id: automationId },
    data: {
      name: input.name,
      triggerType: input.triggerType,
      conditions: input.conditions as object | undefined,
      actions: input.actions as unknown as object | undefined,
      isActive: input.isActive,
    },
  });
}

export async function deleteAutomation(tenantDb: TenantPrismaClient, automationId: string) {
  const existing = await tenantDb.automation.findUnique({ where: { id: automationId } });
  if (!existing) throw AppError.notFound("Automatizacion no encontrada");
  await tenantDb.automation.delete({ where: { id: automationId } });
}

export async function listExecutions(tenantDb: TenantPrismaClient, automationId: string) {
  const existing = await tenantDb.automation.findUnique({ where: { id: automationId } });
  if (!existing) throw AppError.notFound("Automatizacion no encontrada");
  return prisma.automationExecution.findMany({
    where: { automationId },
    orderBy: { executedAt: "desc" },
    take: 50,
    include: { customer: { select: { firstName: true, lastName: true } } },
  });
}
