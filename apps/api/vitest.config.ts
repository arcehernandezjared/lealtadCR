import { defineConfig } from "vitest/config";
import { config } from "dotenv";

const parsed = config({ path: ".env.test" }).parsed ?? {};

export default defineConfig({
  test: {
    environment: "node",
    env: parsed,
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
