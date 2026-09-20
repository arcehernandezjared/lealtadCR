import type { Request, Response } from "express";
import { AppError } from "@loyaltycr/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { resolveDateRange } from "./date-range.js";
import * as analyticsService from "./analytics.service.js";

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth?.kind !== "staff") throw AppError.forbidden();
  const range = resolveDateRange(req.query as Record<string, unknown>);
  const overview = await analyticsService.getDashboardOverview(req.auth.employee.businessId, range);
  res.json({ range, ...overview });
});

export const getSeries = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth?.kind !== "staff") throw AppError.forbidden();
  const range = resolveDateRange(req.query as Record<string, unknown>);
  const series = await analyticsService.getDashboardSeries(req.auth.employee.businessId, range);
  res.json({ range, series });
});
