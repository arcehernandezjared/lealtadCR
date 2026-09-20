import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

async function setupBusinessWithProgram() {
  const email = uniqueEmail("loyalty");
  const register = await request(app).post("/api/auth/register").send({
    firstName: "Owner",
    lastName: "Loyalty",
    email,
    password: "ClaveSegura123",
    businessName: `Negocio Loyalty ${Date.now()}`,
  });
  const token = register.body.accessToken as string;
  const auth = (path: string) => ({ Authorization: `Bearer ${token}` });

  const program = await request(app)
    .post("/api/programs")
    .set(auth("/api/programs"))
    .send({ name: "Programa Test", type: "POINTS", primaryColor: "#111827", secondaryColor: "#FFFFFF" });

  await request(app)
    .post(`/api/programs/${program.body.id}/rules`)
    .set(auth("rules"))
    .send({ name: "1 visita = 1 punto", eventType: "visit", action: "add_points", value: 1 });

  await request(app)
    .post(`/api/programs/${program.body.id}/rules`)
    .set(auth("rules"))
    .send({
      name: "Compra >= 10000 = 5 puntos",
      eventType: "purchase",
      action: "add_points",
      value: 5,
      conditions: { minAmount: 10000 },
    });

  await request(app)
    .post(`/api/programs/${program.body.id}/tiers`)
    .set(auth("tiers"))
    .send({ name: "Plata", minPoints: 2 });

  const reward = await request(app)
    .post(`/api/programs/${program.body.id}/rewards`)
    .set(auth("rewards"))
    .send({ name: "Recompensa 2 puntos", pointsCost: 2 });

  const customer = await request(app)
    .post("/api/customers")
    .set(auth("customers"))
    .send({ firstName: "Cliente", lastName: "Prueba" });

  return { token, programId: program.body.id as string, rewardId: reward.body.id as string, customerId: customer.body.id as string };
}

describe("Motor de reglas de lealtad", () => {
  let ctx: Awaited<ReturnType<typeof setupBusinessWithProgram>>;

  beforeEach(async () => {
    ctx = await setupBusinessWithProgram();
  });

  it("registrar una visita aplica la regla y suma 1 punto", async () => {
    const res = await request(app)
      .post(`/api/customers/${ctx.customerId}/visit`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ programId: ctx.programId });

    expect(res.status).toBe(201);
    expect(res.body.loyalty.account.points).toBe(1);
  });

  it("dos visitas desbloquean el nivel Plata (minPoints=2) y la recompensa de 2 puntos", async () => {
    await request(app)
      .post(`/api/customers/${ctx.customerId}/visit`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ programId: ctx.programId });

    const second = await request(app)
      .post(`/api/customers/${ctx.customerId}/visit`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ programId: ctx.programId });

    expect(second.body.loyalty.account.points).toBe(2);
    expect(second.body.loyalty.tierChanged).toBe(true);
    expect(second.body.loyalty.unlockedRedemptions).toHaveLength(1);
    expect(second.body.loyalty.unlockedRedemptions[0].code).toMatch(/^LOYAL-/);
  });

  it("una compra por debajo del minAmount no otorga puntos, y una por encima si", async () => {
    const below = await request(app)
      .post(`/api/customers/${ctx.customerId}/purchase`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ programId: ctx.programId, amount: 5000 });
    expect(below.body.loyalty).toBeNull();

    const above = await request(app)
      .post(`/api/customers/${ctx.customerId}/purchase`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ programId: ctx.programId, amount: 15000 });
    expect(above.body.loyalty.account.points).toBe(5);
  });

  it("el ciclo completo de desbloqueo + canje de recompensa funciona", async () => {
    await request(app)
      .post(`/api/customers/${ctx.customerId}/visit`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ programId: ctx.programId });
    const second = await request(app)
      .post(`/api/customers/${ctx.customerId}/visit`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ programId: ctx.programId });

    const code = second.body.loyalty.unlockedRedemptions[0].code as string;

    const redeem = await request(app)
      .post("/api/rewards/redeem")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ code });

    expect(redeem.status).toBe(200);
    expect(redeem.body.status).toBe("REDEEMED");

    const redeemAgain = await request(app)
      .post("/api/rewards/redeem")
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ code });
    expect(redeemAgain.status).toBe(409);
  });

  it("ajuste manual de puntos suma/resta correctamente y queda en el ledger", async () => {
    const add = await request(app)
      .post(`/api/customers/${ctx.customerId}/points`)
      .set("Authorization", `Bearer ${ctx.token}`)
      .send({ programId: ctx.programId, points: 10, reason: "Ajuste de prueba" });
    expect(add.body.account.points).toBe(10);

    const profile = await request(app)
      .get(`/api/customers/${ctx.customerId}`)
      .set("Authorization", `Bearer ${ctx.token}`);
    expect(profile.body.transactions).toHaveLength(1);
    expect(profile.body.transactions[0].reason).toBe("Ajuste de prueba");
  });
});
