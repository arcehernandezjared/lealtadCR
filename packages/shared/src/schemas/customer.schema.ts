import { z } from "zod";

export const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  birthday: z.string().datetime().optional(),
  referredByCustomerId: z.string().optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const addPointsSchema = z.object({
  programId: z.string().min(1),
  points: z.number().int(),
  reason: z.string().min(1).max(255),
});
export type AddPointsInput = z.infer<typeof addPointsSchema>;

export const registerVisitSchema = z.object({
  programId: z.string().min(1),
  branchId: z.string().optional(),
  notes: z.string().max(255).optional(),
});
export type RegisterVisitInput = z.infer<typeof registerVisitSchema>;

export const registerPurchaseSchema = z.object({
  programId: z.string().min(1),
  branchId: z.string().optional(),
  amount: z.number().positive(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().nonnegative(),
      })
    )
    .optional(),
});
export type RegisterPurchaseInput = z.infer<typeof registerPurchaseSchema>;

export const customerListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
