import type { Request, Response } from "express";
import { AppError } from "@loyaltycr/shared";
import { prisma } from "@loyaltycr/database";
import { asyncHandler } from "../../lib/async-handler.js";
import { webPushConfigured } from "./vapid-config.js";
import { env } from "../../config/env.js";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth?.kind !== "staff") throw AppError.forbidden("Requiere una sesion de staff de negocio");
  const notifications = await prisma.notification.findMany({
    where: { businessId: req.auth.employee.businessId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: { select: { firstName: true, lastName: true } } },
  });
  res.json({ notifications });
});

export const getWebPushConfig = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ configured: webPushConfigured, publicKey: webPushConfigured ? env.VAPID_PUBLIC_KEY : null });
});

export const createPushSubscription = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth?.kind !== "customer") throw AppError.unauthorized();
  const { endpoint, keys } = req.body;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, customerId: req.auth.customerId },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, customerId: req.auth.customerId },
  });
  res.status(201).json({ subscribed: true });
});

export const deletePushSubscription = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth?.kind !== "customer") throw AppError.unauthorized();
  const endpoint = String(req.body.endpoint ?? "");
  await prisma.pushSubscription.deleteMany({ where: { endpoint, customerId: req.auth.customerId } });
  res.status(204).send();
});
