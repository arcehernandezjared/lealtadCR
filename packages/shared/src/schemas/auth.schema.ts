import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "La contrasena debe tener al menos 10 caracteres")
  .regex(/[a-z]/, "Debe incluir al menos una minuscula")
  .regex(/[A-Z]/, "Debe incluir al menos una mayuscula")
  .regex(/[0-9]/, "Debe incluir al menos un numero");

export const registerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(255),
  password: passwordSchema,
  businessName: z.string().min(2).max(120),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
