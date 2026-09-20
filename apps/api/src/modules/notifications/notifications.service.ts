import { prisma, type NotificationChannelType } from "@loyaltycr/database";
import { sendWebPush, isExpiredSubscriptionError } from "@loyaltycr/notifications";
import { sendEmail } from "../../lib/email.js";
import { logger } from "../../lib/logger.js";
import { webPushConfigured, getVapidKeys } from "./vapid-config.js";
import { notifyWalletsOfChange } from "../wallet/wallet.service.js";

interface CreateNotificationInput {
  businessId: string;
  customerId?: string;
  campaignId?: string;
  type: string;
  channel: NotificationChannelType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Punto unico de creacion + envio de una notificacion. Siempre queda un
 * registro en `Notification` (PENDING -> SENT/FAILED), sea cual sea el
 * canal, para tener un historial auditable de que se le comunico a cada
 * cliente y como. El "como" importa: WALLET_UPDATE, WEB_PUSH, EMAIL y
 * WHATSAPP son mecanismos de entrega completamente distintos, no
 * variaciones de lo mismo (ver docs/ARCHITECTURE.md -> Notificaciones).
 */
export async function createAndDispatch(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      businessId: input.businessId,
      customerId: input.customerId,
      campaignId: input.campaignId,
      type: input.type,
      channel: input.channel,
      title: input.title,
      body: input.body,
      metadata: (input.metadata ?? {}) as object,
    },
  });

  try {
    await dispatchByChannel(input);
    return prisma.notification.update({ where: { id: notification.id }, data: { status: "SENT", sentAt: new Date() } });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Error desconocido";
    logger.warn({ err, notificationId: notification.id }, "No se pudo enviar la notificacion");
    return prisma.notification.update({
      where: { id: notification.id },
      data: { status: "FAILED", metadata: { ...(input.metadata ?? {}), failureReason: reason } },
    });
  }
}

async function dispatchByChannel(input: CreateNotificationInput): Promise<void> {
  switch (input.channel) {
    case "EMAIL":
      return dispatchEmail(input);
    case "WEB_PUSH":
      return dispatchWebPush(input);
    case "WALLET_UPDATE":
      return dispatchWalletUpdate(input);
    case "WHATSAPP":
      return dispatchWhatsApp();
  }
}

async function dispatchEmail(input: CreateNotificationInput): Promise<void> {
  if (!input.customerId) throw new Error("EMAIL requiere un customerId");
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: input.customerId } });
  if (!customer.email) throw new Error("El cliente no tiene correo registrado");
  await sendEmail({ to: customer.email, subject: input.title, html: `<p>${input.body}</p>` });
}

async function dispatchWebPush(input: CreateNotificationInput): Promise<void> {
  if (!webPushConfigured) throw new Error("Web Push no esta configurado (faltan las llaves VAPID)");
  if (!input.customerId) throw new Error("WEB_PUSH requiere un customerId");

  const subscriptions = await prisma.pushSubscription.findMany({ where: { customerId: input.customerId } });
  if (subscriptions.length === 0) throw new Error("El cliente no tiene ninguna suscripcion de Web Push activa");

  const vapid = getVapidKeys();
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      sendWebPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        { title: input.title, body: input.body, data: input.metadata },
        vapid
      )
    )
  );

  await Promise.all(
    results.map((result, i) => {
      const sub = subscriptions[i]!;
      if (result.status === "rejected" && isExpiredSubscriptionError(result.reason)) {
        return prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
      return Promise.resolve();
    })
  );

  if (results.every((r) => r.status === "rejected")) {
    throw new Error("Ninguna suscripcion de Web Push acepto el envio");
  }
}

async function dispatchWalletUpdate(input: CreateNotificationInput): Promise<void> {
  if (!input.customerId) throw new Error("WALLET_UPDATE requiere un customerId");
  const programId = input.metadata?.programId;
  if (typeof programId !== "string") throw new Error("WALLET_UPDATE requiere metadata.programId");
  await notifyWalletsOfChange(input.customerId, programId);
}

/**
 * WhatsApp no esta implementado todavia (requiere una cuenta de WhatsApp
 * Business API que el negocio no tiene configurada). Se falla explicitamente
 * en vez de simular un envio exitoso — mismo principio que Apple/Google
 * Wallet cuando faltan credenciales.
 */
async function dispatchWhatsApp(): Promise<void> {
  throw new Error("El canal WhatsApp todavia no esta implementado (pendiente de credenciales de WhatsApp Business API)");
}

/**
 * Envia una notificacion a un cliente usando todos los canales para los que
 * tenga medios disponibles (correo registrado, suscripcion de Web Push
 * activa). No es un "o uno o el otro": si tiene ambos, recibe ambos. Si no
 * tiene ninguno, no se crea ningun registro (no hay nada que intentar).
 */
export async function notifyCustomerMultiChannel(params: {
  businessId: string;
  customerId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: params.customerId },
    include: { pushSubscriptions: { select: { id: true } } },
  });
  if (!customer) return;

  const attempts: Promise<unknown>[] = [];
  if (customer.email) {
    attempts.push(createAndDispatch({ ...params, channel: "EMAIL" }));
  }
  if (customer.pushSubscriptions.length > 0 && webPushConfigured) {
    attempts.push(createAndDispatch({ ...params, channel: "WEB_PUSH" }));
  }
  await Promise.all(attempts);
}
