import { describe, it, expect } from "vitest";
import { generateRedemptionCode } from "./codes.js";

describe("generateRedemptionCode", () => {
  it("tiene el formato LOYAL-XXXXXX sin caracteres ambiguos", () => {
    const code = generateRedemptionCode();
    expect(code).toMatch(/^LOYAL-[A-HJ-NP-Z2-9]{6}$/);
  });

  it("genera codigos distintos en llamadas consecutivas", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRedemptionCode()));
    expect(codes.size).toBeGreaterThan(15);
  });
});
