export * from "@prisma/client";
export { prisma } from "./client.js";
export { forTenant, TENANT_SCOPED_MODELS } from "./tenant.js";
export type { TenantPrismaClient } from "./tenant.js";
