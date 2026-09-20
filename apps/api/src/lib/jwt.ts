import jwt from "jsonwebtoken";
import type { AccessTokenPayload, CustomerAccessTokenPayload } from "@loyaltycr/shared";
import { env } from "../config/env.js";

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: "loyaltycr-api",
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "loyaltycr-api" }) as AccessTokenPayload;
}

/** Token de sesion para el portal del cliente (identidad separada del staff, sin password por defecto). */
export function signCustomerAccessToken(payload: CustomerAccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "12h",
    issuer: "loyaltycr-api",
  } as jwt.SignOptions);
}

export function verifyCustomerAccessToken(token: string): CustomerAccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "loyaltycr-api" }) as CustomerAccessTokenPayload;
}
