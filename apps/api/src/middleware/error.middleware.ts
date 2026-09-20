import type { Request, Response, NextFunction } from "express";
import { AppError } from "@loyaltycr/shared";
import { Prisma } from "@loyaltycr/database";
import { logger } from "../lib/logger.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `Ruta no encontrada: ${req.method} ${req.path}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: req.requestId }, err.message);
    }
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: { code: "CONFLICT", message: "Ya existe un registro con ese valor unico" },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Recurso no encontrado" } });
    }
  }

  logger.error({ err, requestId: req.requestId }, "Unhandled error");
  // Nunca se filtra el mensaje/stack real de errores no controlados al cliente.
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } });
}
