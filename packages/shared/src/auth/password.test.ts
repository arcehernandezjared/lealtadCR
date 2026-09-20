import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("genera un hash distinto del texto plano y lo verifica correctamente", async () => {
    const hash = await hashPassword("ClaveSegura123");
    expect(hash).not.toBe("ClaveSegura123");
    expect(await verifyPassword("ClaveSegura123", hash)).toBe(true);
    expect(await verifyPassword("otra-clave", hash)).toBe(false);
  });

  it("genera hashes distintos para la misma contrasena (salt aleatorio)", async () => {
    const hash1 = await hashPassword("ClaveSegura123");
    const hash2 = await hashPassword("ClaveSegura123");
    expect(hash1).not.toBe(hash2);
  });
});
