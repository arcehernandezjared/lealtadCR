import { prisma } from "@loyaltycr/database";
import { AppError } from "@loyaltycr/shared";

export type LimitedResource = "customers" | "branches" | "employees" | "programs" | "campaignsPerMonth" | "automations";

const RESOURCE_TO_LIMIT_KEY: Record<LimitedResource, string> = {
  customers: "maxCustomers",
  branches: "maxBranches",
  employees: "maxEmployees",
  programs: "maxPrograms",
  campaignsPerMonth: "maxCampaignsPerMonth",
  automations: "maxAutomations",
};

const RESOURCE_LABELS: Record<LimitedResource, string> = {
  customers: "clientes",
  branches: "sucursales",
  employees: "empleados",
  programs: "programas de lealtad",
  campaignsPerMonth: "campañas este mes",
  automations: "automatizaciones",
};

async function countCurrentUsage(businessId: string, resource: LimitedResource): Promise<number> {
  switch (resource) {
    case "customers":
      return prisma.customer.count({ where: { businessId } });
    case "branches":
      return prisma.branch.count({ where: { businessId } });
    case "employees":
      return prisma.employee.count({ where: { businessId, isActive: true } });
    case "programs":
      return prisma.loyaltyProgram.count({ where: { businessId } });
    case "campaignsPerMonth": {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      return prisma.campaign.count({ where: { businessId, createdAt: { gte: startOfMonth } } });
    }
    case "automations":
      return prisma.automation.count({ where: { businessId } });
  }
}

/**
 * Lanza un 402 si crear un recurso mas superaria el limite del plan actual
 * del negocio. `Plan.limits` es un JSON con claves como `maxCustomers`;
 * `null` en cualquiera de ellas significa "sin limite" (plan PRO). Se llama
 * ANTES de crear el recurso (no despues) desde cada servicio relevante
 * (customers, business branches/employees, programs, campaigns, automations).
 *
 * Si el negocio no tiene una `Subscription` (no deberia pasar — se crea una
 * en el registro, ver auth.service.ts), se falla cerrado con un error claro
 * en vez de permitir crecimiento ilimitado por un dato faltante.
 */
export async function assertWithinPlanLimit(businessId: string, resource: LimitedResource): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
    include: { plan: true },
  });

  if (!subscription) {
    throw AppError.forbidden("Este negocio no tiene una suscripcion activa. Contacta a soporte.");
  }

  const limits = subscription.plan.limits as Record<string, number | null>;
  const limitKey = RESOURCE_TO_LIMIT_KEY[resource];
  const limit = limits[limitKey];

  if (limit == null) return; // sin limite (plan PRO o el negocio ya tiene ese recurso desbloqueado)

  const current = await countCurrentUsage(businessId, resource);
  if (current >= limit) {
    throw AppError.limitReached(
      `Alcanzaste el limite de ${limit} ${RESOURCE_LABELS[resource]} de tu plan ${subscription.plan.name}. Mejora tu plan para agregar mas.`,
      { resource, limit, current, plan: subscription.plan.name }
    );
  }
}

export async function getPlanUsage(businessId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { businessId }, include: { plan: true } });
  if (!subscription) throw AppError.notFound("Suscripcion no encontrada");

  const limits = subscription.plan.limits as Record<string, number | null>;
  const resources: LimitedResource[] = ["customers", "branches", "employees", "programs", "campaignsPerMonth", "automations"];

  const usage = await Promise.all(
    resources.map(async (resource) => ({
      resource,
      label: RESOURCE_LABELS[resource],
      current: await countCurrentUsage(businessId, resource),
      limit: limits[RESOURCE_TO_LIMIT_KEY[resource]] ?? null,
    }))
  );

  return {
    plan: subscription.plan.name,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    usage,
  };
}
