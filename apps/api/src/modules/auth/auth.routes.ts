import { Router } from "express";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@loyaltycr/shared";
import { validate } from "../../middleware/validate.middleware.js";
import { authRateLimit } from "../../middleware/rate-limit.middleware.js";
import { authenticatePreAuth } from "../../middleware/auth.middleware.js";
import * as authController from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimit, validate(registerSchema), authController.register);
authRouter.post("/login", authRateLimit, validate(loginSchema), authController.login);
authRouter.post(
  "/select-business",
  authRateLimit,
  authenticatePreAuth,
  authController.selectBusiness
);
authRouter.post("/refresh", validate(refreshSchema), authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
authRouter.post(
  "/request-password-reset",
  authRateLimit,
  validate(requestPasswordResetSchema),
  authController.requestPasswordReset
);
authRouter.post("/reset-password", authRateLimit, validate(resetPasswordSchema), authController.resetPassword);
