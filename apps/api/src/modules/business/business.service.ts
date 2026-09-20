import { prisma, type TenantPrismaClient } from "@loyaltycr/database";
import { AppError, type UpdateBusinessInput, type CreateBranchInput, type InviteEmployeeInput } from "@loyaltycr/shared";
import { generateOpaqueToken, hashToken } from "../../lib/crypto.js";
import { env } from "../../config/env.js";
import { sendEmail } from "../../lib/email.js";
import { recordAuditLog } from "../../lib/audit.js";
import { assertWithinPlanLimit, getPlanUsage } from "../subscriptions/plan-limits.js";

export async function getBusinessOverview(businessId: string) {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { customers: true, branches: true, employees: true, programs: true } },
    },
  });
  return business;
}

export async function updateBusiness(tenantDb: TenantPrismaClient, businessId: string, input: UpdateBusinessInput) {
  return tenantDb.business.update({ where: { id: businessId }, data: input });
}

export async function listBranches(tenantDb: TenantPrismaClient) {
  return tenantDb.branch.findMany({ orderBy: { createdAt: "asc" } });
}

export async function createBranch(tenantDb: TenantPrismaClient, businessId: string, input: CreateBranchInput) {
  await assertWithinPlanLimit(businessId, "branches");
  // `businessId` se pasa explicitamente para satisfacer el tipo de Prisma;
  // el extension de tenant en packages/database/src/tenant.ts lo sobrescribe
  // igualmente en runtime, asi que es imposible crear la sucursal bajo otro negocio.
  return tenantDb.branch.create({ data: { ...input, businessId } });
}

export { getPlanUsage };

export async function listEmployees(tenantDb: TenantPrismaClient) {
  return tenantDb.employee.findMany({
    include: { user: { select: { publicId: true, firstName: true, lastName: true, email: true } }, branch: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function inviteEmployee(
  tenantDb: TenantPrismaClient,
  businessId: string,
  businessName: string,
  input: InviteEmployeeInput
) {
  await assertWithinPlanLimit(businessId, "employees");

  let user = await prisma.user.findUnique({ where: { email: input.email } });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await prisma.user.create({
      data: { email: input.email, firstName: input.firstName, lastName: input.lastName },
    });
  }

  const existingMembership = await prisma.employee.findUnique({
    where: { businessId_userId: { businessId, userId: user.id } },
  });
  if (existingMembership) {
    throw AppError.conflict("Esta persona ya es parte del equipo de este negocio");
  }

  const employee = await tenantDb.employee.create({
    data: { businessId, userId: user.id, role: input.role, branchId: input.branchId },
    include: { user: { select: { publicId: true, firstName: true, lastName: true, email: true } } },
  });

  if (isNewUser) {
    const token = generateOpaqueToken(32);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
    });
    const setPasswordUrl = `${env.WEB_BASE_URL}/set-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: `Te han invitado a unirte a ${businessName} en LoyaltyCr`,
      html: `<p>Hola ${input.firstName},</p><p>Fuiste invitado como ${input.role} de ${businessName}. Crea tu contrasena aqui: <a href="${setPasswordUrl}">${setPasswordUrl}</a></p>`,
    });
  } else {
    await sendEmail({
      to: user.email,
      subject: `Fuiste agregado a ${businessName} en LoyaltyCr`,
      html: `<p>Hola ${input.firstName},</p><p>Ahora tienes acceso a ${businessName} como ${input.role}. Inicia sesion normalmente con tu cuenta existente.</p>`,
    });
  }

  await recordAuditLog({
    businessId,
    action: "employee.invited",
    entityType: "Employee",
    entityId: employee.id,
    metadata: { email: input.email, role: input.role },
  });

  return employee;
}
