import { env } from "../config/env.js";
import { logger } from "./logger.js";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Servicio de email transaccional (verificacion de cuenta, reset de password).
 * Distinto del modulo de NOTIFICACIONES multicanal de la Fase 5 (campanas,
 * WALLET_UPDATE/WEB_PUSH/WHATSAPP en packages/notifications): esto es solo el
 * envio de auth emails que la Fase 1 necesita para ser funcional de punta a punta.
 *
 * En modo "console" (default de desarrollo) el correo se imprime en el log del
 * API en vez de enviarse de verdad, para no requerir credenciales de un
 * proveedor real durante el desarrollo local.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (env.EMAIL_PROVIDER === "console") {
    logger.info({ to, subject, html }, "[EMAIL:console] Correo simulado (configura EMAIL_PROVIDER para enviar de verdad)");
    return;
  }

  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY no configurado");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend respondio ${response.status}: ${body}`);
    }
    return;
  }

  throw new Error(`Proveedor de email "${env.EMAIL_PROVIDER}" no implementado todavia`);
}

export function verificationEmailTemplate(firstName: string, verifyUrl: string) {
  return {
    subject: "Verifica tu cuenta de LoyaltyCr",
    html: `<p>Hola ${firstName},</p><p>Verifica tu cuenta haciendo click aqui: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
  };
}

export function passwordResetEmailTemplate(firstName: string, resetUrl: string) {
  return {
    subject: "Restablece tu contrasena de LoyaltyCr",
    html: `<p>Hola ${firstName},</p><p>Restablece tu contrasena haciendo click aqui: <a href="${resetUrl}">${resetUrl}</a></p><p>Si no solicitaste esto, ignora este correo.</p>`,
  };
}
