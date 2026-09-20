import { prisma } from "@loyaltycr/database";
import { AppError } from "@loyaltycr/shared";

/**
 * Reune todos los datos necesarios para armar un pass (Apple o Google) para
 * un cliente+programa, verificando que ambos pertenezcan al `businessId`
 * dado. Es el equivalente, para el modulo de wallet, del patron
 * "getOwnedXOrThrow" usado en el resto de la API — aqui se hace a mano
 * porque quien llama puede ser el portal del cliente (sin tenantDb).
 */
export async function getPassContext(customerId: string, businessId: string, programId: string) {
  const [customer, program, business] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, businessId } }),
    prisma.loyaltyProgram.findFirst({ where: { id: programId, businessId } }),
    prisma.business.findUnique({ where: { id: businessId } }),
  ]);

  if (!customer || !program || !business) {
    throw AppError.notFound("Cliente o programa no encontrado");
  }

  const account = await prisma.loyaltyAccount.findUnique({
    where: { customerId_programId: { customerId, programId } },
    include: { currentTier: true },
  });

  const points = account?.points ?? 0;

  const nextReward = await prisma.reward.findFirst({
    where: { programId, isActive: true, pointsCost: { gt: points } },
    orderBy: { pointsCost: "asc" },
  });

  return {
    customer,
    program,
    business,
    points,
    tierName: account?.currentTier?.name ?? null,
    nextRewardLabel: nextReward ? `${nextReward.name} (${nextReward.pointsCost - points} pts)` : null,
  };
}

export type PassContext = Awaited<ReturnType<typeof getPassContext>>;
