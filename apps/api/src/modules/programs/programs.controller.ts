import type { Request, Response } from "express";
import { AppError } from "@loyaltycr/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireParam } from "../../lib/params.js";
import { recordAuditLog } from "../../lib/audit.js";
import * as programsService from "./programs.service.js";

function requireStaff(req: Request) {
  if (req.auth?.kind !== "staff") throw AppError.forbidden("Requiere una sesion de staff de negocio");
  return req.auth;
}

export const listPrograms = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const programs = await programsService.listPrograms(req.tenantDb!);
  res.json({ programs });
});

export const createProgram = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const program = await programsService.createProgram(req.tenantDb!, auth.employee.businessId, req.body);
  await recordAuditLog({
    businessId: auth.employee.businessId,
    actorEmployeeId: auth.employee.employeeId,
    action: "program.created",
    entityType: "LoyaltyProgram",
    entityId: program.id,
    metadata: { name: program.name },
  });
  res.status(201).json(program);
});

export const getProgram = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const program = await programsService.getOwnedProgramOrThrow(req.tenantDb!, requireParam(req, "programId"));
  res.json(program);
});

export const updateProgram = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const program = await programsService.updateProgram(req.tenantDb!, requireParam(req, "programId"), req.body);
  res.json(program);
});

export const createRule = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const rule = await programsService.createRule(req.tenantDb!, requireParam(req, "programId"), req.body);
  await recordAuditLog({
    businessId: auth.employee.businessId,
    actorEmployeeId: auth.employee.employeeId,
    action: "rule.created",
    entityType: "LoyaltyRule",
    entityId: rule.id,
    metadata: { eventType: rule.eventType, action: rule.action, value: rule.value.toString() },
  });
  res.status(201).json(rule);
});

export const updateRule = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const rule = await programsService.updateRule(
    req.tenantDb!,
    requireParam(req, "programId"),
    requireParam(req, "ruleId"),
    req.body
  );
  res.json(rule);
});

export const deleteRule = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  await programsService.deleteRule(req.tenantDb!, requireParam(req, "programId"), requireParam(req, "ruleId"));
  res.status(204).send();
});

export const createTier = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const tier = await programsService.createTier(req.tenantDb!, requireParam(req, "programId"), req.body);
  res.status(201).json(tier);
});

export const deleteTier = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  await programsService.deleteTier(req.tenantDb!, requireParam(req, "programId"), requireParam(req, "tierId"));
  res.status(204).send();
});
