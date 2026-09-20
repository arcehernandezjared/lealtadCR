import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  WEB_BASE_URL: z.string().url().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL es requerido"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET debe tener al menos 32 caracteres"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET debe tener al menos 32 caracteres"),

  EMAIL_PROVIDER: z.enum(["console", "resend", "smtp"]).default("console"),
  EMAIL_FROM: z.string().default("LoyaltyCr <no-reply@loyaltycr.com>"),
  RESEND_API_KEY: z.string().optional(),

  APPLE_TEAM_ID: z.string().optional(),
  APPLE_PASS_TYPE_ID: z.string().optional(),
  APPLE_SIGNER_CERT_BASE64: z.string().optional(),
  APPLE_SIGNER_KEY_BASE64: z.string().optional(),
  APPLE_CERTIFICATE_PASSWORD: z.string().optional(),
  APPLE_WWDR_CERTIFICATE_BASE64: z.string().optional(),
  APPLE_APNS_KEY_BASE64: z.string().optional(),
  APPLE_APNS_KEY_ID: z.string().optional(),

  GOOGLE_WALLET_ISSUER_ID: z.string().optional(),
  GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:soporte@loyaltycr.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables de entorno invalidas:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Configuracion de entorno invalida. Revisa tu archivo .env contra .env.example");
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

/** Indica si hay credenciales reales de Apple Wallet configuradas (vs. modo mock de desarrollo). */
export const appleWalletConfigured = Boolean(
  env.APPLE_TEAM_ID &&
    env.APPLE_PASS_TYPE_ID &&
    env.APPLE_SIGNER_CERT_BASE64 &&
    env.APPLE_SIGNER_KEY_BASE64 &&
    env.APPLE_WWDR_CERTIFICATE_BASE64
);

/** Indica si hay credenciales reales de Google Wallet configuradas (vs. modo mock de desarrollo). */
export const googleWalletConfigured = Boolean(
  env.GOOGLE_WALLET_ISSUER_ID && env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64
);
