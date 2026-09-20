import type { AccessTokenPayload, CustomerAccessTokenPayload, EmployeeRole } from "@loyaltycr/shared";
import type { TenantPrismaClient } from "@loyaltycr/database";

export interface StaffAuthContext {
  kind: "staff";
  userId: string;
  userPublicId: string;
  email: string;
  globalRole: AccessTokenPayload["globalRole"];
  employee: {
    employeeId: string;
    businessId: string;
    businessPublicId: string;
    role: EmployeeRole;
  };
}

export interface SuperAdminAuthContext {
  kind: "super_admin";
  userId: string;
  userPublicId: string;
  email: string;
}

/** Sesion "pre-auth": usuario con password valido pero sin negocio aun elegido (ver POST /auth/select-business). */
export interface PreAuthContext {
  kind: "pre_auth";
  userId: string;
  userPublicId: string;
  email: string;
}

export interface CustomerAuthContext {
  kind: "customer";
  customerId: string;
  customerPublicId: string;
  businessId: string;
  businessPublicId: string;
}

export type AuthContext = StaffAuthContext | SuperAdminAuthContext | CustomerAuthContext | PreAuthContext;

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      /** Cliente Prisma con el filtro de tenant ya aplicado. Solo presente cuando req.auth es "staff". */
      tenantDb?: TenantPrismaClient;
      requestId?: string;
    }
  }
}

export {};
