import { describe, it, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { buildSaveToGoogleWalletLink } from "./save-link.js";

describe("buildSaveToGoogleWalletLink", () => {
  it("genera un JWT RS256 valido con la forma que Google Wallet espera", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const link = buildSaveToGoogleWalletLink(
      { client_email: "issuer@test-project.iam.gserviceaccount.com", private_key: privateKey },
      "3388000000012345678.customer-abc"
    );

    expect(link).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
    const token = link.replace("https://pay.google.com/gp/v/save/", "");

    const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as Record<string, unknown>;
    expect(decoded.iss).toBe("issuer@test-project.iam.gserviceaccount.com");
    expect(decoded.aud).toBe("google");
    expect(decoded.typ).toBe("savetowallet");
    expect((decoded.payload as { loyaltyObjects: Array<{ id: string }> }).loyaltyObjects[0]?.id).toBe(
      "3388000000012345678.customer-abc"
    );
  });

  it("rechaza la verificacion con una llave publica distinta (la firma es real, no simulada)", () => {
    const pairA = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const pairB = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const link = buildSaveToGoogleWalletLink({ client_email: "a@b.com", private_key: pairA.privateKey }, "id.1");
    const token = link.replace("https://pay.google.com/gp/v/save/", "");

    expect(() => jwt.verify(token, pairB.publicKey, { algorithms: ["RS256"] })).toThrow();
  });
});
