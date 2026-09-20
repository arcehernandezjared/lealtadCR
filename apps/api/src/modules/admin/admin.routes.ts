import { Router } from "express";
import { authenticateStaff, requireSuperAdmin } from "../../middleware/auth.middleware.js";
import * as adminController from "./admin.controller.js";

export const adminRouter = Router();

adminRouter.use(authenticateStaff, requireSuperAdmin);
adminRouter.get("/businesses", adminController.listBusinesses);
adminRouter.patch("/businesses/:businessId/status", adminController.setBusinessStatus);
adminRouter.get("/stats", adminController.getPlatformStats);
