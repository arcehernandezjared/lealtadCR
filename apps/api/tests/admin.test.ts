import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { prisma } from "@loyaltycr/database";
import { hashPassword } from "@loyaltycr/shared";
import { createApp } from "../src/app.js";

const app = createApp();

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

async function createSuperAdmin() {
  const email = uniqueEmail("superadmin");
  const passwordHash = await hashPassword("SuperAdmin1234!");
  await prisma.user.create({
    data: { email, passwordHash, firstName: "Super", lastName: "Admin", globalRole: "SUPER_ADMIN", emailVerifiedAt: new Date() },
  });
  const login = await request(app).post("/api/auth/login").send({ email, password: "SuperAdmin1234!" });
  return { Authorization: `Bearer ${login.body.accessToken}` };
}

describe("Panel de SUPER_ADMIN", () => {
  it("un staff normal (OWNER) no puede acceder a rutas de admin", async () => {
    const email = uniqueEmail("notadmin");
    const register = await request(app).post("/api/auth/register").send({
      firstName: "Owner",
      lastName: "Normal",
      email,
      password: "ClaveSegura123",
      businessName: `Negocio Normal ${Date.now()}`,
    });
    const res = await request(app)
      .get("/api/admin/businesses")
      .set("Authorization", `Bearer ${register.body.accessToken}`);
    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN ve todos los negocios de la plataforma, no solo el suyo (no tiene ninguno)", async () => {
    const adminAuth = await createSuperAdmin();
    const email = uniqueEmail("businessforadmin");
    await request(app).post("/api/auth/register").send({
      firstName: "Owner",
      lastName: "Visible",
      email,
      password: "ClaveSegura123",
      businessName: `Negocio Visible Admin ${Date.now()}`,
    });

    const res = await request(app).get("/api/admin/businesses?pageSize=100").set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it("SUPER_ADMIN puede suspender y reactivar un negocio", async () => {
    const adminAuth = await createSuperAdmin();
    const ownerEmail = uniqueEmail("suspendme");
    const register = await request(app).post("/api/auth/register").send({
      firstName: "Owner",
      lastName: "Suspendible",
      email: ownerEmail,
      password: "ClaveSegura123",
      businessName: `Negocio Suspendible ${Date.now()}`,
    });

    const businesses = await request(app).get("/api/admin/businesses?pageSize=200").set(adminAuth);
    const target = businesses.body.items.find((b: { slug: string }) => b.slug === register.body.business.slug);
    expect(target).toBeDefined();

    const suspend = await request(app).patch(`/api/admin/businesses/${target.id}/status`).set(adminAuth).send({ status: "SUSPENDED" });
    expect(suspend.status).toBe(200);
    expect(suspend.body.status).toBe("SUSPENDED");

    const reactivate = await request(app).patch(`/api/admin/businesses/${target.id}/status`).set(adminAuth).send({ status: "ACTIVE" });
    expect(reactivate.body.status).toBe("ACTIVE");
  });

  it("GET /api/admin/stats devuelve estadisticas globales coherentes", async () => {
    const adminAuth = await createSuperAdmin();
    const res = await request(app).get("/api/admin/stats").set(adminAuth);
    expect(res.status).toBe(200);
    expect(typeof res.body.totalBusinesses).toBe("number");
    expect(res.body.totalBusinesses).toBeGreaterThanOrEqual(0);
  });
});
