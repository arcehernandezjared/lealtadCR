import { Router } from "express";
import { createAutomationSchema, updateAutomationSchema } from "@loyaltycr/shared";
import { authenticateStaff } from "../../middleware/auth.middleware.js";
import { requireEmployeeRole } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import * as automationsController from "./automations.controller.js";

export const automationsRouter = Router();

automationsRouter.use(authenticateStaff);

automationsRouter.get("/", automationsController.listAutomations);
automationsRouter.post(
  "/",
  requireEmployeeRole("OWNER"),
  validate(createAutomationSchema),
  automationsController.createAutomation
);
automationsRouter.patch(
  "/:automationId",
  requireEmployeeRole("OWNER"),
  validate(updateAutomationSchema),
  automationsController.updateAutomation
);
automationsRouter.delete("/:automationId", requireEmployeeRole("OWNER"), automationsController.deleteAutomation);
automationsRouter.get("/:automationId/executions", automationsController.listExecutions);
