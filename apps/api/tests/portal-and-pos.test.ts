import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

async function setupBusinessWithCustomer() {
  const email = uniqueEmail("portal");
  const register = await request(app).post("/api/auth/register").send({
    firstName: "Owner",
    lastName: "Portal",
    email,
    password: "ClaveSegura123",
    businessName: `Negocio Portal ${Date.now()}`,
  });
  const token = register.body.accessToken as string;
  const auth = { Authorization: `Bearer ${token}` };

  const program = await request(app).post("/api/programs").set(auth).send({
    name: "Programa Portal",
    type: "POINTS",
    primaryColor: "#111827",
    secondaryColor: "#F59E0B",
  });
  await request(app)
    .post(`/api/programs/${program.body.id}/rules`)
    .set(auth)
    .send({ name: "1 visita = 1 punto", eventType: "visit", action: "add_points", value: 3 });
  await request(app).post(`/api/programs/${program.body.id}/tiers`).set(auth).send({ name: "Oro", minPoints: 3 });
  const reward = await request(app)
    .post(`/api/programs/${program.body.id}/rewards`)
    .set(auth)
    .send({ name: "Premio", pointsCost: 3 });

  const customer = await request(app).post("/api/customers").set(auth).send({ firstName: "Cliente", lastName: "Portal" });

  return { token, auth, programId: program.body.id as string, rewardId: reward.body.id as string, customer: customer.body };
}

describe("Interfaz de empleado: escanear cliente por QR", () => {
  let ctx: Awaited<ReturnType<typeof setupBusinessWithCustomer>>;

  beforeEach(async () => {
    ctx = await setupBusinessWithCustomer();
  });

  it("encuentra al cliente por su qrCode y devuelve su perfil completo", async () => {
    const res = await request(app).get(`/api/customers/by-qr/${ctx.customer.qrCode}`).set(ctx.auth);
    expect(res.status).toBe(200);
    expect(res.body.customer.id).toBe(ctx.customer.id);
  });

  it("devuelve 404 para un qrCode inexistente", async () => {
    const res = await request(app).get("/api/customers/by-qr/no-existe-123").set(ctx.auth);
    expect(res.status).toBe(404);
  });

  it("un negocio no puede resolver el qrCode de un cliente de otro negocio", async () => {
    const other = await setupBusinessWithCustomer();
    const res = await request(app).get(`/api/customers/by-qr/${ctx.customer.qrCode}`).set(other.auth);
    expect(res.status).toBe(404);
  });
});

describe("Portal del cliente", () => {
  let ctx: Awaited<ReturnType<typeof setupBusinessWithCustomer>>;

  beforeEach(async () => {
    ctx = await setupBusinessWithCustomer();
  });

  it("intercambia el qrCode por una sesion y devuelve el perfil del cliente", async () => {
    const session = await request(app).post("/api/portal/session").send({ qrCode: ctx.customer.qrCode });
    expect(session.status).toBe(200);
    expect(session.body.accessToken).toBeTypeOf("string");

    const portalToken = { Authorization: `Bearer ${session.body.accessToken}` };
    const me = await request(app).get("/api/portal/me").set(portalToken);
    expect(me.status).toBe(200);
    expect(me.body.customer.firstName).toBe("Cliente");
    expect(me.body.accounts).toHaveLength(1);
    expect(me.body.accounts[0].points).toBe(0);
  });

  it("rechaza un qrCode invalido", async () => {
    const res = await request(app).post("/api/portal/session").send({ qrCode: "codigo-que-no-existe" });
    expect(res.status).toBe(404);
  });

  it("el token del portal no sirve para endpoints de staff", async () => {
    const session = await request(app).post("/api/portal/session").send({ qrCode: ctx.customer.qrCode });
    const res = await request(app)
      .get("/api/business/me")
      .set("Authorization", `Bearer ${session.body.accessToken}`);
    expect(res.status).toBe(401);
  });

  it("refleja los puntos y recompensas desbloqueadas despues de una visita registrada por el empleado", async () => {
    await request(app).post(`/api/customers/${ctx.customer.id}/visit`).set(ctx.auth).send({ programId: ctx.programId });

    const session = await request(app).post("/api/portal/session").send({ qrCode: ctx.customer.qrCode });
    const portalToken = { Authorization: `Bearer ${session.body.accessToken}` };

    const me = await request(app).get("/api/portal/me").set(portalToken);
    expect(me.body.accounts[0].points).toBe(3);
    expect(me.body.accounts[0].currentTier.name).toBe("Oro");

    const rewards = await request(app).get("/api/portal/rewards").set(portalToken);
    const reward = rewards.body.rewards.find((r: { id: string }) => r.id === ctx.rewardId);
    expect(reward.status).toBe("PENDING");
    expect(reward.code).toMatch(/^LOYAL-/);

    const history = await request(app).get("/api/portal/history").set(portalToken);
    expect(history.body.visits).toHaveLength(1);
    expect(history.body.transactions).toHaveLength(1);
  });
});
