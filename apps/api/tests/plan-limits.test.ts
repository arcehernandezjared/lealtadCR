import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "@loyaltycr/database";
import { createApp } from "../src/app.js";

const app = createApp();

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

async function setupBusiness() {
  const email = uniqueEmail("planlimit");
  const register = await request(app).post("/api/auth/register").send({
    firstName: "Owner",
    lastName: "PlanLimit",
    email,
    password: "ClaveSegura123",
    businessName: `Negocio PlanLimit ${Date.now()}`,
  });
  const token = register.body.accessToken as string;
  return { auth: { Authorization: `Bearer ${token}` }, businessPublicId: register.body.business.publicId as string };
}

/** Adjunta un plan de prueba con un limite muy bajo al negocio, para probar el enforcement sin crear 300 clientes. */
async function attachTinyPlan(businessPublicId: string, limits: Record<string, number | null>) {
  const business = await prisma.business.findUniqueOrThrow({ where: { publicId: businessPublicId } });
  const plan = await prisma.plan.upsert({
    where: { name: "TEST_TINY" },
    update: { limits },
    create: { name: "TEST_TINY", priceMonthly: 0, currency: "USD", limits, features: [] },
  });
  await prisma.subscription.update({ where: { businessId: business.id }, data: { planId: plan.id } });
}

describe("Limites de plan", () => {
  let ctx: Awaited<ReturnType<typeof setupBusiness>>;

  beforeEach(async () => {
    ctx = await setupBusiness();
  });

  it("bloquea crear un cliente adicional al alcanzar maxCustomers, con codigo PLAN_LIMIT_REACHED", async () => {
    await attachTinyPlan(ctx.businessPublicId, { maxCustomers: 1 });

    const first = await request(app).post("/api/customers").set(ctx.auth).send({ firstName: "Uno", lastName: "Cliente" });
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/customers").set(ctx.auth).send({ firstName: "Dos", lastName: "Cliente" });
    expect(second.status).toBe(402);
    expect(second.body.error.code).toBe("PLAN_LIMIT_REACHED");
    expect(second.body.error.details.resource).toBe("customers");
  });

  it("un limite en null significa sin limite", async () => {
    await attachTinyPlan(ctx.businessPublicId, { maxCustomers: null });

    for (let i = 0; i < 3; i++) {
      const res = await request(app).post("/api/customers").set(ctx.auth).send({ firstName: `C${i}`, lastName: "Cliente" });
      expect(res.status).toBe(201);
    }
  });

  it("bloquea crear un programa adicional al alcanzar maxPrograms", async () => {
    await attachTinyPlan(ctx.businessPublicId, { maxPrograms: 1 });

    const first = await request(app)
      .post("/api/programs")
      .set(ctx.auth)
      .send({ name: "Programa 1", type: "POINTS", primaryColor: "#111827", secondaryColor: "#F59E0B" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/programs")
      .set(ctx.auth)
      .send({ name: "Programa 2", type: "POINTS", primaryColor: "#111827", secondaryColor: "#F59E0B" });
    expect(second.status).toBe(402);
  });

  it("GET /api/business/usage refleja el consumo actual contra el limite del plan", async () => {
    await attachTinyPlan(ctx.businessPublicId, { maxCustomers: 5, maxBranches: 2, maxEmployees: 3, maxPrograms: 1, maxCampaignsPerMonth: 2, maxAutomations: 1 });
    await request(app).post("/api/customers").set(ctx.auth).send({ firstName: "Uno", lastName: "Cliente" });

    const res = await request(app).get("/api/business/usage").set(ctx.auth);
    expect(res.status).toBe(200);
    const customersUsage = res.body.usage.find((u: { resource: string }) => u.resource === "customers");
    expect(customersUsage.current).toBe(1);
    expect(customersUsage.limit).toBe(5);
  });
});
