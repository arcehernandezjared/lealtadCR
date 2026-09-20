import { prisma } from "@loyaltycr/database";
import { AppError } from "@loyaltycr/shared";
import { generateSignedPkpass } from "@loyaltycr/wallet";
import { env } from "../../config/env.js";
import { getAppleCertificates } from "./credentials.js";
import { getPassContext } from "./pass-context.js";
import { logger } from "../../lib/logger.js";

/**
 * Implementacion del protocolo "Apple Wallet Web Service" tal como lo
 * documenta Apple (PassKit Web Service Reference). Estos endpoints los
 * llama el propio dispositivo del cliente, NO nuestro frontend — por eso se
 * autentican con el `authenticationToken` embebido en el pass (header
 * `Authorization: ApplePass <token>`), nunca con el JWT de staff/cliente.
 */

async function findPassByTypeAndSerial(passTypeIdentifier: string, serialNumber: string) {
  const pass = await prisma.walletPass.findUnique({ where: { serialNumber } });
  if (!pass || pass.platform !== "APPLE" || pass.passTypeIdentifier !== passTypeIdentifier) return null;
  return pass;
}

function extractAuthToken(header: string | undefined): string | null {
  if (!header?.startsWith("ApplePass ")) return null;
  return header.slice("ApplePass ".length);
}

export async function registerDevice(params: {
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  serialNumber: string;
  pushToken: string;
  authorizationHeader: string | undefined;
}): Promise<{ status: 200 | 201 }> {
  const pass = await findPassByTypeAndSerial(params.passTypeIdentifier, params.serialNumber);
  const token = extractAuthToken(params.authorizationHeader);
  if (!pass || !token || token !== pass.authToken) throw AppError.unauthorized();

  const existing = await prisma.walletDeviceRegistration.findUnique({
    where: {
      deviceLibraryIdentifier_walletPassId: {
        deviceLibraryIdentifier: params.deviceLibraryIdentifier,
        walletPassId: pass.id,
      },
    },
  });

  if (existing) {
    if (existing.pushToken !== params.pushToken) {
      await prisma.walletDeviceRegistration.update({ where: { id: existing.id }, data: { pushToken: params.pushToken } });
    }
    return { status: 200 };
  }

  await prisma.walletDeviceRegistration.create({
    data: { deviceLibraryIdentifier: params.deviceLibraryIdentifier, walletPassId: pass.id, pushToken: params.pushToken },
  });
  return { status: 201 };
}

export async function unregisterDevice(params: {
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  serialNumber: string;
  authorizationHeader: string | undefined;
}): Promise<void> {
  const pass = await findPassByTypeAndSerial(params.passTypeIdentifier, params.serialNumber);
  const token = extractAuthToken(params.authorizationHeader);
  if (!pass || !token || token !== pass.authToken) throw AppError.unauthorized();

  await prisma.walletDeviceRegistration.deleteMany({
    where: { deviceLibraryIdentifier: params.deviceLibraryIdentifier, walletPassId: pass.id },
  });
}

/** Lista los serialNumbers de passes de ese passType/dispositivo que cambiaron desde `passesUpdatedSince`. */
export async function listUpdatedSerials(params: {
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  passesUpdatedSince?: string;
}): Promise<{ serialNumbers: string[]; lastUpdated: string } | null> {
  const since = params.passesUpdatedSince ? new Date(params.passesUpdatedSince) : new Date(0);

  const registrations = await prisma.walletDeviceRegistration.findMany({
    where: { deviceLibraryIdentifier: params.deviceLibraryIdentifier },
    include: { walletPass: true },
  });

  const matching = registrations
    .map((r) => r.walletPass)
    .filter((p) => p.platform === "APPLE" && p.passTypeIdentifier === params.passTypeIdentifier && p.lastUpdatedAt > since);

  if (matching.length === 0) return null;

  return {
    serialNumbers: matching.map((p) => p.serialNumber),
    lastUpdated: new Date().toISOString(),
  };
}

export async function getLatestPass(params: {
  passTypeIdentifier: string;
  serialNumber: string;
  authorizationHeader: string | undefined;
}): Promise<Buffer> {
  const pass = await findPassByTypeAndSerial(params.passTypeIdentifier, params.serialNumber);
  const token = extractAuthToken(params.authorizationHeader);
  if (!pass || !token || token !== pass.authToken) throw AppError.unauthorized();

  const ctx = await getPassContext(pass.customerId, (await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id: pass.programId } })).businessId, pass.programId);
  const certificates = getAppleCertificates();

  return generateSignedPkpass(
    {
      serialNumber: pass.serialNumber,
      authenticationToken: pass.authToken,
      passTypeIdentifier: params.passTypeIdentifier,
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

export function logDeviceErrors(logs: unknown): void {
  logger.warn({ logs }, "[AppleWallet] Errores reportados por un dispositivo");
}
