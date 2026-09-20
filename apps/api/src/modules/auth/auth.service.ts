import { prisma } from "@loyaltycr/database";
import {
  AppError,
  hashPassword,
  verifyPassword,
  type RegisterInput,
  type LoginInput,
} from "@loyaltycr/shared";
import type { AccessTokenPayload } from "@loyaltycr/shared";
import { signAccessToken } from "../../lib/jwt.js";
import { generateOpaqueToken, hashToken } from "../../lib/crypto.js";
import { generateUniqueBusinessSlug } from "./slug.js";
import { env } from "../../config/env.js";
import {
  sendEmail,
  verificationEmailTemplate,
  passwordResetEmailTemplate,
} from "../../lib/email.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logger } from "../../lib/logger.js";

const REFRESH_TOKEN_COOKIE = "loyaltycr_refresh_token";
const EMAIL_VERIFICATION_TTL_HOURS = 48;
const PASSWORD_RESET_TTL_MINUTES = 30;

export { REFRESH_TOKEN_COOKIE };

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

async function issueTokensForEmployeeContext(
  userId: string,
  employeeContext: AccessTokenPayload["employeeContext"],
  meta: { userAgent?: string; ipAddress?: string }
): Promise<IssuedTokens> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const accessToken = signAccessToken({
    sub: user.id,
    userPublicId: user.publicId,
    email: user.email,
    globalRole: user.globalRole,
    employeeContext: employeeContext ?? null,
  });

  const refreshToken = generateOpaqueToken();
  const refreshTokenExpiresAt = new Date(
    Date.now() + env.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  return { accessToken, refreshToken, refreshTokenExpiresAt };
}

async function resolveEmployeeContextForUser(userId: string) {
  const memberships = await prisma.employee.findMany({
    where: { userId, isActive: true },
    include: { business: { select: { publicId: true, name: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships;
}

export async function registerBusinessOwner(input: RegisterInput, meta: { ipAddress?: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict("Ya existe una cuenta con ese correo electronico");
  }

  const passwordHash = await hashPassword(input.password);
  const slug = await generateUniqueBusinessSlug(input.businessName);
  const starterPlan = await prisma.plan.findUnique({ where: { name: "STARTER" } });
  if (!starterPlan) {
    throw AppError.internal("El plan STARTER no esta configurado. Corre el seed de la base de datos.");
  }

  const { user, business } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    const business = await tx.business.create({
      data: {
        name: input.businessName,
        slug,
        email: input.email,
        status: "TRIAL",
      },
    });

    await tx.branch.create({
      data: { businessId: business.id, name: "Sucursal principal", isMain: true },
    });

    await tx.employee.create({
      data: { businessId: business.id, userId: user.id, role: "OWNER" },
    });

    await tx.subscription.create({
      data: {
        businessId: business.id,
        planId: starterPlan.id,
        status: "TRIALING",
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    return { user, business };
  });

  await recordAuditLog({
    businessId: business.id,
    actorUserId: user.id,
    action: "business.registered",
    entityType: "Business",
    entityId: business.id,
    ipAddress: meta.ipAddress,
  });

  await sendVerificationEmail(user.id).catch((err) =>
    logger.error({ err }, "No se pudo enviar el correo de verificacion")
  );

  const tokens = await issueTokensForEmployeeContext(
    user.id,
    {
      employeeId: (await prisma.employee.findUniqueOrThrow({
        where: { businessId_userId: { businessId: business.id, userId: user.id } },
      })).id,
      businessId: business.id,
      businessPublicId: business.publicId,
      role: "OWNER",
    },
    meta
  );

  return { user, business, tokens };
}

interface LoginResult {
  status: "authenticated";
  tokens: IssuedTokens;
  user: { publicId: string; email: string; firstName: string; lastName: string };
}

interface NeedsBusinessSelectionResult {
  status: "needs_business_selection";
  preAuthToken: string;
  businesses: Array<{ businessPublicId: string; businessId: string; name: string; role: string }>;
}

export async function login(
  input: LoginInput,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<LoginResult | NeedsBusinessSelectionResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Comparacion dummy para no filtrar por timing si el usuario no existe.
  const passwordHashToCheck = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinval";
  const validPassword = await verifyPassword(input.password, passwordHashToCheck);

  if (!user || !user.passwordHash || !validPassword) {
    throw AppError.unauthorized("Correo o contrasena incorrectos");
  }
  if (!user.isActive) {
    throw AppError.forbidden("Esta cuenta esta desactivada");
  }

  if (user.globalRole === "SUPER_ADMIN") {
    const tokens = await issueTokensForEmployeeContext(user.id, null, meta);
    return {
      status: "authenticated",
      tokens,
      user: { publicId: user.publicId, email: user.email, firstName: user.firstName, lastName: user.lastName },
    };
  }

  const memberships = await resolveEmployeeContextForUser(user.id);

  if (memberships.length === 0) {
    throw AppError.forbidden("Esta cuenta no tiene acceso a ningun negocio activo");
  }

  if (memberships.length === 1) {
    const m = memberships[0]!;
    const tokens = await issueTokensForEmployeeContext(
      user.id,
      {
        employeeId: m.id,
        businessId: m.businessId,
        businessPublicId: m.business.publicId,
        role: m.role,
      },
      meta
    );
    return {
      status: "authenticated",
      tokens,
      user: { publicId: user.publicId, email: user.email, firstName: user.firstName, lastName: user.lastName },
    };
  }

  // Usuario con staff membership en mas de un negocio: requiere elegir cual.
  const preAuthToken = signAccessToken({
    sub: user.id,
    userPublicId: user.publicId,
    email: user.email,
    globalRole: user.globalRole,
    employeeContext: null,
  });

  return {
    status: "needs_business_selection",
    preAuthToken,
    businesses: memberships.map((m) => ({
      businessPublicId: m.business.publicId,
      businessId: m.businessId,
      name: m.business.name,
      role: m.role,
    })),
  };
}

export async function selectBusiness(
  userId: string,
  businessId: string,
  meta: { userAgent?: string; ipAddress?: string }
) {
  const membership = await prisma.employee.findUnique({
    where: { businessId_userId: { businessId, userId } },
    include: { business: { select: { publicId: true } } },
  });

  if (!membership || !membership.isActive) {
    throw AppError.forbidden("No tienes acceso a ese negocio");
  }

  return issueTokensForEmployeeContext(
    userId,
    {
      employeeId: membership.id,
      businessId: membership.businessId,
      businessPublicId: membership.business.publicId,
      role: membership.role,
    },
    meta
  );
}

export async function refreshSession(
  rawRefreshToken: string,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<IssuedTokens> {
  const tokenHash = hashToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    throw AppError.unauthorized("Refresh token invalido");
  }

  if (existing.revokedAt) {
    // Reuso de un refresh token ya rotado: posible robo de token. Revocamos
    // todas las sesiones del usuario como medida de contencion.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw AppError.unauthorized("Refresh token invalido. Todas las sesiones fueron cerradas por seguridad.");
  }

  if (existing.expiresAt < new Date()) {
    throw AppError.unauthorized("Refresh token expirado");
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user || !user.isActive) {
    throw AppError.unauthorized("Cuenta no disponible");
  }

  let employeeContext: AccessTokenPayload["employeeContext"] = null;
  if (user.globalRole !== "SUPER_ADMIN") {
    const membership = await prisma.employee.findFirst({
      where: { userId: user.id, isActive: true },
      include: { business: { select: { publicId: true } } },
      orderBy: { createdAt: "asc" },
    });
    if (membership) {
      employeeContext = {
        employeeId: membership.id,
        businessId: membership.businessId,
        businessPublicId: membership.business.publicId,
        role: membership.role,
      };
    }
  }

  const newTokens = await issueTokensForEmployeeContext(user.id, employeeContext, meta);

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  return newTokens;
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function sendVerificationEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) return;

  const token = generateOpaqueToken(32);
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${env.WEB_BASE_URL}/verify-email?token=${token}`;
  const { subject, html } = verificationEmailTemplate(user.firstName, verifyUrl);
  await sendEmail({ to: user.email, subject, html });
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw AppError.badRequest("El enlace de verificacion es invalido o expiro");
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Respuesta identica exista o no el usuario, para no filtrar que correos estan registrados.
  if (!user) return;

  const token = generateOpaqueToken(32);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
    },
  });

  const resetUrl = `${env.WEB_BASE_URL}/reset-password?token=${token}`;
  const { subject, html } = passwordResetEmailTemplate(user.firstName, resetUrl);
  await sendEmail({ to: user.email, subject, html });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw AppError.badRequest("El enlace de restablecimiento es invalido o expiro");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Se cierran todas las sesiones activas como medida de seguridad tras un reset de password.
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
