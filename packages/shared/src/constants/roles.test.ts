import { describe, it, expect } from "vitest";
import { employeeRoleAtLeast } from "./roles.js";

describe("employeeRoleAtLeast", () => {
  it("OWNER cumple cualquier requisito minimo", () => {
    expect(employeeRoleAtLeast("OWNER", "OWNER")).toBe(true);
    expect(employeeRoleAtLeast("OWNER", "MANAGER")).toBe(true);
    expect(employeeRoleAtLeast("OWNER", "EMPLOYEE")).toBe(true);
  });

  it("EMPLOYEE no cumple requisitos de MANAGER u OWNER", () => {
    expect(employeeRoleAtLeast("EMPLOYEE", "MANAGER")).toBe(false);
    expect(employeeRoleAtLeast("EMPLOYEE", "OWNER")).toBe(false);
    expect(employeeRoleAtLeast("EMPLOYEE", "EMPLOYEE")).toBe(true);
  });

  it("MANAGER cumple MANAGER y EMPLOYEE pero no OWNER", () => {
    expect(employeeRoleAtLeast("MANAGER", "EMPLOYEE")).toBe(true);
    expect(employeeRoleAtLeast("MANAGER", "MANAGER")).toBe(true);
    expect(employeeRoleAtLeast("MANAGER", "OWNER")).toBe(false);
  });
});
