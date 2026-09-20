import type { Request, Response, NextFunction } from "express";
import { AppError, employeeRoleAtLeast, type EmployeeRole } from "@loyaltycr/shared";

/** Requiere que el staff autenticado tenga como minimo el rol indicado (jerarquia: EMPLOYEE < MANAGER < OWNER). */
export function requireEmployeeRole(minimum: EmployeeRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.auth?.kind !== "staff") {
      return next(AppError.forbidden("Requiere una sesion de staff de negocio"));
    }
    if (!employeeRoleAtLeast(req.auth.employee.role, minimum)) {
      return next(AppError.forbidden(`Requiere rol ${minimum} o superior`));
    }
    next();
  };
}
