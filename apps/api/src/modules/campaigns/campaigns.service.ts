import { type TenantPrismaClient, type NotificationChannelType } from "@loyaltycr/database";
import { AppError, type CreateCampaignInput, type UpdateCampaignInput } from "@loyaltycr/shared";
import { resolveSegment } from "./segment-resolver.js";
import { createAndDispatch } from "../notifications/notifications.service.js";

export async function listCampaigns(tenantDb: TenantPrismaClient) {
  return tenantDb.campaign.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createCampaign(tenantDb: TenantPrismaClient, businessId: string, input: CreateCampaignInput) {
  return tenantDb.campaign.create({
    data: {
      businessId,
      title: input.title,
      message: input.message,
      segment: input.segment as object,
      channels: input.channels,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
    },
  });
}

async function getOwnedCampaignOrThrow(tenantDb: TenantPrismaClient, campaignId: string) {
  const campaign = await tenantDb.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw AppError.notFound("Campana no encontrada");
  return campaign;
}

export async function updateCampaign(tenantDb: TenantPrismaClient, campaignId: string, input: UpdateCampaignInput) {
  const campaign = await getOwnedCampaignOrThrow(tenantDb, campaignId);
  if (campaign.status === "SENT") throw AppError.conflict("No se puede editar una campana ya enviada");

  return tenantDb.campaign.update({
    where: { id: campaignId },
    data: {
      title: input.title,
      message: input.message,
      segment: input.segment as object | undefined,
      channels: input.channels,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    },
  });
}

export async function deleteCampaign(tenantDb: TenantPrismaClient, campaignId: string) {
  const campaign = await getOwnedCampaignOrThrow(tenantDb, campaignId);
  if (campaign.status === "SENT" || campaign.status === "SENDING") {
    throw AppError.conflict("No se puede eliminar una campana enviada o en curso");
  }
  await tenantDb.campaign.delete({ where: { id: campaignId } });
}

/** Envia una campana ahora mismo: resuelve el segmento y despacha una notificacion por cliente x canal seleccionado. */
export async function sendCampaign(tenantDb: TenantPrismaClient, businessId: string, campaignId: string) {
  const campaign = await getOwnedCampaignOrThrow(tenantDb, campaignId);
  if (campaign.status === "SENT" || campaign.status === "SENDING") {
    throw AppError.conflict(`Esta campana ya esta en estado ${campaign.status}`);
  }

  await tenantDb.campaign.update({ where: { id: campaignId }, data: { status: "SENDING" } });

  const customers = await resolveSegment(tenantDb, businessId, campaign.segment as never);

  const BATCH_SIZE = 20;
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.flatMap((customer) =>
        (campaign.channels as NotificationChannelType[]).map((channel) =>
          createAndDispatch({
            businessId,
            customerId: customer.id,
            campaignId: campaign.id,
            type: "manual_campaign",
            channel,
            title: campaign.title,
            body: campaign.message,
          }).catch(() => null)
        )
      )
    );
  }

  return tenantDb.campaign.update({
    where: { id: campaignId },
    data: { status: "SENT", sentAt: new Date() },
  });
}
