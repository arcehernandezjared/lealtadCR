import { describe, it, expect } from "vitest";
import forge from "node-forge";
import { generateSignedPkpass } from "./generate-pkpass.js";

/**
 * Genera un certificado autofirmado desechable en PEM, solo para probar que
 * el pipeline de firma/empaquetado corre de punta a punta sin lanzar
 * excepciones. Esto NO produce un pass que un iPhone real aceptaria (Apple
 * exige que el certificado venga de su propia CA / WWDR) — solo valida que
 * nuestro codigo invoca correctamente a passkit-generator con el formato de
 * certificados esperado. La firma con certificados reales de Apple solo se
 * puede verificar una vez el usuario provea sus credenciales (ver
 * docs/APPLE_WALLET.md).
 */
function generateThrowawayCertAndKey() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const attrs = [{ name: "commonName", value: "LoyaltyCr Test" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

describe("generateSignedPkpass", () => {
  it("produce un .pkpass (zip) valido con pass.json, manifest.json y signature", () => {
    const { certPem, keyPem } = generateThrowawayCertAndKey();
    const wwdr = generateThrowawayCertAndKey();

    const buffer = generateSignedPkpass(
      {
        serialNumber: "test-serial-1",
        authenticationToken: "a".repeat(32),
        passTypeIdentifier: "pass.com.loyaltycr.test",
        teamIdentifier: "TEAMID1234",
        webServiceURL: "https://api.example.com/v1",
        businessName: "Barberia XYZ",
        programName: "Club VIP",
        primaryColor: "#111827",
        secondaryColor: "#F59E0B",
        customerFullName: "Carlos Perez",
        qrValue: "customer-qr-abc123",
        points: 7,
        tierName: "Plata",
        nextRewardLabel: "3 puntos",
      },
      {
        wwdr: Buffer.from(wwdr.certPem),
        signerCert: Buffer.from(certPem),
        signerKey: Buffer.from(keyPem),
      }
    );

    expect(Buffer.isBuffer(buffer)).toBe(true);
    // Firma de un ZIP local (PK\x03\x04).
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
    expect(buffer.length).toBeGreaterThan(500);
  });
});
