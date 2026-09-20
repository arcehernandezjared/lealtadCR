import { prisma, type TenantPrismaClient } from "@loyaltycr/database";
import {
  AppError,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CustomerListQuery,
  type AddPointsInput,
  type RegisterVisitInput,
  type RegisterPurchaseInput,
} from "@loyaltycr/shared";
import { getOwnedProgramOrThrow } from "../programs/programs.service.js";
import { triggerLoyaltyEvent } from "../../engine/rule-engine.js";
import { applyLoyaltyDelta } from "../../engine/loyalty-ledger.js";
import { recordAuditLog } from "../../lib/audit.js";

export async function listCustomers(tenantDb: TenantPrismaClient, query: CustomerListQuery) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" as const } },
            { lastName: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } },
            { phone: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    tenantDb.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { loyaltyAccounts: { include: { program: { select: { name: true } }, currentTier: true } } },
    }),
    tenantDb.customer.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function createCustomer(tenantDb: TenantPrismaClient, businessId: string, input: CreateCustomerInput) {
  return tenantDb.customer.create({
    data: {
      businessId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      birthday: input.birthday ? new Date(input.birthday) : undefined,
      referredByCustomerId: input.referredByCustomerId,
    },
  });
}

/** Verifica que el cliente exista y pertenezca al tenant (via tenantDb). Una vez confirmado, cualquier hijo por customerId es seguro de consultar con el cliente crudo. */
export async function getOwnedCustomerOrThrow(tenantDb: TenantPrismaClient, customerId: string) {
  const customer = await tenantDb.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw AppError.notFound("Cliente no encontrado");
  return customer;
}

/**
 * Resuelve un cliente por su QR (usado por la interfaz de "escanear cliente"
 * del empleado). `tenantDb` ya garantiza que solo se encuentre un cliente si
 * pertenece al negocio autenticado, aunque el QR fue emitido por otro negocio.
 */
export async function findCustomerByQrCode(tenantDb: TenantPrismaClient, qrCode: string) {
  const customer = await tenantDb.customer.findFirst({ where: { qrCode } });
  if (!customer) throw AppError.notFound("Cliente no encontrado para ese codigo");
  return customer;
}

export async function updateCustomer(tenantDb: TenantPrismaClient, customerId: string, input: UpdateCustomerInput) {
  await getOwnedCustomerOrThrow(tenantDb, customerId);
  return tenantDb.customer.update({
    where: { id: customerId },
    data: { ...input, birthday: input.birthday ? new Date(input.birthday) : undefined },
  });
}

export async function getCustomerProfile(tenantDb: TenantPrismaClient, customerId: string) {
  const customer = await getOwnedCustomerOrThrow(tenantDb, customerId);

  const [loyaltyAccounts, visits, purchases, redemptions] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      where: { customerId },
      include: { program: { select: { publicId: true, name: true, type: true } }, currentTier: true },
    }),
    tenantDb.visit.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 20 }),
    tenantDb.purchase.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.rewardRedemption.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: { reward: { select: { name: true, pointsCost: true } } },
    }),
  ]);

  const accountIds = loyaltyAccounts.map((a) => a.id);
  const transactions = accountIds.length
    ? await prisma.loyaltyTransaction.findMany({
        where: { accountId: { in: accountIds } },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    : [];

  return { customer, loyaltyAccounts, visits, purchases, redemptions, transactions };
}

export async function registerVisit(
  tenantDb: TenantPrismaClient,
  businessId: string,
  employeeId: string,
  customerId: string,
  input: RegisterVisitInput
) {
  await getOwnedCustomerOrThrow(tenantDb, customerId);
  await getOwnedProgramOrThrow(tenantDb, input.programId);

  const visit = await tenantDb.visit.create({
    data: { businessId, customerId, branchId: input.branchId, employeeId, notes: input.notes },
  });
  await tenantDb.customer.update({ where: { id: customerId }, data: { lastVisitAt: visit.createdAt } });

  const result = await triggerLoyaltyEvent({
    programId: input.programId,
    customerId,
    eventType: "visit",
    sourceType: "visit",
    sourceId: visit.id,
    employeeId,
  });

  await recordAuditLog({
    businessId,
    actorEmployeeId: employeeId,
    action: "customer.visit_registered",
    entityType: "Visit",
    entityId: visit.id,
    metadata: { customerId },
  });

  return { visit, loyalty: result };
}

export async function registerPurchase(
  tenantDb: TenantPrismaClient,
  businessId: string,
  employeeId: string,
  customerId: string,
  input: RegisterPurchaseInput
) {
  await getOwnedCustomerOrThrow(tenantDb, customerId);
  await getOwnedProgramOrThrow(tenantDb, input.programId);

  const purchase = await tenantDb.purchase.create({
    data: { businessId, customerId, branchId: input.branchId, employeeId, amount: input.amount, items: input.items ?? [] },
  });
  await tenantDb.customer.update({
    where: { id: customerId },
    data: { lastVisitAt: purchase.createdAt, totalSpent: { increment: input.amount } },
  });

  const result = await triggerLoyaltyEvent({
    programId: input.programId,
    customerId,
    eventType: "purchase",
    sourceType: "purchase",
    sourceId: purchase.id,
    employeeId,
    payload: { amount: input.amount },
  });

  await recordAuditLog({
    businessId,
    actorEmployeeId: employeeId,
    action: "customer.purchase_registered",
    entityType: "Purchase",
    entityId: purchase.id,
    metadata: { customerId, amount: input.amount },
  });

  return { purchase, loyalty: result };
}

export async function addPointsManually(
  tenantDb: TenantPrismaClient,
  businessId: string,
  employeeId: string,
  customerId: string,
  input: AddPointsInput
) {
  await getOwnedCustomerOrThrow(tenantDb, customerId);
  await getOwnedProgramOrThrow(tenantDb, input.programId);

  const result = await applyLoyaltyDelta({
    customerId,
    programId: input.programId,
    pointsDelta: input.points,
    reason: input.reason,
    sourceType: "manual",
    employeeId,
  });

  await recordAuditLog({
    businessId,
    actorEmployeeId: employeeId,
    action: input.points >= 0 ? "customer.points_added" : "customer.points_removed",
    entityType: "LoyaltyAccount",
    entityId: result.account.id,
    metadata: { customerId, points: input.points, reason: input.reason },
  });

  return result;
}
