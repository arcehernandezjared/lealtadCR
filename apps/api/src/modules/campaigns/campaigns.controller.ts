import type { Request, Response } from "express";
import { AppError } from "@loyaltycr/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireParam } from "../../lib/params.js";
import * as campaignsService from "./campaigns.service.js";

function requireStaff(req: Request) {
  if (req.auth?.kind !== "staff") throw AppError.forbidden("Requiere una sesion de staff de negocio");
  return req.auth;
}

export const listCampaigns = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const campaigns = await campaignsService.listCampaigns(req.tenantDb!);
  res.json({ campaigns });
});

export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const campaign = await campaignsService.createCampaign(req.tenantDb!, auth.employee.businessId, req.body);
  res.status(201).json(campaign);
});

export const updateCampaign = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const campaign = await campaignsService.updateCampaign(req.tenantDb!, requireParam(req, "campaignId"), req.body);
  res.json(campaign);
});

export const deleteCampaign = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  await campaignsService.deleteCampaign(req.tenantDb!, requireParam(req, "campaignId"));
  res.status(204).send();
});

export const sendCampaign = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const campaign = await campaignsService.sendCampaign(req.tenantDb!, auth.employee.businessId, requireParam(req, "campaignId"));
  res.json(campaign);
});
