import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startAutomationScheduler } from "./jobs/automation-scheduler.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`LoyaltyCr API escuchando en http://localhost:${env.PORT}`);
});

startAutomationScheduler();
