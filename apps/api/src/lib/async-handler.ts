import type { Request, Response, NextFunction, RequestHandler } from "express";

/** Envuelve un handler async para que sus rejects lleguen al error middleware en vez de colgar la request. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
