import { Router } from "express";
import { createCampaignSchema, updateCampaignSchema } from "@loyaltycr/shared";
import { authenticateStaff } from "../../middleware/auth.middleware.js";
import { requireEmployeeRole } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import * as campaignsController from "./campaigns.controller.js";

export const campaignsRouter = Router();

campaignsRouter.use(authenticateStaff);

campaignsRouter.get("/", campaignsController.listCampaigns);
campaignsRouter.post(
  "/",
  requireEmployeeRole("MANAGER"),
  validate(createCampaignSchema),
  campaignsController.createCampaign
);
campaignsRouter.patch(
  "/:campaignId",
  requireEmployeeRole("MANAGER"),
  validate(updateCampaignSchema),
  campaignsController.updateCampaign
);
campaignsRouter.delete("/:campaignId", requireEmployeeRole("MANAGER"), campaignsController.deleteCampaign);
campaignsRouter.post("/:campaignId/send", requireEmployeeRole("MANAGER"), campaignsController.sendCampaign);
