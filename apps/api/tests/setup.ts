import { beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@loyaltycr/database";

// Debe coincidir con packages/database/prisma/seed.ts (STARTER real).
const STARTER_LIMITS = {
  maxCustomers: 300,
  maxBranches: 2,
  maxEmployees: 3,
  maxPrograms: 1,
  maxCampaignsPerMonth: 2,
  maxAutomations: 1,
};

beforeAll(async () => {
  // Asegura que el plan STARTER exista con limites conocidos (requerido por
  // el flujo de registro y por los tests de limites de plan). `update` se
  // usa para que corridas anteriores de test no dejen limites desactualizados.
  await prisma.plan.upsert({
    where: { name: "STARTER" },
    update: { limits: STARTER_LIMITS },
    create: {
      name: "STARTER",
      priceMonthly: 19,
      currency: "USD",
      limits: STARTER_LIMITS,
      features: [],
    },
  });
});

/** Limpia todos los datos generados por negocio entre tests, para que no se interfieran entre si. */
afterEach(async () => {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.emailVerificationToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.rewardRedemption.deleteMany(),
    prisma.reward.deleteMany(),
    prisma.loyaltyTransaction.deleteMany(),
    prisma.loyaltyAccount.deleteMany(),
    prisma.loyaltyTier.deleteMany(),
    prisma.loyaltyRule.deleteMany(),
    prisma.visit.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.referral.deleteMany(),
    prisma.loyaltyProgram.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
