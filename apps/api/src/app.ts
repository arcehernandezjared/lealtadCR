import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { generalRateLimit } from "./middleware/rate-limit.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { businessRouter } from "./modules/business/business.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { programsRouter } from "./modules/programs/programs.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { programRewardsRouter, rewardsRouter } from "./modules/rewards/rewards.routes.js";
import { portalRouter } from "./modules/portal/portal.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_BASE_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use((req, _res, next) => {
    req.requestId = randomUUID();
    next();
  });
  app.use(
    pinoHttp({
      logger,
      genReqId: (req: express.Request) => req.requestId ?? "",
      autoLogging: env.NODE_ENV !== "test",
    })
  );
  app.use(generalRateLimit);

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "loyaltycr-api" }));

  app.use("/api/auth", authRouter);
  app.use("/api/business", businessRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/programs/:programId/rewards", programRewardsRouter);
  app.use("/api/programs", programsRouter);
  app.use("/api/rewards", rewardsRouter);
  app.use("/api/portal", portalRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
