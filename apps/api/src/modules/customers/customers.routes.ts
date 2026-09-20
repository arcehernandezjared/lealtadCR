import { Router } from "express";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema,
  addPointsSchema,
  registerVisitSchema,
  registerPurchaseSchema,
} from "@loyaltycr/shared";
import { authenticateStaff } from "../../middleware/auth.middleware.js";
import { requireEmployeeRole } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { posOperationRateLimit } from "../../middleware/rate-limit.middleware.js";
import * as customersController from "./customers.controller.js";

export const customersRouter = Router();

customersRouter.use(authenticateStaff);

customersRouter.get("/", validate(customerListQuerySchema, "query"), customersController.listCustomers);
customersRouter.post(
  "/",
  requireEmployeeRole("MANAGER"),
  validate(createCustomerSchema),
  customersController.createCustomer
);
// Debe ir antes de "/:customerId" para que "by-qr" no se interprete como un id.
customersRouter.get("/by-qr/:qrCode", customersController.getCustomerByQrCode);

customersRouter.get("/:customerId", customersController.getCustomer);
customersRouter.patch(
  "/:customerId",
  requireEmployeeRole("MANAGER"),
  validate(updateCustomerSchema),
  customersController.updateCustomer
);

customersRouter.post(
  "/:customerId/visit",
  posOperationRateLimit,
  validate(registerVisitSchema),
  customersController.registerVisit
);
customersRouter.post(
  "/:customerId/purchase",
  posOperationRateLimit,
  validate(registerPurchaseSchema),
  customersController.registerPurchase
);
customersRouter.post(
  "/:customerId/points",
  posOperationRateLimit,
  validate(addPointsSchema),
  customersController.addPoints
);
