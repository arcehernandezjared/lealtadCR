import { randomUUID } from "node:crypto";
import { prisma } from "@loyaltycr/database";
import { AppError } from "@loyaltycr/shared";
import {
  generateSignedPkpass,
  buildLoyaltyClass,
  buildLoyaltyObject,
  buildSaveToGoogleWalletLink,
  GoogleWalletClient,
  sendPassUpdatePush,
} from "@loyaltycr/wallet";
import { generateOpaqueToken } from "../../lib/crypto.js";
import { env, appleWalletConfigured, googleWalletConfigured } from "../../config/env.js";
import { getAppleCertificates, getApnsCredentials, getGoogleServiceAccount } from "./credentials.js";
import { getPassContext } from "./pass-context.js";
import { logger } from "../../lib/logger.js";

async function ensureWalletPass(customerId: string, programId: string, platform: "APPLE" | "GOOGLE") {
  const existing = await prisma.walletPass.findUnique({
    where: { customerId_programId_platform: { customerId, programId, platform } },
  });
  if (existing) return existing;

  return prisma.walletPass.create({
    data: {
      customerId,
      programId,
      platform,
      serialNumber: `${platform.toLowerCase()}-${randomUUID()}`,
      authToken: generateOpaqueToken(24),
      passTypeIdentifier: platform === "APPLE" ? env.APPLE_PASS_TYPE_ID : undefined,
    },
  });
}

export async function issueApplePass(customerId: string, businessId: string, programId: string): Promise<Buffer> {
  // La verificacion de pertenencia va ANTES que la de configuracion a
  // proposito: alguien probando con un programId de otro negocio debe
  // recibir 404 (igual que cualquier recurso ajeno), no una pista sobre si
  // Apple Wallet esta o no configurado en este servidor.
  const ctx = await getPassContext(customerId, businessId, programId);

  if (!appleWalletConfigured) {
    throw AppError.badRequest(
      "Apple Wallet no esta configurado en este entorno todavia. Ver docs/APPLE_WALLET.md para las credenciales necesarias.",
      { code: "APPLE_WALLET_NOT_CONFIGURED" }
    );
  }

  const walletPass = await ensureWalletPass(customerId, programId, "APPLE");
  const certificates = getAppleCertificates();

  return generateSignedPkpass(
    {
      serialNumber: walletPass.serialNumber,
      authenticationToken: walletPass.authToken,
      passTypeIdentifier: env.APPLE_PASS_TYPE_ID!,
      teamIdentifier: env.APPLE_TEAM_ID!,
      webServiceURL: `${env.API_BASE_URL}/v1`,
      businessName: ctx.business.name,
      programName: ctx.program.name,
      primaryColor: ctx.program.primaryColor,
      secondaryColor: ctx.program.secondaryColor,
      customerFullName: `${ctx.customer.firstName} ${ctx.customer.lastName}`,
      qrValue: ctx.customer.qrCode,
      points: ctx.points,
      tierName: ctx.tierName,
      nextRewardLabel: ctx.nextRewardLabel,
    },
    certificates
  );
}

export async function issueGooglePass(customerId: string, businessId: string, programId: string): Promise<{ saveUrl: string }> {
  const ctx = await getPassContext(customerId, businessId, programId);

  if (!googleWalletConfigured) {
    throw AppError.badRequest(
      "Google Wallet no esta configurado en este entorno todavia. Ver docs/GOOGLE_WALLET.md para las credenciales necesarias.",
      { code: "GOOGLE_WALLET_NOT_CONFIGURED" }
    );
  }

  const walletPass = await ensureWalletPass(customerId, programId, "GOOGLE");
  const serviceAccount = getGoogleServiceAccount();
  const client = new GoogleWalletClient(serviceAccount);
  const issuerId = env.GOOGLE_WALLET_ISSUER_ID!;

  const classSuffix = `program_${ctx.program.id}`;
  const objectSuffix = `customer_${ctx.customer.id}_${ctx.program.id}`;

  await client.upsertLoyaltyClass(
    buildLoyaltyClass({
      issuerId,
      classSuffix,
      businessName: ctx.business.name,
      programName: ctx.program.name,
      primaryColorHex: ctx.program.primaryColor,
      logoUrl: ctx.business.logoUrl,
    })
  );

  await client.upsertLoyaltyObject(
    buildLoyaltyObject({
      issuerId,
      classSuffix,
      objectSuffix,
      customerFullName: `${ctx.customer.firstName} ${ctx.customer.lastName}`,
      qrValue: ctx.customer.qrCode,
      points: ctx.points,
      tierName: ctx.tierName,
      nextRewardLabel: ctx.nextRewardLabel,
    })
  );

  const objectId = `${issuerId}.${objectSuffix}`;
  if (walletPass.googleObjectId !== objectId) {
    await prisma.walletPass.update({ where: { id: walletPass.id }, data: { googleObjectId: objectId } });
  }

  return { saveUrl: buildSaveToGoogleWalletLink(serviceAccount, objectId) };
}

/**
 * Se llama desde el motor de lealtad (apps/api/src/engine/loyalty-ledger.ts)
 * despues de aplicar un delta de puntos. Si el cliente ya tiene un
 * WalletPass emitido para ese programa, empuja la actualizacion:
 *  - Apple: push APNs "silencioso" (push-to-pull, ver docs/APPLE_WALLET.md).
 *  - Google: PATCH directo del LoyaltyObject (Google notifica al dispositivo
 *    por su cuenta, no requiere un paso de push separado de nuestra parte).
 *
 * Nunca lanza: un fallo al notificar al wallet no debe tumbar la operacion
 * de negocio que lo origino (visita, compra, ajuste de puntos).
 */
export async function notifyWalletsOfChange(customerId: string, programId: string): Promise<void> {
  const walletPasses = await prisma.walletPass.findMany({ where: { customerId, programId } });
  if (walletPasses.length === 0) return;

  for (const pass of walletPasses) {
    try {
      if (pass.platform === "APPLE") {
        await notifyAppleDevices(pass.id);
      } else if (pass.platform === "GOOGLE" && pass.googleObjectId && googleWalletConfigured) {
        const ctx = await getPassContext(customerId, (await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id: programId } })).businessId, programId);
        const client = new GoogleWalletClient(getGoogleServiceAccount());
        await client.patchLoyaltyObjectPoints(pass.googleObjectId, ctx.points, ctx.tierName, ctx.nextRewardLabel);
      }
      await prisma.walletPass.update({ where: { id: pass.id }, data: { lastUpdatedAt: new Date() } });
    } catch (err) {
      logger.error({ err, walletPassId: pass.id }, "No se pudo notificar la actualizacion del wallet pass");
    }
  }
}

async function notifyAppleDevices(walletPassId: string): Promise<void> {
  const apnsCredentials = getApnsCredentials();
  if (!apnsCredentials) return; // sin clave APNs configurada: el pass solo se actualizara la proxima vez que se abra manualmente

  const devices = await prisma.walletDeviceRegistration.findMany({ where: { walletPassId } });
  const pass = await prisma.walletPass.findUniqueOrThrow({ where: { id: walletPassId } });

  await Promise.all(
    devices.map((device) =>
      sendPassUpdatePush({
        deviceToken: device.pushToken,
        passTypeIdentifier: pass.passTypeIdentifier ?? env.APPLE_PASS_TYPE_ID!,
        credentials: apnsCredentials,
      }).catch((err) => logger.error({ err, deviceId: device.id }, "Fallo el push APNs a un dispositivo"))
    )
  );
}
