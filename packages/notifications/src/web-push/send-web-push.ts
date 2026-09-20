import webpush from "web-push";
import type { VapidKeys, WebPushSubscription, WebPushPayload } from "./types.js";

/**
 * Envia una notificacion Web Push real (protocolo estandar del navegador,
 * vía VAPID) a UNA suscripcion. No mantiene estado global (a diferencia del
 * `webpush.setVapidDetails()` de la libreria): las credenciales VAPID se
 * pasan explicitamente en cada llamada, para que este paquete se pueda usar
 * con las credenciales de varios negocios sin pisarse entre si — aunque hoy
 * LoyaltyCr usa una sola clave VAPID para toda la plataforma (es una
 * caracteristica del navegador, no por-negocio, asi que no tendria sentido
 * pedirle una a cada negocio).
 *
 * A diferencia de una actualizacion de Wallet (que es "push-to-pull", sin
 * contenido) o un email, esto SI entrega contenido directamente al
 * dispositivo del cliente mediante el Push API del navegador.
 */
export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: WebPushPayload,
  vapid: VapidKeys
): Promise<{ statusCode: number }> {
  const result = await webpush.sendNotification(subscription, JSON.stringify(payload), {
    vapidDetails: { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey },
  });
  return { statusCode: result.statusCode };
}

/** true si el error indica que la suscripcion ya no es valida (410 Gone / 404) y deberia borrarse. */
export function isExpiredSubscriptionError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    ((err as { statusCode?: number }).statusCode === 410 || (err as { statusCode?: number }).statusCode === 404)
  );
}
