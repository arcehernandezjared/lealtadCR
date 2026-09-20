import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __loyaltycr_prisma__: PrismaClient | undefined;
}

/**
 * Singleton de PrismaClient. En dev, se reutiliza via `global` para evitar
 * agotar conexiones de Postgres con cada hot-reload de tsx/ts-node-dev.
 */
export const prisma =
  global.__loyaltycr_prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV === "development") {
  global.__loyaltycr_prisma__ = prisma;
}
