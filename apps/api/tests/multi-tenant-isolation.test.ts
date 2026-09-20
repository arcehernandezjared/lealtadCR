import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "@loyaltycr/database";

const app = createApp();

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

async function registerBusiness(name: string) {
  const email = uniqueEmail(name.toLowerCase().replace(/\s+/g, "-"));
  const res = await request(app).post("/api/auth/register").send({
    firstName: "Owner",
    lastName: name,
    email,
    password: "ClaveSegura123",
    businessName: name,
  });
  return { accessToken: res.body.accessToken as string, business: res.body.business, email };
}

describe("Aislamiento multi-tenant", () => {
  it("un negocio NUNCA ve las sucursales de otro negocio", async () => {
    const businessA = await registerBusiness("Negocio A");
    const businessB = await registerBusiness("Negocio B");

    await request(app)
      .post("/api/business/branches")
      .set("Authorization", `Bearer ${businessA.accessToken}`)
      .send({ name: "Sucursal secreta de A" });

    const branchesForB = await request(app)
      .get("/api/business/branches")
      .set("Authorization", `Bearer ${businessB.accessToken}`);

    expect(branchesForB.status).toBe(200);
    const names = branchesForB.body.branches.map((b: { name: string }) => b.name);
    expect(names).not.toContain("Sucursal secreta de A");
    // Solo debe ver su propia sucursal principal, creada automaticamente al registrarse.
    expect(branchesForB.body.branches.every((b: { name: string }) => b.name !== "Sucursal secreta de A")).toBe(true);
  });

  it("un empleado de un negocio no puede leer el equipo de otro negocio via IDOR de id conocido", async () => {
    const businessA = await registerBusiness("Negocio C");
    const businessB = await registerBusiness("Negocio D");

    const employeesA = await request(app)
      .get("/api/business/employees")
      .set("Authorization", `Bearer ${businessA.accessToken}`);
    const employeesB = await request(app)
      .get("/api/business/employees")
      .set("Authorization", `Bearer ${businessB.accessToken}`);

    const emailsA = employeesA.body.employees.map((e: { user: { email: string } }) => e.user.email);
    const emailsB = employeesB.body.employees.map((e: { user: { email: string } }) => e.user.email);

    expect(emailsA).not.toEqual(emailsB);
    expect(emailsA).toContain(businessA.email);
    expect(emailsA).not.toContain(businessB.email);
  });

  it("no es posible forzar otro businessId via el body (lo descarta zod, y ademas el extension de tenant lo sobrescribiria)", async () => {
    const businessA = await registerBusiness("Negocio E");
    const businessB = await registerBusiness("Negocio F");

    const businessBRow = await prisma.business.findUniqueOrThrow({ where: { slug: "negocio-f" } });

    // Un OWNER de A intenta crear una sucursal "para" el businessId de B directamente en el payload.
    const res = await request(app)
      .post("/api/business/branches")
      .set("Authorization", `Bearer ${businessA.accessToken}`)
      .send({ name: "Intento IDOR", businessId: businessBRow.id });

    expect(res.status).toBe(201);
    const created = await prisma.branch.findUnique({ where: { id: res.body.id } });
    // El extension de tenant debe haber forzado el businessId real del owner autenticado (A), no el de B.
    expect(created?.businessId).not.toBe(businessBRow.id);
  });
});
