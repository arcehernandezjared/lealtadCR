import type { AppleCertificates, ApnsCredentials, GoogleServiceAccountKey } from "@loyaltycr/wallet";
import { env, appleWalletConfigured, googleWalletConfigured } from "../../config/env.js";

/** Decodifica las credenciales de Apple Wallet desde las variables de entorno (base64). Ver docs/APPLE_WALLET.md. */
export function getAppleCertificates(): AppleCertificates {
  if (!appleWalletConfigured) {
    throw new Error("Apple Wallet no esta configurado (faltan variables de entorno APPLE_*)");
  }
  return {
    wwdr: Buffer.from(env.APPLE_WWDR_CERTIFICATE_BASE64!, "base64"),
    signerCert: Buffer.from(env.APPLE_SIGNER_CERT_BASE64!, "base64"),
    signerKey: Buffer.from(env.APPLE_SIGNER_KEY_BASE64!, "base64"),
    signerKeyPassphrase: env.APPLE_CERTIFICATE_PASSWORD,
  };
}

export function getApnsCredentials(): ApnsCredentials | null {
  if (!env.APPLE_APNS_KEY_BASE64 || !env.APPLE_APNS_KEY_ID || !env.APPLE_TEAM_ID) return null;
  return {
    key: Buffer.from(env.APPLE_APNS_KEY_BASE64, "base64").toString("utf8"),
    keyId: env.APPLE_APNS_KEY_ID,
    teamId: env.APPLE_TEAM_ID,
  };
}

export function getGoogleServiceAccount(): GoogleServiceAccountKey {
  if (!googleWalletConfigured) {
    throw new Error("Google Wallet no esta configurado (faltan variables de entorno GOOGLE_WALLET_*)");
  }
  const json = Buffer.from(env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64!, "base64").toString("utf8");
  return JSON.parse(json) as GoogleServiceAccountKey;
}

export { appleWalletConfigured, googleWalletConfigured };
