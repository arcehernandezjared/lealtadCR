import { beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@loyaltycr/database";

beforeAll(async () => {
  // Asegura que el plan STARTER exista (requerido por el flujo de registro).
  await prisma.plan.upsert({
    where: { name: "STARTER" },
    update: {},
    create: {
      name: "STARTER",
      priceMonthly: 19,
      currency: "USD",
      limits: { maxCustomers: 300, maxBranches: 1, maxEmployees: 3 },
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
