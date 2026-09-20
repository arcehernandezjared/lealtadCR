import type { VapidKeys } from "@loyaltycr/notifications";
import { env } from "../../config/env.js";

export const webPushConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

export function getVapidKeys(): VapidKeys {
  if (!webPushConfigured) throw new Error("Web Push no esta configurado (faltan VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY)");
  return { publicKey: env.VAPID_PUBLIC_KEY!, privateKey: env.VAPID_PRIVATE_KEY!, subject: env.VAPID_SUBJECT };
}
