import { prisma } from "@loyaltycr/database";
import { AppError } from "@loyaltycr/shared";
import { signCustomerAccessToken } from "../../lib/jwt.js";

/**
 * El QR del cliente (`Customer.qrCode`, un cuid de alta entropia) actua como
 * credencial de posesion: quien tenga el enlace/QR puede abrir el portal.
 * Aqui se intercambia ese QR por un JWT de sesion de cliente de corta
 * duracion (ver CustomerAccessTokenPayload), para que las llamadas
 * siguientes no repitan el qrCode en cada request y para poder revocar/expirar
 * la sesion independientemente del QR fisico (que no cambia).
 */
export async function createPortalSession(qrCode: string) {
  const customer = await prisma.customer.findFirst({
    where: { qrCode },
    include: { business: { select: { id: true, publicId: true, name: true, status: true } } },
  });

  if (!customer) throw AppError.notFound("Tarjeta no encontrada");
  if (customer.status === "BLOCKED") throw AppError.forbidden("Esta tarjeta esta bloqueada");
  if (customer.business.status === "SUSPENDED" || customer.business.status === "CANCELLED") {
    throw AppError.forbidden("Este negocio no esta disponible en este momento");
  }

  const accessToken = signCustomerAccessToken({
    sub: customer.id,
    customerPublicId: customer.publicId,
    businessId: customer.businessId,
    businessPublicId: customer.business.publicId,
    type: "customer",
  });

  return { accessToken, businessName: customer.business.name };
}

const PROGRAM_BRANDING_SELECT = {
  publicId: true,
  name: true,
  type: true,
  primaryColor: true,
  secondaryColor: true,
  logoUrl: true,
} as const;

export async function getPortalProfile(customerId: string, businessId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, businessId } });
  if (!customer) throw AppError.notFound("Cliente no encontrado");

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { name: true, logoUrl: true },
  });

  // Se recorren los PROGRAMAS activos (no las LoyaltyAccount existentes): un
  // cliente recien creado todavia no tiene ninguna LoyaltyAccount (se crea
  // recien en su primer evento, ver applyLoyaltyDelta), pero su tarjeta debe
  // mostrar "0 puntos" para ese programa desde el primer momento, no una
  // lista vacia.
  const programs = await prisma.loyaltyProgram.findMany({
    where: { businessId, isActive: true },
    select: { id: true, ...PROGRAM_BRANDING_SELECT },
  });

  const existingAccounts = await prisma.loyaltyAccount.findMany({
    where: { customerId, programId: { in: programs.map((p) => p.id) } },
    include: { currentTier: true },
  });
  const accountByProgram = new Map(existingAccounts.map((a) => [a.programId, a]));

  const accounts = await Promise.all(
    programs.map(async (program) => {
      const existing = accountByProgram.get(program.id);
      const points = existing?.points ?? 0;

      const [nextTier, nextReward] = await Promise.all([
        prisma.loyaltyTier.findFirst({
          where: { programId: program.id, minPoints: { gt: points } },
          orderBy: { minPoints: "asc" },
        }),
        prisma.reward.findFirst({
          where: { programId: program.id, isActive: true, pointsCost: { gt: points } },
          orderBy: { pointsCost: "asc" },
        }),
      ]);

      return {
        id: existing?.id ?? null,
        points,
        visits: existing?.visits ?? 0,
        stamps: existing?.stamps ?? 0,
        currentTier: existing?.currentTier ?? null,
        program,
        nextTier,
        nextReward,
      };
    })
  );

  return { customer, business, accounts };
}

export async function getPortalRewards(customerId: string, businessId: string) {
  // Igual que en getPortalProfile: se listan las recompensas de todos los
  // programas activos del negocio, no solo de los que ya tienen LoyaltyAccount,
  // para que un cliente nuevo vea que recompensas existen (bloqueadas) desde el inicio.
  const programs = await prisma.loyaltyProgram.findMany({ where: { businessId, isActive: true }, select: { id: true } });
  const programIds = programs.map((p) => p.id);

  const accounts = await prisma.loyaltyAccount.findMany({
    where: { customerId, programId: { in: programIds } },
    select: { programId: true, points: true },
  });
  const pointsByProgram = new Map(accounts.map((a) => [a.programId, a.points]));

  const rewards = await prisma.reward.findMany({
    where: { programId: { in: programIds }, isActive: true },
    orderBy: { pointsCost: "asc" },
  });

  const redemptions = await prisma.rewardRedemption.findMany({
    where: { customerId, rewardId: { in: rewards.map((r) => r.id) } },
    orderBy: { createdAt: "desc" },
  });

  return rewards.map((reward) => {
    const points = pointsByProgram.get(reward.programId) ?? 0;
    const activeRedemption = redemptions.find((r) => r.rewardId === reward.id && r.status !== "CANCELLED");
    return {
      ...reward,
      status: activeRedemption?.status ?? (points >= reward.pointsCost ? "READY" : "LOCKED"),
      code: activeRedemption?.status === "PENDING" ? activeRedemption.code : null,
    };
  });
}

export async function getPortalHistory(customerId: string, businessId: string) {
  const accounts = await prisma.loyaltyAccount.findMany({
    where: { customerId, program: { businessId } },
    select: { id: true },
  });

  const [transactions, visits, purchases] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where: { accountId: { in: accounts.map((a) => a.id) } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, points: true, reason: true, type: true, createdAt: true },
    }),
    prisma.visit.findMany({
      where: { customerId, businessId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, createdAt: true },
    }),
    prisma.purchase.findMany({
      where: { customerId, businessId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, amount: true, createdAt: true },
    }),
  ]);

  return { transactions, visits, purchases };
}
