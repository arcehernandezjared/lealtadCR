import { prisma, Prisma } from "@loyaltycr/database";

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Nota de diseno: los modelos "indirectos" (LoyaltyTransaction, RewardRedemption)
 * no tienen `businessId` como columna propia (ver comentario en
 * packages/database/src/tenant.ts), asi que aqui se filtran via el `prisma`
 * crudo con filtros de relacion explicitos (`account: { program: { businessId } }`),
 * nunca confiando en un id que venga del cliente sin ese join.
 */
export async function getDashboardOverview(businessId: string, range: DateRange) {
  const [
    totalCustomers,
    newCustomersInRange,
    activeCustomers,
    totalVisitsInRange,
    pointsAwardedAgg,
    rewardsUnlockedInRange,
    rewardsRedeemedInRange,
    returningCustomers,
    recentVisits,
    recentRedemptions,
  ] = await Promise.all([
    prisma.customer.count({ where: { businessId } }),
    prisma.customer.count({ where: { businessId, createdAt: { gte: range.from, lte: range.to } } }),
    prisma.customer.count({
      where: { businessId, lastVisitAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.visit.count({ where: { businessId, createdAt: { gte: range.from, lte: range.to } } }),
    prisma.loyaltyTransaction.aggregate({
      _sum: { points: true },
      where: {
        type: "EARN",
        createdAt: { gte: range.from, lte: range.to },
        account: { program: { businessId } },
      },
    }),
    prisma.rewardRedemption.count({
      where: { unlockedAt: { gte: range.from, lte: range.to }, reward: { program: { businessId } } },
    }),
    prisma.rewardRedemption.count({
      where: {
        status: "REDEEMED",
        redeemedAt: { gte: range.from, lte: range.to },
        reward: { program: { businessId } },
      },
    }),
    prisma
      .$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS count FROM (
            SELECT v."customerId" FROM "visits" v WHERE v."businessId" = ${businessId}
            GROUP BY v."customerId" HAVING COUNT(*) >= 2
          ) AS returning_customers
        `
      )
      .then((rows) => Number(rows[0]?.count ?? 0)),
    prisma.visit.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: { select: { firstName: true, lastName: true } }, employee: { include: { user: true } } },
    }),
    prisma.rewardRedemption.findMany({
      where: { reward: { program: { businessId } }, status: "REDEEMED" },
      orderBy: { redeemedAt: "desc" },
      take: 8,
      include: { customer: { select: { firstName: true, lastName: true } }, reward: { select: { name: true } } },
    }),
  ]);

  return {
    totalCustomers,
    newCustomersInRange,
    activeCustomers,
    totalVisitsInRange,
    pointsAwardedInRange: pointsAwardedAgg._sum.points ?? 0,
    rewardsUnlockedInRange,
    rewardsRedeemedInRange,
    returningCustomers,
    returnRate: totalCustomers > 0 ? Number((returningCustomers / totalCustomers).toFixed(3)) : 0,
    recentActivity: [
      ...recentVisits.map((v) => ({
        type: "visit" as const,
        at: v.createdAt,
        customer: `${v.customer.firstName} ${v.customer.lastName}`,
        employee: v.employee?.user ? `${v.employee.user.firstName} ${v.employee.user.lastName}` : null,
      })),
      ...recentRedemptions.map((r) => ({
        type: "redemption" as const,
        at: r.redeemedAt ?? r.unlockedAt,
        customer: `${r.customer.firstName} ${r.customer.lastName}`,
        reward: r.reward.name,
      })),
    ]
      .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
      .slice(0, 10),
  };
}

/** Serie diaria de clientes nuevos, visitas, puntos otorgados y recompensas canjeadas, para los graficos del dashboard. */
export async function getDashboardSeries(businessId: string, range: DateRange) {
  const [newCustomers, visits, points, redemptions] = await Promise.all([
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(Prisma.sql`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM "customers"
      WHERE "businessId" = ${businessId} AND "createdAt" BETWEEN ${range.from} AND ${range.to}
      GROUP BY 1 ORDER BY 1
    `),
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(Prisma.sql`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM "visits"
      WHERE "businessId" = ${businessId} AND "createdAt" BETWEEN ${range.from} AND ${range.to}
      GROUP BY 1 ORDER BY 1
    `),
    prisma.$queryRaw<Array<{ day: Date; total: bigint }>>(Prisma.sql`
      SELECT date_trunc('day', lt."createdAt") AS day, COALESCE(SUM(lt."points"), 0)::bigint AS total
      FROM "loyalty_transactions" lt
      JOIN "loyalty_accounts" la ON la.id = lt."accountId"
      JOIN "loyalty_programs" lp ON lp.id = la."programId"
      WHERE lp."businessId" = ${businessId} AND lt."type" = 'EARN' AND lt."createdAt" BETWEEN ${range.from} AND ${range.to}
      GROUP BY 1 ORDER BY 1
    `),
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(Prisma.sql`
      SELECT date_trunc('day', rr."redeemedAt") AS day, COUNT(*)::bigint AS count
      FROM "reward_redemptions" rr
      JOIN "rewards" r ON r.id = rr."rewardId"
      JOIN "loyalty_programs" lp ON lp.id = r."programId"
      WHERE lp."businessId" = ${businessId} AND rr."status" = 'REDEEMED' AND rr."redeemedAt" BETWEEN ${range.from} AND ${range.to}
      GROUP BY 1 ORDER BY 1
    `),
  ]);

  return {
    newCustomers: newCustomers.map((r) => ({ date: r.day, value: Number(r.count) })),
    visits: visits.map((r) => ({ date: r.day, value: Number(r.count) })),
    pointsAwarded: points.map((r) => ({ date: r.day, value: Number(r.total) })),
    rewardsRedeemed: redemptions.map((r) => ({ date: r.day, value: Number(r.count) })),
  };
}
