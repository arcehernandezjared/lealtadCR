import { Router } from "express";
import { authenticateStaff } from "../../middleware/auth.middleware.js";
import * as notificationsController from "./notifications.controller.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticateStaff);
notificationsRouter.get("/", notificationsController.listNotifications);
notificationsRouter.get("/web-push-config", notificationsController.getWebPushConfig);
