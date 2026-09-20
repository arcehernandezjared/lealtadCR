import { Router } from "express";
import { createPushSubscriptionSchema } from "@loyaltycr/shared";
import { authenticateCustomer } from "../../middleware/auth.middleware.js";
import { authRateLimit } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import * as portalController from "./portal.controller.js";
import * as notificationsController from "../notifications/notifications.controller.js";

export const portalRouter = Router();

// Publico: intercambia el QR del cliente por una sesion de portal.
portalRouter.post("/session", authRateLimit, portalController.createSession);

// Requiere el token de sesion de cliente emitido por /session.
portalRouter.get("/me", authenticateCustomer, portalController.getMe);
portalRouter.get("/rewards", authenticateCustomer, portalController.getRewards);
portalRouter.get("/history", authenticateCustomer, portalController.getHistory);
portalRouter.get("/wallet/apple/:programId", authenticateCustomer, portalController.getAppleWalletPass);
portalRouter.get("/wallet/google/:programId", authenticateCustomer, portalController.getGoogleWalletLink);

portalRouter.post(
  "/push-subscription",
  authenticateCustomer,
  validate(createPushSubscriptionSchema),
  notificationsController.createPushSubscription
);
portalRouter.delete("/push-subscription", authenticateCustomer, notificationsController.deletePushSubscription);
