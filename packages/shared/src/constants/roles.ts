/**
 * Roles de la plataforma. Se mantienen como const arrays + tipos derivados
 * (en vez de `enum` de TS) para poder usarlos directamente con zod.
 *
 * Nota de diseno: SUPER_ADMIN vive en `User.globalRole` (no tiene businessId).
 * OWNER/MANAGER/EMPLOYEE viven en `Employee.role` (staff de un Business).
 * CUSTOMER no es un "rol" de auth por si mismo: es la existencia de un
 * registro `Customer` para ese usuario en un Business dado.
 */
export const EMPLOYEE_ROLES = ["OWNER", "MANAGER", "EMPLOYEE"] as const;
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const GLOBAL_ROLES = ["USER", "SUPER_ADMIN"] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

/**
 * Jerarquia de permisos de staff: cada rol hereda los permisos de los que
 * estan por debajo. Se usa en el middleware `requireEmployeeRole`.
 */
export const EMPLOYEE_ROLE_RANK: Record<EmployeeRole, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  OWNER: 3,
};

export function employeeRoleAtLeast(role: EmployeeRole, minimum: EmployeeRole): boolean {
  return EMPLOYEE_ROLE_RANK[role] >= EMPLOYEE_ROLE_RANK[minimum];
}

/** Sujeto autenticado tal como queda disponible en `req.auth` tras el middleware de auth. */
export type AuthPrincipalType = "SUPER_ADMIN" | "EMPLOYEE" | "CUSTOMER";
