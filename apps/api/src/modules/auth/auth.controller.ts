import type { Request, Response } from "express";
import { AppError } from "@loyaltycr/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { isProduction } from "../../config/env.js";
import * as authService from "./auth.service.js";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/api/auth",
};

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(authService.REFRESH_TOKEN_COOKIE, token, { ...REFRESH_COOKIE_OPTIONS, expires: expiresAt });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(authService.REFRESH_TOKEN_COOKIE, REFRESH_COOKIE_OPTIONS);
}

export const register = asyncHandler(async (req, res) => {
  const { user, business, tokens } = await authService.registerBusinessOwner(req.body, {
    ipAddress: req.ip,
  });
  setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);
  res.status(201).json({
    accessToken: tokens.accessToken,
    user: { publicId: user.publicId, email: user.email, firstName: user.firstName, lastName: user.lastName },
    business: { publicId: business.publicId, name: business.name, slug: business.slug },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  if (result.status === "needs_business_selection") {
    return res.status(200).json({
      requiresBusinessSelection: true,
      preAuthToken: result.preAuthToken,
      businesses: result.businesses,
    });
  }

  setRefreshCookie(res, result.tokens.refreshToken, result.tokens.refreshTokenExpiresAt);
  res.status(200).json({ accessToken: result.tokens.accessToken, user: result.user });
});

export const selectBusiness = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth?.kind !== "pre_auth") throw AppError.unauthorized();
  const businessId = req.body.businessId as string;

  const tokens = await authService.selectBusiness(req.auth.userId, businessId, {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });
  setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);
  res.status(200).json({ accessToken: tokens.accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[authService.REFRESH_TOKEN_COOKIE] ?? req.body?.refreshToken;
  if (!raw) throw AppError.unauthorized("Falta el refresh token");

  const tokens = await authService.refreshSession(raw, {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });
  setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);
  res.status(200).json({ accessToken: tokens.accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[authService.REFRESH_TOKEN_COOKIE];
  await authService.logout(raw);
  clearRefreshCookie(res);
  res.status(204).send();
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.body.token);
  res.status(200).json({ verified: true });
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  await authService.requestPasswordReset(req.body.email);
  // Siempre 200, exista o no la cuenta.
  res.status(200).json({ message: "Si el correo existe, recibiras instrucciones para restablecer tu contrasena." });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.status(200).json({ message: "Contrasena actualizada. Ya puedes iniciar sesion." });
});
