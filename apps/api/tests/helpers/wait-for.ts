/**
 * Espera hasta que `check()` devuelva un valor truthy, reintentando en
 * intervalos cortos. Necesario porque las notificaciones/automatizaciones
 * disparadas desde el ledger son deliberadamente "fire and forget" (no
 * bloquean la respuesta HTTP de la visita/compra que las origino — ver el
 * comentario en apps/api/src/engine/loyalty-ledger.ts), asi que un test que
 * las verifica debe darles una ventana corta para completarse en vez de
 * asumir que ya corrieron en el momento en que la request original responde.
 */
export async function waitFor<T>(check: () => Promise<T | undefined | null | false>, timeoutMs = 3000, intervalMs = 50): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`waitFor: timeout despues de ${timeoutMs}ms`);
}
