import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { waitFor } from "./helpers/wait-for.js";

const app = createApp();

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

async function setupBusinessWithProgram() {
  const email = uniqueEmail("notif");
  const register = await request(app).post("/api/auth/register").send({
    firstName: "Owner",
    lastName: "Notif",
    email,
    password: "ClaveSegura123",
    businessName: `Negocio Notif ${Date.now()}`,
  });
  const token = register.body.accessToken as string;
  const auth = { Authorization: `Bearer ${token}` };

  const program = await request(app).post("/api/programs").set(auth).send({
    name: "Programa Notif",
    type: "POINTS",
    primaryColor: "#111827",
    secondaryColor: "#F59E0B",
  });

  await request(app)
    .post(`/api/programs/${program.body.id}/rules`)
    .set(auth)
    .send({ name: "1 visita = 3 puntos", eventType: "visit", action: "add_points", value: 3 });

  await request(app).post(`/api/programs/${program.body.id}/tiers`).set(auth).send({ name: "Oro", minPoints: 3 });

  const reward = await request(app)
    .post(`/api/programs/${program.body.id}/rewards`)
    .set(auth)
    .send({ name: "Premio", pointsCost: 3 });

  const customer = await request(app)
    .post("/api/customers")
    .set(auth)
    .send({ firstName: "Cliente", lastName: "ConCorreo", email: uniqueEmail("customer") });

  return { token, auth, programId: program.body.id as string, rewardId: reward.body.id as string, customer: customer.body };
}

async function registerVisit(auth: Record<string, string>, customerId: string, programId: string) {
  return request(app).post(`/api/customers/${customerId}/visit`).set(auth).send({ programId });
}

describe("Notificaciones automaticas del motor de lealtad", () => {
  let ctx: Awaited<ReturnType<typeof setupBusinessWithProgram>>;

  beforeEach(async () => {
    ctx = await setupBusinessWithProgram();
  });

  async function findNotification(auth: Record<string, string>, predicate: (n: any) => boolean) {
    return waitFor(async () => {
      const res = await request(app).get("/api/notifications").set(auth);
      const found = res.body.notifications.find(predicate);
      // Ignora el estado PENDING transitorio: createAndDispatch primero
      // crea la fila (PENDING) y recien despues de despachar la actualiza a
      // SENT/FAILED, asi que hay una ventana corta donde ya existe pero
      // todavia no se resolvio.
      return found && found.status !== "PENDING" ? found : null;
    });
  }

  it("una visita que suma puntos genera una notificacion de tipo points_added enviada por EMAIL", async () => {
    await registerVisit(ctx.auth, ctx.customer.id, ctx.programId);

    const notif = await findNotification(ctx.auth, (n) => n.type === "points_added");
    expect(notif.channel).toBe("EMAIL");
    expect(notif.status).toBe("SENT");
  });

  it("cruzar el umbral de nivel genera una notificacion tier_changed", async () => {
    await registerVisit(ctx.auth, ctx.customer.id, ctx.programId); // 3 pts -> Oro

    const notif = await findNotification(ctx.auth, (n) => n.type === "tier_changed");
    expect(notif.body).toContain("Oro");
  });

  it("desbloquear una recompensa genera una notificacion reward_unlocked", async () => {
    await registerVisit(ctx.auth, ctx.customer.id, ctx.programId); // 3 pts, cruza el costo de la recompensa (3 pts)

    const notif = await findNotification(ctx.auth, (n) => n.type === "reward_unlocked");
    expect(notif.body).toContain("Premio");
  });
});

describe("Automatizaciones por evento", () => {
  let ctx: Awaited<ReturnType<typeof setupBusinessWithProgram>>;

  beforeEach(async () => {
    ctx = await setupBusinessWithProgram();
  });

  it("points_threshold_reached ejecuta sus acciones una sola vez aunque se crucen visitas repetidas", async () => {
    await request(app)
      .post("/api/automations")
      .set(ctx.auth)
      .send({
        name: "Bono al llegar a 3 puntos",
        triggerType: "points_threshold_reached",
        conditions: { points: 3 },
        actions: [{ type: "add_points", params: { programId: ctx.programId, points: 10, reason: "Bono automatizacion" } }],
      });

    await registerVisit(ctx.auth, ctx.customer.id, ctx.programId); // 3 pts -> dispara automatizacion (+10 = 13)

    // Espera a que la automatizacion (fire-and-forget) aplique el bono antes
    // de la segunda visita, para que el resultado sea deterministico.
    await waitFor(async () => {
      const profile = await request(app).get(`/api/customers/${ctx.customer.id}`).set(ctx.auth);
      return profile.body.loyaltyAccounts[0].points === 13 ? true : null;
    }, 5000);

    await registerVisit(ctx.auth, ctx.customer.id, ctx.programId); // 16 pts, ya no deberia volver a disparar

    const profile = await request(app).get(`/api/customers/${ctx.customer.id}`).set(ctx.auth);
    const account = profile.body.loyaltyAccounts[0];
    // 3 (regla) + 10 (automatizacion, una vez) + 3 (segunda visita) = 16, NO 26
    expect(account.points).toBe(16);
  });

  it("tier_reached ejecuta send_notification al llegar al nivel configurado", async () => {
    const tiers = await request(app).get(`/api/programs/${ctx.programId}`).set(ctx.auth);
    const oroTierId = tiers.body.tiers.find((t: { name: string }) => t.name === "Oro").id;

    await request(app)
      .post("/api/automations")
      .set(ctx.auth)
      .send({
        name: "Bienvenida a Oro",
        triggerType: "tier_reached",
        conditions: { tierId: oroTierId },
        actions: [{ type: "send_notification", params: { title: "Bienvenido a Oro", body: "Disfruta tus beneficios VIP" } }],
      });

    await registerVisit(ctx.auth, ctx.customer.id, ctx.programId); // 3 pts -> Oro

    const notif = await waitFor(async () => {
      const res = await request(app).get("/api/notifications").set(ctx.auth);
      return res.body.notifications.find((n: { title: string }) => n.title === "Bienvenido a Oro") ?? null;
    });
    expect(notif).toBeDefined();
  });

  it("una automatizacion inactiva no se ejecuta", async () => {
    const created = await request(app)
      .post("/api/automations")
      .set(ctx.auth)
      .send({
        name: "Desactivada",
        triggerType: "points_threshold_reached",
        conditions: { points: 3 },
        actions: [{ type: "add_points", params: { programId: ctx.programId, points: 100, reason: "no deberia aplicar" } }],
        isActive: false,
      });
    expect(created.status).toBe(201);

    await registerVisit(ctx.auth, ctx.customer.id, ctx.programId);

    const profile = await request(app).get(`/api/customers/${ctx.customer.id}`).set(ctx.auth);
    expect(profile.body.loyaltyAccounts[0].points).toBe(3);
  });
});

describe("Campanas", () => {
  let ctx: Awaited<ReturnType<typeof setupBusinessWithProgram>>;

  beforeEach(async () => {
    ctx = await setupBusinessWithProgram();
  });

  it("crea y envia una campana a todos los clientes por EMAIL", async () => {
    const campaign = await request(app).post("/api/campaigns").set(ctx.auth).send({
      title: "Promo de la semana",
      message: "20% de descuento este fin de semana",
      segment: { type: "all" },
      channels: ["EMAIL"],
    });
    expect(campaign.status).toBe(201);
    expect(campaign.body.status).toBe("DRAFT");

    const sent = await request(app).post(`/api/campaigns/${campaign.body.id}/send`).set(ctx.auth);
    expect(sent.status).toBe(200);
    expect(sent.body.status).toBe("SENT");

    const notifications = await request(app).get("/api/notifications").set(ctx.auth);
    const campaignNotif = notifications.body.notifications.find(
      (n: { campaignId: string | null }) => n.campaignId === campaign.body.id
    );
    expect(campaignNotif).toBeDefined();
    expect(campaignNotif.title).toBe("Promo de la semana");
  });

  it("no se puede enviar dos veces la misma campana", async () => {
    const campaign = await request(app).post("/api/campaigns").set(ctx.auth).send({
      title: "Unica",
      message: "mensaje",
      segment: { type: "all" },
      channels: ["EMAIL"],
    });
    await request(app).post(`/api/campaigns/${campaign.body.id}/send`).set(ctx.auth);
    const secondSend = await request(app).post(`/api/campaigns/${campaign.body.id}/send`).set(ctx.auth);
    expect(secondSend.status).toBe(409);
  });

  it("el segmento min_points solo alcanza a clientes con suficientes puntos", async () => {
    const otherCustomer = await request(app)
      .post("/api/customers")
      .set(ctx.auth)
      .send({ firstName: "Sin", lastName: "Puntos", email: uniqueEmail("sinpuntos") });

    await registerVisit(ctx.auth, ctx.customer.id, ctx.programId); // ctx.customer llega a 3 pts

    const campaign = await request(app)
      .post("/api/campaigns")
      .set(ctx.auth)
      .send({
        title: "Solo VIP",
        message: "Oferta exclusiva",
        segment: { type: "min_points", programId: ctx.programId, points: 3 },
        channels: ["EMAIL"],
      });
    await request(app).post(`/api/campaigns/${campaign.body.id}/send`).set(ctx.auth);

    const notifications = await request(app).get("/api/notifications").set(ctx.auth);
    const forQualified = notifications.body.notifications.filter(
      (n: { campaignId: string | null; customerId: string | null }) =>
        n.campaignId === campaign.body.id && n.customerId === ctx.customer.id
    );
    const forOther = notifications.body.notifications.filter(
      (n: { campaignId: string | null; customerId: string | null }) =>
        n.campaignId === campaign.body.id && n.customerId === otherCustomer.body.id
    );
    expect(forQualified.length).toBeGreaterThan(0);
    expect(forOther.length).toBe(0);
  });
});

describe("Suscripcion Web Push del portal", () => {
  it("un cliente puede registrar y borrar su suscripcion", async () => {
    const ctx = await setupBusinessWithProgram();
    const session = await request(app).post("/api/portal/session").send({ qrCode: ctx.customer.qrCode });
    const portalAuth = { Authorization: `Bearer ${session.body.accessToken}` };

    const subscribe = await request(app)
      .post("/api/portal/push-subscription")
      .set(portalAuth)
      .send({
        endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-unico",
        keys: { p256dh: "test-p256dh-key-value", auth: "test-auth-value" },
      });
    expect(subscribe.status).toBe(201);

    const unsubscribe = await request(app)
      .delete("/api/portal/push-subscription")
      .set(portalAuth)
      .send({ endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-unico" });
    expect(unsubscribe.status).toBe(204);
  });
});
