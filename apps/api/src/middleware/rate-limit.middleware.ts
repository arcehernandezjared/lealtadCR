import rateLimit from "express-rate-limit";

/** Limite general para toda la API. */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limite estricto para endpoints sensibles a fuerza bruta / credential stuffing
 * (login, registro, reset de password).
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Demasiados intentos, intenta de nuevo mas tarde" } },
});

/**
 * Limite para operaciones de POS de alta frecuencia (registrar visita/puntos),
 * pensado como primera capa de prevencion de fraude (seccion 27): un empleado
 * no deberia poder registrar decenas de visitas por segundo.
 */
export const posOperationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
