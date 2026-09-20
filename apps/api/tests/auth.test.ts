import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

describe("POST /api/auth/register", () => {
  it("crea un negocio nuevo con su OWNER y devuelve un access token valido", async () => {
    const email = uniqueEmail("owner");
    const res = await request(app).post("/api/auth/register").send({
      firstName: "Ana",
      lastName: "Gomez",
      email,
      password: "SuperSegura123",
      businessName: "Cafe Prueba",
    });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.user.email).toBe(email);
    expect(res.body.business.name).toBe("Cafe Prueba");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rechaza un registro con contrasena debil", async () => {
    const res = await request(app).post("/api/auth/register").send({
      firstName: "Ana",
      lastName: "Gomez",
      email: uniqueEmail("weak"),
      password: "12345",
      businessName: "Cafe Prueba",
    });
    expect(res.status).toBe(400);
  });

  it("rechaza un registro con un correo ya existente", async () => {
    const email = uniqueEmail("dup");
    const payload = {
      firstName: "Ana",
      lastName: "Gomez",
      email,
      password: "SuperSegura123",
      businessName: "Cafe Prueba",
    };
    await request(app).post("/api/auth/register").send(payload);
    const res = await request(app).post("/api/auth/register").send(payload);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  it("autentica con credenciales correctas y rechaza incorrectas", async () => {
    const email = uniqueEmail("login");
    await request(app).post("/api/auth/register").send({
      firstName: "Luis",
      lastName: "Mora",
      email,
      password: "ClaveSegura123",
      businessName: "Negocio Login",
    });

    const good = await request(app).post("/api/auth/login").send({ email, password: "ClaveSegura123" });
    expect(good.status).toBe(200);
    expect(good.body.accessToken).toBeTypeOf("string");

    const bad = await request(app).post("/api/auth/login").send({ email, password: "incorrecta" });
    expect(bad.status).toBe(401);
  });

  it("no filtra si el correo existe o no (mismo error generico)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "no-existe@test.com", password: "cualquiera" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Correo o contrasena incorrectos");
  });
});

describe("GET /api/business/me", () => {
  it("requiere autenticacion", async () => {
    const res = await request(app).get("/api/business/me");
    expect(res.status).toBe(401);
  });

  it("devuelve el negocio del usuario autenticado", async () => {
    const email = uniqueEmail("me");
    const register = await request(app).post("/api/auth/register").send({
      firstName: "Sofia",
      lastName: "Chaves",
      email,
      password: "ClaveSegura123",
      businessName: "Negocio Me",
    });

    const res = await request(app)
      .get("/api/business/me")
      .set("Authorization", `Bearer ${register.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.business.name).toBe("Negocio Me");
    expect(res.body.role).toBe("OWNER");
  });
});
