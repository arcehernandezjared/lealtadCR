import { Router } from "express";
import { createRewardSchema, updateRewardSchema, redeemRewardSchema } from "@loyaltycr/shared";
import { authenticateStaff } from "../../middleware/auth.middleware.js";
import { requireEmployeeRole } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { posOperationRateLimit } from "../../middleware/rate-limit.middleware.js";
import * as rewardsController from "./rewards.controller.js";

/** Anidado bajo /api/programs/:programId/rewards */
export const programRewardsRouter = Router({ mergeParams: true });
programRewardsRouter.use(authenticateStaff);
programRewardsRouter.get("/", rewardsController.listRewards);
programRewardsRouter.post("/", requireEmployeeRole("OWNER"), validate(createRewardSchema), rewardsController.createReward);
programRewardsRouter.patch(
  "/:rewardId",
  requireEmployeeRole("OWNER"),
  validate(updateRewardSchema),
  rewardsController.updateReward
);
programRewardsRouter.delete("/:rewardId", requireEmployeeRole("OWNER"), rewardsController.deleteReward);

/** Top-level /api/rewards — solo el canje, que no requiere conocer el programa de antemano. */
export const rewardsRouter = Router();
rewardsRouter.use(authenticateStaff);
rewardsRouter.post(
  "/redeem",
  posOperationRateLimit,
  validate(redeemRewardSchema),
  rewardsController.redeemByCode
);
