-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('OWNER', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('POINTS', 'VISITS', 'STAMPS', 'SPEND', 'MIXED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUST', 'EXPIRE');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'REDEEMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WalletPlatform" AS ENUM ('APPLE', 'GOOGLE');

-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('WALLET_UPDATE', 'WEB_PUSH', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "globalRole" "GlobalRole" NOT NULL DEFAULT 'USER',
    "emailVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "logoUrl" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'TRIAL',
    "timezone" TEXT NOT NULL DEFAULT 'America/Costa_Rica',
    "currency" TEXT NOT NULL DEFAULT 'CRC',
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT,
    "role" "EmployeeRole" NOT NULL DEFAULT 'EMPLOYEE',
    "pinHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "birthday" TIMESTAMP(3),
    "qrCode" TEXT NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastVisitAt" TIMESTAMP(3),
    "referredByCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_programs" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ProgramType" NOT NULL DEFAULT 'POINTS',
    "logoUrl" TEXT,
    "heroImageUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#111827',
    "secondaryColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "currency" TEXT NOT NULL DEFAULT 'CRC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_rules" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "action" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_tiers" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minPoints" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "stamps" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentTierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "eventType" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "quantityAvailable" INTEGER,
    "limitPerCustomer" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "redeemedByEmployeeId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT NOT NULL,
    "employeeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT NOT NULL,
    "employeeId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CRC',
    "items" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "referrerCustomerId" TEXT NOT NULL,
    "referredCustomerId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_passes" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "platform" "WalletPlatform" NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "authToken" TEXT NOT NULL,
    "passTypeIdentifier" TEXT,
    "googleObjectId" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_device_registrations" (
    "id" TEXT NOT NULL,
    "walletPassId" TEXT NOT NULL,
    "deviceLibraryIdentifier" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_device_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "segment" JSONB NOT NULL DEFAULT '{}',
    "channels" TEXT[],
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "campaignId" TEXT,
    "type" TEXT NOT NULL,
    "channel" "NotificationChannelType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL,
    "result" JSONB NOT NULL DEFAULT '{}',
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT,
    "actorUserId" TEXT,
    "actorEmployeeId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "limits" JSONB NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_publicId_key" ON "users"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_publicId_key" ON "businesses"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "businesses_slug_idx" ON "businesses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "branches_publicId_key" ON "branches"("publicId");

-- CreateIndex
CREATE INDEX "branches_businessId_idx" ON "branches"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_publicId_key" ON "employees"("publicId");

-- CreateIndex
CREATE INDEX "employees_businessId_idx" ON "employees"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_businessId_userId_key" ON "employees"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_publicId_key" ON "customers"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_qrCode_key" ON "customers"("qrCode");

-- CreateIndex
CREATE INDEX "customers_businessId_idx" ON "customers"("businessId");

-- CreateIndex
CREATE INDEX "customers_businessId_email_idx" ON "customers"("businessId", "email");

-- CreateIndex
CREATE INDEX "customers_qrCode_idx" ON "customers"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_programs_publicId_key" ON "loyalty_programs"("publicId");

-- CreateIndex
CREATE INDEX "loyalty_programs_businessId_idx" ON "loyalty_programs"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_rules_publicId_key" ON "loyalty_rules"("publicId");

-- CreateIndex
CREATE INDEX "loyalty_rules_programId_idx" ON "loyalty_rules"("programId");

-- CreateIndex
CREATE INDEX "loyalty_rules_programId_eventType_idx" ON "loyalty_rules"("programId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_tiers_publicId_key" ON "loyalty_tiers"("publicId");

-- CreateIndex
CREATE INDEX "loyalty_tiers_programId_idx" ON "loyalty_tiers"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_publicId_key" ON "loyalty_accounts"("publicId");

-- CreateIndex
CREATE INDEX "loyalty_accounts_programId_idx" ON "loyalty_accounts"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_customerId_programId_key" ON "loyalty_accounts"("customerId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_transactions_publicId_key" ON "loyalty_transactions"("publicId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_accountId_idx" ON "loyalty_transactions"("accountId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_accountId_createdAt_idx" ON "loyalty_transactions"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_publicId_key" ON "rewards"("publicId");

-- CreateIndex
CREATE INDEX "rewards_programId_idx" ON "rewards"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "reward_redemptions_publicId_key" ON "reward_redemptions"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "reward_redemptions_code_key" ON "reward_redemptions"("code");

-- CreateIndex
CREATE INDEX "reward_redemptions_customerId_idx" ON "reward_redemptions"("customerId");

-- CreateIndex
CREATE INDEX "reward_redemptions_rewardId_idx" ON "reward_redemptions"("rewardId");

-- CreateIndex
CREATE INDEX "reward_redemptions_code_idx" ON "reward_redemptions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "visits_publicId_key" ON "visits"("publicId");

-- CreateIndex
CREATE INDEX "visits_businessId_idx" ON "visits"("businessId");

-- CreateIndex
CREATE INDEX "visits_customerId_idx" ON "visits"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_publicId_key" ON "purchases"("publicId");

-- CreateIndex
CREATE INDEX "purchases_businessId_idx" ON "purchases"("businessId");

-- CreateIndex
CREATE INDEX "purchases_customerId_idx" ON "purchases"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_publicId_key" ON "referrals"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredCustomerId_key" ON "referrals"("referredCustomerId");

-- CreateIndex
CREATE INDEX "referrals_businessId_idx" ON "referrals"("businessId");

-- CreateIndex
CREATE INDEX "referrals_referrerCustomerId_idx" ON "referrals"("referrerCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_passes_publicId_key" ON "wallet_passes"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_passes_serialNumber_key" ON "wallet_passes"("serialNumber");

-- CreateIndex
CREATE INDEX "wallet_passes_customerId_idx" ON "wallet_passes"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_passes_customerId_programId_platform_key" ON "wallet_passes"("customerId", "programId", "platform");

-- CreateIndex
CREATE INDEX "wallet_device_registrations_walletPassId_idx" ON "wallet_device_registrations"("walletPassId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_device_registrations_deviceLibraryIdentifier_walletP_key" ON "wallet_device_registrations"("deviceLibraryIdentifier", "walletPassId");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_publicId_key" ON "campaigns"("publicId");

-- CreateIndex
CREATE INDEX "campaigns_businessId_idx" ON "campaigns"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_publicId_key" ON "notifications"("publicId");

-- CreateIndex
CREATE INDEX "notifications_businessId_idx" ON "notifications"("businessId");

-- CreateIndex
CREATE INDEX "notifications_customerId_idx" ON "notifications"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "automations_publicId_key" ON "automations"("publicId");

-- CreateIndex
CREATE INDEX "automations_businessId_idx" ON "automations"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "automation_executions_publicId_key" ON "automation_executions"("publicId");

-- CreateIndex
CREATE INDEX "automation_executions_automationId_idx" ON "automation_executions"("automationId");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_publicId_key" ON "audit_logs"("publicId");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_idx" ON "audit_logs"("businessId");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_createdAt_idx" ON "audit_logs"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "plans_publicId_key" ON "plans"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_publicId_key" ON "subscriptions"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_businessId_key" ON "subscriptions"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_publicId_key" ON "payments"("publicId");

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_referredByCustomerId_fkey" FOREIGN KEY ("referredByCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_rules" ADD CONSTRAINT "loyalty_rules_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_currentTierId_fkey" FOREIGN KEY ("currentTierId") REFERENCES "loyalty_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_redeemedByEmployeeId_fkey" FOREIGN KEY ("redeemedByEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerCustomerId_fkey" FOREIGN KEY ("referrerCustomerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredCustomerId_fkey" FOREIGN KEY ("referredCustomerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_passes" ADD CONSTRAINT "wallet_passes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_passes" ADD CONSTRAINT "wallet_passes_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_device_registrations" ADD CONSTRAINT "wallet_device_registrations_walletPassId_fkey" FOREIGN KEY ("walletPassId") REFERENCES "wallet_passes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
