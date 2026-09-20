import { z } from "zod";
import { LOYALTY_EVENT_TYPES, LOYALTY_ACTION_TYPES } from "../rule-engine/registry.js";

export const programTypeSchema = z.enum(["POINTS", "VISITS", "STAMPS", "SPEND", "MIXED"]);

export const createProgramSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  type: programTypeSchema.default("POINTS"),
  logoUrl: z.string().url().optional(),
  heroImageUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Debe ser un color hex valido, ej. #111827"),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Debe ser un color hex valido, ej. #FFFFFF"),
  currency: z.string().length(3).default("CRC"),
});
export type CreateProgramInput = z.infer<typeof createProgramSchema>;

export const updateProgramSchema = createProgramSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;

export const createRuleSchema = z.object({
  name: z.string().min(2).max(120),
  eventType: z.enum(LOYALTY_EVENT_TYPES as [string, ...string[]]),
  conditions: z.record(z.unknown()).default({}),
  action: z.enum(LOYALTY_ACTION_TYPES as [string, ...string[]]),
  value: z.number(),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type CreateRuleInput = z.infer<typeof createRuleSchema>;

export const updateRuleSchema = createRuleSchema.partial();
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

export const createTierSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(255).optional(),
  minPoints: z.number().int().nonnegative(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#6B7280"),
  benefits: z.array(z.string()).default([]),
  order: z.number().int().default(0),
});
export type CreateTierInput = z.infer<typeof createTierSchema>;

export const createRewardSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  pointsCost: z.number().int().positive(),
  quantityAvailable: z.number().int().positive().optional(),
  limitPerCustomer: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});
export type CreateRewardInput = z.infer<typeof createRewardSchema>;

export const updateRewardSchema = createRewardSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateRewardInput = z.infer<typeof updateRewardSchema>;

export const redeemRewardSchema = z.object({
  code: z.string().min(1),
});
export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;
