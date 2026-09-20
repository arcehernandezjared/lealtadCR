import { randomBytes, createHash } from "node:crypto";

/** Token opaco de alta entropia (usado para refresh tokens, verificacion de email, reset de password). */
export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * SHA-256 del token. Los tokens opacos ya tienen alta entropia (256+ bits),
 * asi que un hash rapido es apropiado aqui (a diferencia de passwords de
 * usuario, que usan bcrypt por su baja entropia inherente).
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
