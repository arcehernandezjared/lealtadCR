import { PKPass } from "passkit-generator";
import { buildLoyaltyPassJson, type LoyaltyPassData } from "./build-pass-json.js";
import { solidColorPng, hexToRgbTuple } from "./solid-color-png.js";

export interface AppleCertificates {
  /** Certificado WWDR (Apple Worldwide Developer Relations), PEM o DER. */
  wwdr: Buffer;
  /** Certificado del Pass Type ID, exportado del .p12. */
  signerCert: Buffer;
  /** Llave privada del Pass Type ID, exportada del .p12. */
  signerKey: Buffer;
  signerKeyPassphrase?: string;
}

/**
 * Genera un .pkpass firmado y listo para distribuir. Usa `passkit-generator`
 * (en vez de reimplementar el empaquetado/firma PKCS#7 a mano) porque
 * implementa correctamente el formato documentado por Apple; ver
 * docs/APPLE_WALLET.md para de donde salen los certificados.
 *
 * El icono/logo se generan como PNG de color solido a partir del color de
 * marca del programa (ver solid-color-png.ts) mientras el negocio no suba
 * su propio logo — Apple exige al menos icon.png para que el pass sea valido.
 */
export function generateSignedPkpass(data: LoyaltyPassData, certificates: AppleCertificates): Buffer {
  const passJson = buildLoyaltyPassJson(data);
  const [r, g, b] = hexToRgbTuple(data.primaryColor);

  const buffers = {
    "pass.json": Buffer.from(JSON.stringify(passJson)),
    "icon.png": solidColorPng(29, 29, [r, g, b]),
    "icon@2x.png": solidColorPng(58, 58, [r, g, b]),
    "icon@3x.png": solidColorPng(87, 87, [r, g, b]),
    "logo.png": solidColorPng(160, 50, [r, g, b]),
    "logo@2x.png": solidColorPng(320, 100, [r, g, b]),
  };

  const pass = new PKPass(buffers, {
    wwdr: certificates.wwdr,
    signerCert: certificates.signerCert,
    signerKey: certificates.signerKey,
    signerKeyPassphrase: certificates.signerKeyPassphrase,
  });

  return pass.getAsBuffer();
}
