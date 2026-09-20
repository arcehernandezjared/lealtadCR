import jwt from "jsonwebtoken";
import type { GoogleServiceAccountKey } from "./types.js";

/**
 * Genera el JWT firmado (RS256) que arma el enlace "Agregar a Google
 * Wallet". Referencia la LoyaltyObject POR ID (no la reenvia completa)
 * porque se asume que ya fue creada/actualizada via la REST API
 * (google-wallet-client.ts) antes de generar este link — asi el objeto
 * existe en Google desde el primer momento y se puede seguir actualizando
 * con PATCH aunque el cliente todavia no le haya dado "Guardar".
 */
export function buildSaveToGoogleWalletLink(
  serviceAccount: GoogleServiceAccountKey,
  objectId: string
): string {
  const payload = {
    iss: serviceAccount.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: {
      loyaltyObjects: [{ id: objectId }],
    },
  };

  const token = jwt.sign(payload, serviceAccount.private_key, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}
