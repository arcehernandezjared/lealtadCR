import type { Request, Response, NextFunction } from "express";
import { AppError } from "@loyaltycr/shared";
import { forTenant } from "@loyaltycr/database";
import { verifyAccessToken, verifyCustomerAccessToken } from "../lib/jwt.js";
import type { AuthContext } from "../types/express.js";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return null;
}

/**
 * Autentica una sesion de STAFF (SUPER_ADMIN / OWNER / MANAGER / EMPLOYEE).
 * Si el token trae `employeeContext`, adjunta `req.tenantDb` ya scoped a ese
 * `businessId`: a partir de aqui, cualquier query hecha con `req.tenantDb`
 * es estructuralmente imposible que toque datos de otro negocio.
 */
export function authenticateStaff(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next(AppError.unauthorized("Falta el token de autenticacion"));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(AppError.unauthorized("Token invalido o expirado"));
  }

  if (payload.globalRole === "SUPER_ADMIN" && !payload.employeeContext) {
    const ctx: AuthContext = {
      kind: "super_admin",
      userId: payload.sub,
      userPublicId: payload.userPublicId,
      email: payload.email,
    };
    req.auth = ctx;
    return next();
  }

  if (!payload.employeeContext) {
    return next(AppError.forbidden("Este usuario no tiene una membresia de negocio activa"));
  }

  const ctx: AuthContext = {
    kind: "staff",
    userId: payload.sub,
    userPublicId: payload.userPublicId,
    email: payload.email,
    globalRole: payload.globalRole,
    employee: payload.employeeContext,
  };
  req.auth = ctx;
  req.tenantDb = forTenant(payload.employeeContext.businessId);
  next();
}

/**
 * Autentica el token "pre-auth" emitido por /auth/login cuando el usuario
 * tiene staff membership en mas de un negocio y aun debe elegir cual. Este
 * token NUNCA trae employeeContext, asi que no sirve para ninguna otra ruta.
 */
export function authenticatePreAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next(AppError.unauthorized("Falta el token de autenticacion"));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(AppError.unauthorized("Token invalido o expirado"));
  }

  if (payload.employeeContext) {
    return next(AppError.badRequest("Este token ya esta asociado a un negocio"));
  }

  req.auth = {
    kind: "pre_auth",
    userId: payload.sub,
    userPublicId: payload.userPublicId,
    email: payload.email,
  };
  next();
}

/** Autentica una sesion de CLIENTE (portal del cliente / wallet). */
export function authenticateCustomer(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next(AppError.unauthorized("Falta el token de autenticacion"));

  try {
    const payload = verifyCustomerAccessToken(token);
    const ctx: AuthContext = {
      kind: "customer",
      customerId: payload.sub,
      customerPublicId: payload.customerPublicId,
      businessId: payload.businessId,
      businessPublicId: payload.businessPublicId,
    };
    req.auth = ctx;
    next();
  } catch {
    next(AppError.unauthorized("Token invalido o expirado"));
  }
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.kind !== "super_admin") {
    return next(AppError.forbidden("Requiere privilegios de SUPER_ADMIN"));
  }
  next();
}
