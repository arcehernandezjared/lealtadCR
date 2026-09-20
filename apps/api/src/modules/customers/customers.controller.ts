import type { Request, Response } from "express";
import { AppError } from "@loyaltycr/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireParam } from "../../lib/params.js";
import * as customersService from "./customers.service.js";

function requireStaff(req: Request) {
  if (req.auth?.kind !== "staff") throw AppError.forbidden("Requiere una sesion de staff de negocio");
  return req.auth;
}

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const result = await customersService.listCustomers(req.tenantDb!, req.query as never);
  res.json(result);
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const customer = await customersService.createCustomer(req.tenantDb!, auth.employee.businessId, req.body);
  res.status(201).json(customer);
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const profile = await customersService.getCustomerProfile(req.tenantDb!, requireParam(req, "customerId"));
  res.json(profile);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  requireStaff(req);
  const customer = await customersService.updateCustomer(req.tenantDb!, requireParam(req, "customerId"), req.body);
  res.json(customer);
});

export const registerVisit = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const result = await customersService.registerVisit(
    req.tenantDb!,
    auth.employee.businessId,
    auth.employee.employeeId,
    requireParam(req, "customerId"),
    req.body
  );
  res.status(201).json(result);
});

export const registerPurchase = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const result = await customersService.registerPurchase(
    req.tenantDb!,
    auth.employee.businessId,
    auth.employee.employeeId,
    requireParam(req, "customerId"),
    req.body
  );
  res.status(201).json(result);
});

export const addPoints = asyncHandler(async (req: Request, res: Response) => {
  const auth = requireStaff(req);
  const result = await customersService.addPointsManually(
    req.tenantDb!,
    auth.employee.businessId,
    auth.employee.employeeId,
    requireParam(req, "customerId"),
    req.body
  );
  res.status(201).json(result);
});
