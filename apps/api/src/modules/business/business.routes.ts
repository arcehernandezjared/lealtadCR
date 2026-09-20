import { Router } from "express";
import { updateBusinessSchema, createBranchSchema, inviteEmployeeSchema } from "@loyaltycr/shared";
import { authenticateStaff } from "../../middleware/auth.middleware.js";
import { requireEmployeeRole } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import * as businessController from "./business.controller.js";

export const businessRouter = Router();

businessRouter.use(authenticateStaff);

businessRouter.get("/me", businessController.getMe);
businessRouter.patch("/", requireEmployeeRole("OWNER"), validate(updateBusinessSchema), businessController.updateBusiness);

businessRouter.get("/branches", businessController.listBranches);
businessRouter.post(
  "/branches",
  requireEmployeeRole("OWNER"),
  validate(createBranchSchema),
  businessController.createBranch
);

businessRouter.get("/employees", requireEmployeeRole("MANAGER"), businessController.listEmployees);
businessRouter.post(
  "/employees",
  requireEmployeeRole("OWNER"),
  validate(inviteEmployeeSchema),
  businessController.inviteEmployee
);
