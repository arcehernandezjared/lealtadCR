import { z } from "zod";
import { AUTOMATION_TRIGGER_TYPES, automationActionSchema } from "../rule-engine/automation-triggers.js";

export const createAutomationSchema = z.object({
  name: z.string().min(2).max(120),
  triggerType: z.enum(AUTOMATION_TRIGGER_TYPES as [string, ...string[]]),
  conditions: z.record(z.unknown()).default({}),
  actions: z.array(automationActionSchema).min(1),
  isActive: z.boolean().default(true),
});
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;

export const updateAutomationSchema = createAutomationSchema.partial();
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
