import http2 from "node:http2";
import jwt from "jsonwebtoken";

export interface ApnsCredentials {
  /** Contenido del archivo .p8 (llave privada EC, PEM), tal como lo genera Apple Developer. */
  key: string;
  /** Key ID que Apple asigna a la clave .p8. */
  keyId: string;
  teamId: string;
}

/**
 * Firma el JWT de autenticacion de APNs (algoritmo ES256, segun el
 * "Provider Authentication Token" documentado por Apple). Se firma una vez
 * por llamada por simplicidad; en volumen alto, Apple recomienda reutilizar
 * el mismo token hasta por 1 hora en vez de generar uno nuevo en cada
 * push — optimizacion pendiente si el volumen de pushes lo justifica.
 */
function signApnsProviderToken(credentials: ApnsCredentials): string {
  return jwt.sign({ iss: credentials.teamId, iat: Math.floor(Date.now() / 1000) }, credentials.key, {
    algorithm: "ES256",
    header: { alg: "ES256", kid: credentials.keyId },
  });
}

export interface SendPassUpdatePushOptions {
  /** Token del dispositivo que registro el pass (WalletDeviceRegistration.pushToken). */
  deviceToken: string;
  /** El Pass Type Identifier actua como "apns-topic" para pushes de Wallet. */
  passTypeIdentifier: string;
  credentials: ApnsCredentials;
  /** true = usa el entorno sandbox de APNs. Por defecto, produccion (asi es como Wallet distribuye passes normalmente). */
  useSandbox?: boolean;
}

/**
 * Envia el push "silencioso" que le dice al dispositivo que un pass cambio.
 * Este NO es un push con contenido (no hay alerta, sonido ni badge): Wallet
 * al recibirlo simplemente vuelve a pedir el pass actualizado al Web
 * Service (GET /v1/passes/...). Ver docs/APPLE_WALLET.md seccion 4.
 *
 * Implementado con el modulo nativo `node:http2` (la API de proveedor de
 * APNs es HTTP/2) en vez de una libreria de terceros, para no depender de
 * como esa libreria decida envolver la autenticacion — el protocolo esta
 * bien documentado por Apple y no amerita una dependencia extra.
 */
export function sendPassUpdatePush({
  deviceToken,
  passTypeIdentifier,
  credentials,
  useSandbox = false,
}: SendPassUpdatePushOptions): Promise<{ status: number; apnsId: string | null }> {
  const host = useSandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";
  const token = signApnsProviderToken(credentials);

  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${host}`);
    client.on("error", reject);

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${token}`,
      "apns-topic": passTypeIdentifier,
      "apns-push-type": "background",
      "content-type": "application/json",
    });

    let status = 0;
    let apnsId: string | null = null;
    let body = "";

    req.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
      apnsId = (headers["apns-id"] as string) ?? null;
    });
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      client.close();
      if (status >= 200 && status < 300) {
        resolve({ status, apnsId });
      } else {
        reject(new Error(`APNs respondio ${status}: ${body || "(sin cuerpo)"}`));
      }
    });
    req.on("error", (err) => {
      client.close();
      reject(err);
    });

    req.end(JSON.stringify({}));
  });
}
