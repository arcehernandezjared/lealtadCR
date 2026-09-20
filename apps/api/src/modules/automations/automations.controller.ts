import type { Request, Response } from "express";
import { AppError } from "@loyaltycr/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireParam } from "../../lib/params.js";
import * as automationsService from "./automations.service.js";

function requireStaff(req: Request) {
  if (req.auth?.kind !== "staff") throw AppError.forbidden("Requiere una sesion de staff de negocio");
  return req.auth;
}

export const listAutomations = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const automations = await automationsService.listAutomations(req.tenantDb!);
  res.json({ automations });
});

export const createAutomation = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const automation = await automationsService.createAutomation(req.tenantDb!, auth.employee.businessId, req.body);
  res.status(201).json(automation);
});

export const updateAutomation = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const automation = await automationsService.updateAutomation(req.tenantDb!, requireParam(req, "automationId"), req.body);
  res.json(automation);
});

export const deleteAutomation = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  await automationsService.deleteAutomation(req.tenantDb!, requireParam(req, "automationId"));
  res.status(204).send();
});

export const listExecutions = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const executions = await automationsService.listExecutions(req.tenantDb!, requireParam(req, "automationId"));
  res.json({ executions });
});
