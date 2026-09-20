import { z } from "zod";

export const updateBusinessSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  legalName: z.string().max(160).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  logoUrl: z.string().url().optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
});
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export const createBranchSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(255).optional(),
  phone: z.string().max(30).optional(),
  isMain: z.boolean().optional(),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const inviteEmployeeSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  role: z.enum(["OWNER", "MANAGER", "EMPLOYEE"]),
  branchId: z.string().optional(),
});
export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;
