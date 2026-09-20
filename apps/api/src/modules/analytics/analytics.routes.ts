import { Router } from "express";
import { authenticateStaff } from "../../middleware/auth.middleware.js";
import * as analyticsController from "./analytics.controller.js";

export const analyticsRouter = Router();

analyticsRouter.use(authenticateStaff);
analyticsRouter.get("/overview", analyticsController.getOverview);
analyticsRouter.get("/series", analyticsController.getSeries);
