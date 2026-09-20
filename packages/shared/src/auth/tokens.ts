/**
 * Payload del access token JWT (vida corta, 15 min). Nunca se persiste.
 *
 * `type: "staff"` existe a proposito, aunque a simple vista sea redundante
 * con la forma del objeto: los tokens de staff y de cliente
 * (CustomerAccessTokenPayload) se firman con el mismo secreto, asi que un
 * JWT de cliente igual "verifica" correctamente si se decodifica con
 * verifyAccessToken. Sin un campo `type` explicito que cada middleware
 * revise, un token de cliente podria colarse como payload de staff con
 * campos undefined en vez de fallar limpiamente. Ver auth.middleware.ts.
 */
export interface AccessTokenPayload {
  type: "staff";
  sub: string; // User.id
  userPublicId: string;
  email: string;
  globalRole: "USER" | "SUPER_ADMIN";
  /** Presente solo si el usuario tiene una membresia de staff activa que se resolvio en login/refresh. */
  employeeContext?: {
    employeeId: string;
    businessId: string;
    businessPublicId: string;
    role: "OWNER" | "MANAGER" | "EMPLOYEE";
  } | null;
}

export interface CustomerAccessTokenPayload {
  sub: string; // Customer.id
  customerPublicId: string;
  businessId: string;
  businessPublicId: string;
  type: "customer";
}
