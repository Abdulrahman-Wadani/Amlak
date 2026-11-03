import { z } from "zod";
import { LANGUAGES, userSchema } from "./users.ts";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const passwordSchema = z
	.string()
	.min(8)
	.max(128)
	.regex(/[A-Z]/, "Add at least one uppercase letter")
	.regex(/[a-z]/, "Add at least one lowercase letter")
	.regex(/[^\p{L}\p{N}\s]/u, "Add at least one symbol");

export const phoneSchema = z
	.string()
	.trim()
	.regex(
		/^\+9665[013-9]\d{7}$/,
		"Use a Saudi mobile number, e.g. +966512345678",
	);

export const registerSchema = z.object({
	fullname: z.string().trim().min(1),
	email: emailSchema,
	phone: phoneSchema,
	password: passwordSchema,
	preferred_language: z.enum(LANGUAGES).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const verifyEmailSchema = z.object({
	email: emailSchema,
	code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const verificationCodeSchema = z.object({
	email: emailSchema,
});

export type VerificationCodeInput = z.infer<typeof verificationCodeSchema>;

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

const accessTokenFields = z.object({
	access_token: z.string(),
	token_type: z.literal("Bearer"),
	expires_in: z
		.number()
		.int()
		.meta({ description: "Seconds until it expires" }),
});

export const accessTokenSchema = accessTokenFields.meta({ id: "AccessToken" });
export type AccessToken = z.infer<typeof accessTokenSchema>;

export const loginResponseSchema = accessTokenFields
	.extend({ user: userSchema })
	.meta({ id: "LoginResponse" });
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const accountSetupSchema = z.object({
	email: emailSchema,
	token: z.string().min(1),
	password: passwordSchema,
});
export type AccountSetupInput = z.infer<typeof accountSetupSchema>;
