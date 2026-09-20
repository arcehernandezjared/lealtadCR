/**
 * Error de aplicacion tipado, capturado por el middleware central de manejo
 * de errores en apps/api. `statusCode` mapea directo a la respuesta HTTP.
 * Nunca se filtra el `stack` ni detalles internos al cliente (ver seccion 18).
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, "BAD_REQUEST", details);
  }
  static unauthorized(message = "No autenticado") {
    return new AppError(message, 401, "UNAUTHORIZED");
  }
  static forbidden(message = "No autorizado") {
    return new AppError(message, 403, "FORBIDDEN");
  }
  static notFound(message = "Recurso no encontrado") {
    return new AppError(message, 404, "NOT_FOUND");
  }
  static conflict(message: string, details?: unknown) {
    return new AppError(message, 409, "CONFLICT", details);
  }
  static limitReached(message: string, details?: unknown) {
    return new AppError(message, 402, "PLAN_LIMIT_REACHED", details);
  }
  static tooManyRequests(message = "Demasiadas solicitudes") {
    return new AppError(message, 429, "TOO_MANY_REQUESTS");
  }
  static internal(message = "Error interno del servidor") {
    return new AppError(message, 500, "INTERNAL_ERROR");
  }
}
