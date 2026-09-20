import { Router } from "express";
import { authenticateCustomer } from "../../middleware/auth.middleware.js";
import { authRateLimit } from "../../middleware/rate-limit.middleware.js";
import * as portalController from "./portal.controller.js";

export const portalRouter = Router();

// Publico: intercambia el QR del cliente por una sesion de portal.
portalRouter.post("/session", authRateLimit, portalController.createSession);

// Requiere el token de sesion de cliente emitido por /session.
portalRouter.get("/me", authenticateCustomer, portalController.getMe);
portalRouter.get("/rewards", authenticateCustomer, portalController.getRewards);
portalRouter.get("/history", authenticateCustomer, portalController.getHistory);
portalRouter.get("/wallet/apple/:programId", authenticateCustomer, portalController.getAppleWalletPass);
portalRouter.get("/wallet/google/:programId", authenticateCustomer, portalController.getGoogleWalletLink);
