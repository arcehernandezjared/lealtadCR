import type { Request, Response } from "express";
import { AppError } from "@loyaltycr/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireParam } from "../../lib/params.js";
import * as rewardsService from "./rewards.service.js";

function requireStaff(req: Request) {
  if (req.auth?.kind !== "staff") throw AppError.forbidden("Requiere una sesion de staff de negocio");
  return req.auth;
}

export const listRewards = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const rewards = await rewardsService.listRewards(req.tenantDb!, requireParam(req, "programId"));
  res.json({ rewards });
});

export const createReward = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const reward = await rewardsService.createReward(req.tenantDb!, requireParam(req, "programId"), req.body);
  res.status(201).json(reward);
});

export const updateReward = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const reward = await rewardsService.updateReward(
    req.tenantDb!,
    requireParam(req, "programId"),
    requireParam(req, "rewardId"),
    req.body
  );
  res.json(reward);
});

export const deleteReward = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  await rewardsService.deleteReward(req.tenantDb!, requireParam(req, "programId"), requireParam(req, "rewardId"));
  res.status(204).send();
});

export const redeemByCode = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const redemption = await rewardsService.redeemByCode(auth.employee.businessId, auth.employee.employeeId, req.body.code);
  res.json(redemption);
});
