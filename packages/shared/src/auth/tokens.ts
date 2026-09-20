/** Payload del access token JWT (vida corta, 15 min). Nunca se persiste. */
export interface AccessTokenPayload {
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
