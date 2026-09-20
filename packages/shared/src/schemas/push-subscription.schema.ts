import { z } from "zod";

export const createPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type CreatePushSubscriptionInput = z.infer<typeof createPushSubscriptionSchema>;
