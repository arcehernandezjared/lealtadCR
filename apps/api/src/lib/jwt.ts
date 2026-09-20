import jwt from "jsonwebtoken";
import type { AccessTokenPayload, CustomerAccessTokenPayload } from "@loyaltycr/shared";
import { env } from "../config/env.js";

/** `type: "staff"` se inyecta aqui (no se pide a cada call site) para que sea imposible olvidarlo. Ver comentario en packages/shared/src/auth/tokens.ts. */
export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  const fullPayload: AccessTokenPayload = { ...payload, type: "staff" };
  return jwt.sign(fullPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: "loyaltycr-api",
  } as jwt.SignOptions);
}

/** Verifica el JWT y ademas exige `type === "staff"`, para que un token de cliente (mismo secreto) nunca pase por aqui. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "loyaltycr-api" }) as AccessTokenPayload;
  if (payload.type !== "staff") {
    throw new jwt.JsonWebTokenError("Token no es de tipo staff");
  }
  return payload;
}

/** Token de sesion para el portal del cliente (identidad separada del staff, sin password por defecto). */
export function signCustomerAccessToken(payload: CustomerAccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "12h",
    issuer: "loyaltycr-api",
  } as jwt.SignOptions);
}

/** Verifica el JWT y ademas exige `type === "customer"`, para que un token de staff (mismo secreto) nunca pase por aqui. */
export function verifyCustomerAccessToken(token: string): CustomerAccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "loyaltycr-api" }) as CustomerAccessTokenPayload;
  if (payload.type !== "customer") {
    throw new jwt.JsonWebTokenError("Token no es de tipo customer");
  }
  return payload;
}
