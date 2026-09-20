/** Convierte la llave publica VAPID (base64url) al formato Uint8Array que pide la Push API. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Registra el service worker, pide permiso de notificaciones y crea una
 * suscripcion Web Push real contra el navegador (no simulada). Devuelve el
 * objeto listo para mandar a POST /api/portal/push-subscription.
 */
export async function subscribeToPush(vapidPublicKey: string) {
  if (!isPushSupported()) throw new Error("Este navegador no soporta notificaciones push");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("No se concedio permiso de notificaciones");

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // El DOM lib mas reciente tipa applicationServerKey como
      // BufferSource<ArrayBuffer> especificamente; Uint8Array construido en
      // runtime siempre tiene un ArrayBuffer real de respaldo aqui, asi que
      // el cast es seguro (no hay SharedArrayBuffer involucrado).
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("La suscripcion del navegador no trajo las llaves esperadas");
  }

  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}
