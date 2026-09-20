import type { Request, Response } from "express";
import { AppError } from "@loyaltycr/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import * as portalService from "./portal.service.js";

function requireCustomer(req: Request) {
  if (req.auth?.kind !== "customer") throw AppError.unauthorized();
  return req.auth;
}

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const qrCode = String(req.body.qrCode ?? "");
  if (!qrCode) throw AppError.badRequest("Falta el codigo de la tarjeta");
  const session = await portalService.createPortalSession(qrCode);
  res.json(session);
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireCustomer(req);
  const profile = await portalService.getPortalProfile(auth.customerId, auth.businessId);
  res.json(profile);
});

export const getRewards = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireCustomer(req);
  const rewards = await portalService.getPortalRewards(auth.customerId, auth.businessId);
  res.json({ rewards });
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireCustomer(req);
  const history = await portalService.getPortalHistory(auth.customerId, auth.businessId);
  res.json(history);
});
