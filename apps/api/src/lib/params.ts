import type { Request } from "express";
import { AppError } from "@loyaltycr/shared";

/**
 * Express 5 tipa `req.params[x]` como `string | string[]` (para acomodar
 * wildcards de path-to-regexp), aunque en la practica un parametro nombrado
 * como `:programId` siempre es un string. Este helper hace el narrowing
 * explicito en vez de repetir `String(req.params.x)` en cada controller.
 */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw AppError.badRequest(`Falta el parametro de ruta: ${name}`);
  }
  return value;
}
