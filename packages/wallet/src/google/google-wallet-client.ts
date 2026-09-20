import { GoogleAuth } from "google-auth-library";
import type { GoogleServiceAccountKey } from "./types.js";

const WALLET_API_BASE = "https://walletobjects.googleapis.com/walletobjects/v1";
const SCOPES = ["https://www.googleapis.com/auth/wallet_object.issuer"];

/**
 * Cliente autenticado contra la Google Wallet REST API usando una Service
 * Account (ver docs/GOOGLE_WALLET.md para como obtenerla). Usa
 * `google-auth-library` (paquete oficial de Google) para el manejo de
 * tokens OAuth2, en vez de implementar el flujo a mano.
 *
 * Los metodos "upsert" existen porque la API de Google no tiene un
 * verbo unico de "crear o actualizar": hay que intentar `insert` (POST) y,
 * si ya existe (409), hacer `patch`. Esto es asi tanto para LoyaltyClass
 * como para LoyaltyObject.
 */
export class GoogleWalletClient {
  private readonly auth: GoogleAuth;

  constructor(serviceAccount: GoogleServiceAccountKey) {
    this.auth = new GoogleAuth({ credentials: serviceAccount, scopes: SCOPES });
  }

  private async request<T>(path: string, method: "GET" | "POST" | "PATCH", data?: unknown): Promise<T> {
    const client = await this.auth.getClient();
    const res = await client.request<T>({ url: `${WALLET_API_BASE}${path}`, method, data });
    return res.data;
  }

  async upsertLoyaltyClass(loyaltyClass: { id: string; [key: string]: unknown }) {
    try {
      return await this.request(`/loyaltyClass`, "POST", loyaltyClass);
    } catch (err) {
      if (isConflict(err)) {
        return this.request(`/loyaltyClass/${loyaltyClass.id}`, "PATCH", loyaltyClass);
      }
      throw err;
    }
  }

  async upsertLoyaltyObject(loyaltyObject: { id: string; [key: string]: unknown }) {
    try {
      return await this.request(`/loyaltyObject`, "POST", loyaltyObject);
    } catch (err) {
      if (isConflict(err)) {
        return this.request(`/loyaltyObject/${loyaltyObject.id}`, "PATCH", loyaltyObject);
      }
      throw err;
    }
  }

  /** Actualiza solo los campos que cambian (puntos, nivel) sin reenviar todo el objeto. */
  async patchLoyaltyObjectPoints(objectId: string, points: number, tierName: string | null, nextRewardLabel: string | null) {
    const textModulesData = [];
    if (tierName) textModulesData.push({ id: "tier", header: "NIVEL", body: tierName });
    if (nextRewardLabel) textModulesData.push({ id: "next_reward", header: "PROXIMA RECOMPENSA", body: nextRewardLabel });

    return this.request(`/loyaltyObject/${objectId}`, "PATCH", {
      loyaltyPoints: { label: "Puntos", balance: { string: String(points) } },
      textModulesData,
    });
  }
}

function isConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { status?: number } }).response?.status === "number" &&
    (err as { response: { status: number } }).response.status === 409
  );
}
