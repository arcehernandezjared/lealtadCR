import { z } from "zod";

export const NOTIFICATION_CHANNELS = ["WALLET_UPDATE", "WEB_PUSH", "EMAIL", "WHATSAPP"] as const;
export type NotificationChannelValue = (typeof NOTIFICATION_CHANNELS)[number];

export const SEGMENT_TYPES = ["all", "tier", "inactive", "min_points"] as const;

export const segmentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }),
  z.object({ type: z.literal("tier"), programId: z.string(), tierId: z.string() }),
  z.object({ type: z.literal("inactive"), days: z.number().int().positive() }),
  z.object({ type: z.literal("min_points"), programId: z.string(), points: z.number().int().nonnegative() }),
]);
export type Segment = z.infer<typeof segmentSchema>;

export const createCampaignSchema = z.object({
  title: z.string().min(2).max(150),
  message: z.string().min(1).max(1000),
  segment: segmentSchema,
  channels: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1),
  scheduledAt: z.string().datetime().optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.partial();
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
