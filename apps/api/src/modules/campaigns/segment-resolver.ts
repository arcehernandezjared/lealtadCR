import { prisma, type TenantPrismaClient } from "@loyaltycr/database";
import type { Segment } from "@loyaltycr/shared";

/**
 * Resuelve un `Segment` (guardado como JSON en `Campaign.segment`) a la
 * lista de clientes del negocio que lo cumplen. `tenantDb` garantiza que
 * "all" nunca se escape a clientes de otro negocio.
 */
export async function resolveSegment(tenantDb: TenantPrismaClient, businessId: string, segment: Segment) {
  switch (segment.type) {
    case "all":
      return tenantDb.customer.findMany({ where: { status: "ACTIVE" }, select: { id: true } });

    case "inactive": {
      const cutoff = new Date(Date.now() - segment.days * 24 * 60 * 60 * 1000);
      return tenantDb.customer.findMany({
        where: {
          status: "ACTIVE",
          OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null, createdAt: { lt: cutoff } }],
        },
        select: { id: true },
      });
    }

    case "tier": {
      // LoyaltyAccount no es tenant-scoped directo: se filtra explicitamente
      // por programId (ya verificado que pertenece al negocio por el caller)
      // y se cruza con clientes ACTIVE del negocio.
      const accounts = await prisma.loyaltyAccount.findMany({
        where: { programId: segment.programId, currentTierId: segment.tierId },
        select: { customerId: true },
      });
      const ids = accounts.map((a) => a.customerId);
      return tenantDb.customer.findMany({ where: { status: "ACTIVE", id: { in: ids } }, select: { id: true } });
    }

    case "min_points": {
      const accounts = await prisma.loyaltyAccount.findMany({
        where: { programId: segment.programId, points: { gte: segment.points } },
        select: { customerId: true },
      });
      const ids = accounts.map((a) => a.customerId);
      return tenantDb.customer.findMany({ where: { status: "ACTIVE", id: { in: ids } }, select: { id: true } });
    }
  }
}
