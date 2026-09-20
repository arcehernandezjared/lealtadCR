import { Router } from "express";
import { createProgramSchema, updateProgramSchema, createRuleSchema, updateRuleSchema, createTierSchema } from "@loyaltycr/shared";
import { authenticateStaff } from "../../middleware/auth.middleware.js";
import { requireEmployeeRole } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import * as programsController from "./programs.controller.js";

export const programsRouter = Router();

programsRouter.use(authenticateStaff);

programsRouter.get("/", programsController.listPrograms);
programsRouter.post("/", requireEmployeeRole("OWNER"), validate(createProgramSchema), programsController.createProgram);
programsRouter.get("/:programId", programsController.getProgram);
programsRouter.patch(
  "/:programId",
  requireEmployeeRole("OWNER"),
  validate(updateProgramSchema),
  programsController.updateProgram
);

programsRouter.post(
  "/:programId/rules",
  requireEmployeeRole("OWNER"),
  validate(createRuleSchema),
  programsController.createRule
);
programsRouter.patch(
  "/:programId/rules/:ruleId",
  requireEmployeeRole("OWNER"),
  validate(updateRuleSchema),
  programsController.updateRule
);
programsRouter.delete("/:programId/rules/:ruleId", requireEmployeeRole("OWNER"), programsController.deleteRule);

programsRouter.post(
  "/:programId/tiers",
  requireEmployeeRole("OWNER"),
  validate(createTierSchema),
  programsController.createTier
);
programsRouter.delete("/:programId/tiers/:tierId", requireEmployeeRole("OWNER"), programsController.deleteTier);
