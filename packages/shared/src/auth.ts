import { z } from "zod";
import { LANGUAGES } from "./users.ts";

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
