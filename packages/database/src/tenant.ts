import { Prisma } from "@prisma/client";
import { prisma } from "./client.js";

/**
 * Modelos que tienen `businessId` como columna directa. Para estos, el
 * extension de abajo inyecta automaticamente `businessId` en TODAS las
 * operaciones de lectura/escritura, de forma que sea estructuralmente
 * imposible que una query "olvide" el filtro de tenant.
 *
 * Modelos que NO tienen `businessId` directo (LoyaltyRule, LoyaltyAccount,
 * LoyaltyTransaction, Reward, RewardRedemption, WalletPass,
 * WalletDeviceRegistration) se alcanzan siempre a traves de su padre
 * (`program`, `customer`, `account`, etc.) y el aislamiento se garantiza en
 * la capa de servicio, que primero resuelve el padre con un cliente scoped
 * a tenant y solo despues opera sobre el hijo. Ver tests en
 * tests/multi-tenant-isolation.test.ts.
 */
const TENANT_SCOPED_MODELS = [
  "Branch",
  "Employee",
  "Customer",
  "LoyaltyProgram",
  "Campaign",
  "Automation",
  "Notification",
  "AuditLog",
  "Visit",
  "Purchase",
  "Referral",
] as const;

type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

function isTenantScopedModel(model: string | undefined): model is TenantScopedModel {
  return !!model && (TENANT_SCOPED_MODELS as readonly string[]).includes(model);
}

/**
 * Devuelve un PrismaClient extendido que fuerza `businessId = tenantBusinessId`
 * en cada operacion sobre un modelo tenant-scoped. Usar SIEMPRE este cliente
 * (nunca el `prisma` crudo) dentro de request handlers autenticados como
 * OWNER/MANAGER/EMPLOYEE, para que un IDOR (adivinar el id de un recurso de
 * otro negocio) sea imposible a nivel de query, no solo a nivel de chequeo manual.
 */
export function forTenant(tenantBusinessId: string) {
  if (!tenantBusinessId) {
    throw new Error("forTenant() requiere un businessId no vacio");
  }

  return prisma.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model?: string;
          operation: string;
          args: unknown;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query: (args: any) => Promise<unknown>;
        }) {
          if (!isTenantScopedModel(model)) {
            return query(args);
          }

          const a = args as Record<string, unknown>;

          switch (operation) {
            case "findUnique":
            case "findUniqueOrThrow":
            case "findFirst":
            case "findFirstOrThrow":
            case "findMany":
            case "count":
            case "aggregate":
            case "groupBy": {
              a.where = { ...(a.where as object), businessId: tenantBusinessId };
              return query(a);
            }
            case "create": {
              a.data = { ...(a.data as object), businessId: tenantBusinessId };
              return query(a);
            }
            case "createMany": {
              const data = a.data as Array<Record<string, unknown>>;
              a.data = data.map((d) => ({ ...d, businessId: tenantBusinessId }));
              return query(a);
            }
            case "update":
            case "updateMany":
            case "delete":
            case "deleteMany":
            case "upsert": {
              a.where = { ...(a.where as object), businessId: tenantBusinessId };
              return query(a);
            }
            default:
              return query(a);
          }
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof forTenant>;
export { TENANT_SCOPED_MODELS };
export type { Prisma };
