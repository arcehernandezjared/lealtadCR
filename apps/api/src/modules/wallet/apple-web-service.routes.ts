import { Router } from "express";
import * as controller from "./apple-web-service.controller.js";

/**
 * Rutas del protocolo Apple Wallet Web Service, montadas en la RAIZ del
 * servidor (no bajo /api) porque su forma exacta (`/v1/devices/...`,
 * `/v1/passes/...`) esta fijada por Apple — es lo que va en el
 * `webServiceURL` del pass.json. Se autentican con el `authenticationToken`
 * del pass, no con nuestro middleware `authenticateStaff`/`authenticateCustomer`.
 */
export const appleWebServiceRouter = Router();

appleWebServiceRouter.post(
  "/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
  controller.registerDevice
);
appleWebServiceRouter.delete(
  "/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
  controller.unregisterDevice
);
appleWebServiceRouter.get(
  "/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier",
  controller.listUpdatedSerials
);
appleWebServiceRouter.get("/passes/:passTypeIdentifier/:serialNumber", controller.getLatestPass);
appleWebServiceRouter.post("/log", controller.logErrors);
