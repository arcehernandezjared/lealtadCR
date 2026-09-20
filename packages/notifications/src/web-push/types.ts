export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface WebPushPayload {
  title: string;
  body: string;
  /** Datos extra que el service worker puede leer al recibir el push (ej. para deep-linking). */
  data?: Record<string, unknown>;
}
