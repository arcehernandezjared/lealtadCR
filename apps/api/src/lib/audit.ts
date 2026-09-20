import { prisma, Prisma } from "@loyaltycr/database";

interface AuditEntry {
  businessId?: string;
  actorUserId?: string;
  actorEmployeeId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Registra una entrada de auditoria. Se escribe con el cliente Prisma SIN
 * scope de tenant a proposito (el propio AuditLog no lleva `businessId`
 * obligatorio como columna tenant-scoped estricta en algunos casos, ej.
 * acciones de SUPER_ADMIN), pero siempre recibe el `businessId` explicito
 * del contexto que llama. Nunca lanza: un fallo al auditar no debe tumbar
 * la operacion de negocio que la origino.
 */
export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        businessId: entry.businessId,
        actorUserId: entry.actorUserId,
        actorEmployeeId: entry.actorEmployeeId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("No se pudo escribir el audit log", err);
  }
}
