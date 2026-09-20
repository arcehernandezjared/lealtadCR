import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "@loyaltycr/database";
import { createApp } from "../src/app.js";

const app = createApp();

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`;
}

async function setupBusinessWithCustomer() {
  const email = uniqueEmail("wallet");
  const register = await request(app).post("/api/auth/register").send({
    firstName: "Owner",
    lastName: "Wallet",
    email,
    password: "ClaveSegura123",
    businessName: `Negocio Wallet ${Date.now()}`,
  });
  const token = register.body.accessToken as string;
  const auth = { Authorization: `Bearer ${token}` };

  const program = await request(app).post("/api/programs").set(auth).send({
    name: "Programa Wallet",
    type: "POINTS",
    primaryColor: "#111827",
    secondaryColor: "#F59E0B",
  });
  const customer = await request(app).post("/api/customers").set(auth).send({ firstName: "Cliente", lastName: "Wallet" });

  const session = await request(app).post("/api/portal/session").send({ qrCode: customer.body.qrCode });
  const portalAuth = { Authorization: `Bearer ${session.body.accessToken}` };

  return { token, auth, programId: program.body.id as string, customer: customer.body, portalAuth };
}

describe("Emision de wallet passes (sin credenciales configuradas en test)", () => {
  let ctx: Awaited<ReturnType<typeof setupBusinessWithCustomer>>;

  beforeEach(async () => {
    ctx = await setupBusinessWithCustomer();
  });

  it("Apple Wallet responde con un error claro y codigo APPLE_WALLET_NOT_CONFIGURED", async () => {
    const res = await request(app).get(`/api/portal/wallet/apple/${ctx.programId}`).set(ctx.portalAuth);
    expect(res.status).toBe(400);
    expect(res.body.error.details?.code ?? res.body.error.code).toContain("APPLE_WALLET_NOT_CONFIGURED");
  });

  it("Google Wallet responde con un error claro y codigo GOOGLE_WALLET_NOT_CONFIGURED", async () => {
    const res = await request(app).get(`/api/portal/wallet/google/${ctx.programId}`).set(ctx.portalAuth);
    expect(res.status).toBe(400);
    expect(res.body.error.details?.code ?? res.body.error.code).toContain("GOOGLE_WALLET_NOT_CONFIGURED");
  });

  it("no se puede pedir un pass de un programa que no es del negocio del cliente (404, no filtra si Wallet esta configurado)", async () => {
    const other = await setupBusinessWithCustomer();
    const res = await request(app).get(`/api/portal/wallet/apple/${other.programId}`).set(ctx.portalAuth);
    expect(res.status).toBe(404);
  });
});

describe("Apple Wallet Web Service (protocolo de dispositivo, sin certificados)", () => {
  let ctx: Awaited<ReturnType<typeof setupBusinessWithCustomer>>;
  let walletPass: { id: string; serialNumber: string; authToken: string };

  beforeEach(async () => {
    ctx = await setupBusinessWithCustomer();
    // Se crea directo en DB (no via issueApplePass, que requiere certificados reales)
    // para poder probar el protocolo del Web Service en aislamiento.
    walletPass = await prisma.walletPass.create({
      data: {
        customerId: ctx.customer.id,
        programId: ctx.programId,
        platform: "APPLE",
        serialNumber: `test-serial-${Date.now()}`,
        authToken: "test-auth-token-1234567890",
        passTypeIdentifier: "pass.com.loyaltycr.test",
      },
    });
  });

  it("registra un dispositivo con el authToken correcto", async () => {
    const res = await request(app)
      .post(
        `/v1/devices/device-abc/registrations/${walletPass.passTypeIdentifier}/${walletPass.serialNumber}`
      )
      .set("Authorization", `ApplePass ${walletPass.authToken}`)
      .send({ pushToken: "push-token-xyz" });

    expect(res.status).toBe(201);

    const registration = await prisma.walletDeviceRegistration.findFirst({ where: { walletPassId: walletPass.id } });
    expect(registration?.pushToken).toBe("push-token-xyz");
  });

  it("rechaza el registro con un authToken incorrecto", async () => {
    const res = await request(app)
      .post(`/v1/devices/device-abc/registrations/${walletPass.passTypeIdentifier}/${walletPass.serialNumber}`)
      .set("Authorization", "ApplePass token-incorrecto")
      .send({ pushToken: "push-token-xyz" });

    expect(res.status).toBe(401);
  });

  it("da de baja un dispositivo registrado", async () => {
    await request(app)
      .post(`/v1/devices/device-abc/registrations/${walletPass.passTypeIdentifier}/${walletPass.serialNumber}`)
      .set("Authorization", `ApplePass ${walletPass.authToken}`)
      .send({ pushToken: "push-token-xyz" });

    const res = await request(app)
      .delete(`/v1/devices/device-abc/registrations/${walletPass.passTypeIdentifier}/${walletPass.serialNumber}`)
      .set("Authorization", `ApplePass ${walletPass.authToken}`);

    expect(res.status).toBe(200);
    const registration = await prisma.walletDeviceRegistration.findFirst({ where: { walletPassId: walletPass.id } });
    expect(registration).toBeNull();
  });

  it("lista los seriales actualizados de un dispositivo registrado", async () => {
    await request(app)
      .post(`/v1/devices/device-abc/registrations/${walletPass.passTypeIdentifier}/${walletPass.serialNumber}`)
      .set("Authorization", `ApplePass ${walletPass.authToken}`)
      .send({ pushToken: "push-token-xyz" });

    const res = await request(app).get(
      `/v1/devices/device-abc/registrations/${walletPass.passTypeIdentifier}?passesUpdatedSince=1970-01-01T00:00:00.000Z`
    );

    expect(res.status).toBe(200);
    expect(res.body.serialNumbers).toContain(walletPass.serialNumber);
  });

  it("devuelve 204 cuando no hay passes actualizados para ese dispositivo", async () => {
    const res = await request(app).get(
      `/v1/devices/otro-dispositivo/registrations/${walletPass.passTypeIdentifier}`
    );
    expect(res.status).toBe(204);
  });

  it("acepta logs de error del dispositivo sin autenticacion", async () => {
    const res = await request(app).post("/v1/log").send({ logs: ["algo fallo en el dispositivo"] });
    expect(res.status).toBe(200);
  });
});
