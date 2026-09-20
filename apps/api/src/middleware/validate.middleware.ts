import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "@loyaltycr/shared";

type Target = "body" | "query" | "params";

/** Valida `req[target]` contra un schema de zod y reemplaza el valor por la version parseada (con defaults aplicados). */
export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(AppError.badRequest("Datos de entrada invalidos", result.error.flatten()));
    }
    req[target] = result.data;
    next();
  };
}
