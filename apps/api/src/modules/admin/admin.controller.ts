import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import * as adminService from "./admin.service.js";

export const listBusinesses = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
  const result = await adminService.listBusinesses(page, pageSize);
  res.json(result);
});

const statusSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED"]) });

export const setBusinessStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = statusSchema.parse(req.body);
  const business = await adminService.setBusinessStatus(String(req.params.businessId), status);
  res.json(business);
});

export const getPlatformStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminService.getPlatformStats();
  res.json(stats);
});
