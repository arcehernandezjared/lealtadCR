import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@loyaltycr/shared";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding LoyaltyCr...");

  // ---------------------------------------------------------------------
  // Planes SaaS
  // ---------------------------------------------------------------------
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { name: "STARTER" },
      update: {},
      create: {
        name: "STARTER",
        priceMonthly: 19,
        currency: "USD",
        limits: {
          maxCustomers: 300,
          maxBranches: 1,
          maxEmployees: 3,
          maxPrograms: 1,
          maxCampaignsPerMonth: 2,
          maxAutomations: 1,
        },
        features: ["apple_wallet", "google_wallet", "email_notifications"],
      },
    }),
    prisma.plan.upsert({
      where: { name: "BUSINESS" },
      update: {},
      create: {
        name: "BUSINESS",
        priceMonthly: 49,
        currency: "USD",
        limits: {
          maxCustomers: 2000,
          maxBranches: 5,
          maxEmployees: 15,
          maxPrograms: 3,
          maxCampaignsPerMonth: 10,
          maxAutomations: 5,
        },
        features: [
          "apple_wallet",
          "google_wallet",
          "email_notifications",
          "web_push",
          "automations",
        ],
      },
    }),
    prisma.plan.upsert({
      where: { name: "PRO" },
      update: {},
      create: {
        name: "PRO",
        priceMonthly: 99,
        currency: "USD",
        limits: {
          maxCustomers: null,
          maxBranches: null,
          maxEmployees: null,
          maxPrograms: null,
          maxCampaignsPerMonth: null,
          maxAutomations: null,
        },
        features: [
          "apple_wallet",
          "google_wallet",
          "email_notifications",
          "web_push",
          "whatsapp",
          "automations",
          "priority_support",
        ],
      },
    }),
  ]);
  const starterPlan = plans[0];

  // ---------------------------------------------------------------------
  // Negocio demo: Barberia XYZ
  // ---------------------------------------------------------------------
  const ownerPassword = await hashPassword("Demo1234!");
  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@barberiaxyz.test" },
    update: {},
    create: {
      email: "owner@barberiaxyz.test",
      passwordHash: ownerPassword,
      firstName: "Carlos",
      lastName: "Rojas",
      emailVerifiedAt: new Date(),
    },
  });

  const business = await prisma.business.upsert({
    where: { slug: "barberia-xyz" },
    update: {},
    create: {
      name: "Barberia XYZ",
      slug: "barberia-xyz",
      email: "contacto@barberiaxyz.test",
      status: "ACTIVE",
      currency: "CRC",
      onboardingStep: 7,
    },
  });

  await prisma.subscription.upsert({
    where: { businessId: business.id },
    update: {},
    create: {
      businessId: business.id,
      planId: starterPlan.id,
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const mainBranch = await prisma.branch.upsert({
    where: { id: "seed-branch-main" },
    update: {},
    create: {
      id: "seed-branch-main",
      businessId: business.id,
      name: "Sucursal Central",
      address: "San Jose, Costa Rica",
      isMain: true,
    },
  });

  await prisma.employee.upsert({
    where: { businessId_userId: { businessId: business.id, userId: ownerUser.id } },
    update: {},
    create: {
      businessId: business.id,
      userId: ownerUser.id,
      branchId: mainBranch.id,
      role: "OWNER",
    },
  });

  // ---------------------------------------------------------------------
  // Programa de lealtad: Club VIP Barberia
  // ---------------------------------------------------------------------
  const program = await prisma.loyaltyProgram.upsert({
    where: { id: "seed-program-club-vip" },
    update: {},
    create: {
      id: "seed-program-club-vip",
      businessId: business.id,
      name: "Club VIP Barberia",
      description: "1 visita = 1 punto. Acumula puntos y desbloquea recompensas.",
      type: "POINTS",
      primaryColor: "#111827",
      secondaryColor: "#F59E0B",
      currency: "CRC",
    },
  });

  await prisma.loyaltyRule.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "seed-rule-visit",
        programId: program.id,
        name: "1 visita = 1 punto",
        eventType: "visit",
        action: "add_points",
        value: 1,
        conditions: {},
      },
      {
        id: "seed-rule-purchase",
        programId: program.id,
        name: "Compra >= 10000 CRC = 5 puntos",
        eventType: "purchase",
        action: "add_points",
        value: 5,
        conditions: { minAmount: 10000 },
      },
      {
        id: "seed-rule-birthday",
        programId: program.id,
        name: "Cumpleanos = 10 puntos",
        eventType: "birthday",
        action: "add_points",
        value: 10,
        conditions: {},
      },
      {
        id: "seed-rule-referral",
        programId: program.id,
        name: "Referido completado = 20 puntos",
        eventType: "referral_completed",
        action: "add_points",
        value: 20,
        conditions: {},
      },
    ],
  });

  await prisma.loyaltyTier.createMany({
    skipDuplicates: true,
    data: [
      { id: "seed-tier-bronce", programId: program.id, name: "Bronce", minPoints: 0, color: "#B45309", order: 0 },
      { id: "seed-tier-plata", programId: program.id, name: "Plata", minPoints: 5, color: "#9CA3AF", order: 1 },
      { id: "seed-tier-oro", programId: program.id, name: "Oro", minPoints: 10, color: "#F59E0B", order: 2 },
      { id: "seed-tier-vip", programId: program.id, name: "VIP", minPoints: 25, color: "#7C3AED", order: 3 },
    ],
  });

  await prisma.reward.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "seed-reward-discount",
        programId: program.id,
        name: "₡3.000 de descuento",
        description: "Descuento aplicable en tu proxima visita.",
        pointsCost: 5,
      },
      {
        id: "seed-reward-free-cut",
        programId: program.id,
        name: "Corte gratis",
        description: "Un corte de cabello completamente gratis.",
        pointsCost: 10,
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Cliente demo
  // ---------------------------------------------------------------------
  const customer = await prisma.customer.upsert({
    where: { id: "seed-customer-demo" },
    update: {},
    create: {
      id: "seed-customer-demo",
      businessId: business.id,
      firstName: "Andres",
      lastName: "Vargas",
      email: "cliente@demo.test",
      phone: "+506 8888 8888",
      status: "ACTIVE",
    },
  });

  await prisma.loyaltyAccount.upsert({
    where: { customerId_programId: { customerId: customer.id, programId: program.id } },
    update: {},
    create: {
      customerId: customer.id,
      programId: program.id,
      points: 7,
      visits: 7,
      currentTierId: "seed-tier-plata",
    },
  });

  console.log("Seed completo.");
  console.log("Login OWNER demo -> email: owner@barberiaxyz.test | password: Demo1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
