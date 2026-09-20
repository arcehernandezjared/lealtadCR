import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

describe("Analytics avanzado", () => {
  it("devuelve top de recompensas, estadisticas de notificaciones y visitas por sucursal", async () => {
    const email = uniqueEmail("advanalytics");
    const register = await request(app).post("/api/auth/register").send({
      firstName: "Owner",
      lastName: "Analytics",
      email,
      password: "ClaveSegura123",
      businessName: `Negocio Analytics ${Date.now()}`,
    });
    const auth = { Authorization: `Bearer ${register.body.accessToken}` };

    const program = await request(app).post("/api/programs").set(auth).send({
      name: "Programa Analytics",
      type: "POINTS",
      primaryColor: "#111827",
      secondaryColor: "#F59E0B",
    });
    await request(app)
      .post(`/api/programs/${program.body.id}/rules`)
      .set(auth)
      .send({ name: "1 visita = 5 puntos", eventType: "visit", action: "add_points", value: 5 });
    const reward = await request(app)
      .post(`/api/programs/${program.body.id}/rewards`)
      .set(auth)
      .send({ name: "Premio Top", pointsCost: 5 });

    const customer = await request(app).post("/api/customers").set(auth).send({ firstName: "Cliente", lastName: "Top" });
    const visit = await request(app).post(`/api/customers/${customer.body.id}/visit`).set(auth).send({ programId: program.body.id });
    const code = visit.body.loyalty.unlockedRedemptions[0].code as string;
    await request(app).post("/api/rewards/redeem").set(auth).send({ code });

    const res = await request(app).get("/api/analytics/advanced?range=30d").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.topRewards[0].name).toBe("Premio Top");
    expect(res.body.topRewards[0].redemptions).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(res.body.branchVisits)).toBe(true);
    expect(typeof res.body.notificationStats).toBe("object");
  });
});
