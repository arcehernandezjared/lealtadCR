import type { Request, Response } from "express";
import { AppError } from "@loyaltycr/shared";
import { prisma } from "@loyaltycr/database";
import { asyncHandler } from "../../lib/async-handler.js";
import * as businessService from "./business.service.js";

function requireStaff(req: Request) {
  if (req.auth?.kind !== "staff") throw AppError.forbidden("Requiere una sesion de staff de negocio");
  return req.auth;
}

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth?.kind === "super_admin") {
    return res.json({ kind: "super_admin", email: req.auth.email });
  }
  const auth = requireStaff(req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
  const business = await businessService.getBusinessOverview(auth.employee.businessId);

  res.json({
    kind: "staff",
    user: {
      publicId: user.publicId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: Boolean(user.emailVerifiedAt),
    },
    role: auth.employee.role,
    business: {
      publicId: business.publicId,
      name: business.name,
      slug: business.slug,
      logoUrl: business.logoUrl,
      status: business.status,
      currency: business.currency,
      onboardingStep: business.onboardingStep,
      plan: business.subscription?.plan.name ?? null,
      counts: business._count,
    },
  });
});

export const updateBusiness = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const business = await businessService.updateBusiness(req.tenantDb!, auth.employee.businessId, req.body);
  res.json(business);
});

export const listBranches = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const branches = await businessService.listBranches(req.tenantDb!);
  res.json({ branches });
});

export const createBranch = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const branch = await businessService.createBranch(req.tenantDb!, auth.employee.businessId, req.body);
  res.status(201).json(branch);
});

export const listEmployees = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const employees = await businessService.listEmployees(req.tenantDb!);
  res.json({ employees });
});

export const inviteEmployee = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const business = await prisma.business.findUniqueOrThrow({ where: { id: auth.employee.businessId } });
  const employee = await businessService.inviteEmployee(req.tenantDb!, auth.employee.businessId, business.name, req.body);
  res.status(201).json(employee);
});

export const getUsage = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const usage = await businessService.getPlanUsage(auth.employee.businessId);
  res.json(usage);
});
