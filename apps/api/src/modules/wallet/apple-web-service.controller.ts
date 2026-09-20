import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireParam } from "../../lib/params.js";
import * as appleWebService from "./apple-web-service.js";

export const registerDevice = asyncHandler(async (req: Request, res: Response) => {
  const { status } = await appleWebService.registerDevice({
    deviceLibraryIdentifier: requireParam(req, "deviceLibraryIdentifier"),
    passTypeIdentifier: requireParam(req, "passTypeIdentifier"),
    serialNumber: requireParam(req, "serialNumber"),
    pushToken: String(req.body?.pushToken ?? ""),
    authorizationHeader: req.headers.authorization,
  });
  res.status(status).end();
});

export const unregisterDevice = asyncHandler(async (req: Request, res: Response) => {
  await appleWebService.unregisterDevice({
    deviceLibraryIdentifier: requireParam(req, "deviceLibraryIdentifier"),
    passTypeIdentifier: requireParam(req, "passTypeIdentifier"),
    serialNumber: requireParam(req, "serialNumber"),
    authorizationHeader: req.headers.authorization,
  });
  res.status(200).end();
});

export const listUpdatedSerials = asyncHandler(async (req: Request, res: Response) => {
  const result = await appleWebService.listUpdatedSerials({
    deviceLibraryIdentifier: requireParam(req, "deviceLibraryIdentifier"),
    passTypeIdentifier: requireParam(req, "passTypeIdentifier"),
    passesUpdatedSince: typeof req.query.passesUpdatedSince === "string" ? req.query.passesUpdatedSince : undefined,
  });
  if (!result) return res.status(204).end();
  res.status(200).json(result);
});

export const getLatestPass = asyncHandler(async (req: Request, res: Response) => {
  const pkpass = await appleWebService.getLatestPass({
    passTypeIdentifier: requireParam(req, "passTypeIdentifier"),
    serialNumber: requireParam(req, "serialNumber"),
    authorizationHeader: req.headers.authorization,
  });
  res.setHeader("Content-Type", "application/vnd.apple.pkpass");
  res.setHeader("Last-Modified", new Date().toUTCString());
  res.send(pkpass);
});

export const logErrors = asyncHandler(async (req: Request, res: Response) => {
  appleWebService.logDeviceErrors(req.body?.logs);
  res.status(200).end();
});
