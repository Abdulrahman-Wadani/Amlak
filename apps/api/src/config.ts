import "dotenv/config";
import { z } from "zod";

const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		PORT: z.coerce.number().int().positive().default(3001),
		DATABASE_URL: z.url(),
		JWT_SECRET: z.string().min(32),
		RESEND_API_KEY: z.string().startsWith("re_").optional(),
		EMAIL_FROM: z.string().default("Amlak <onboarding@resend.dev>"),
	})
	.refine((env) => env.NODE_ENV !== "production" || env.RESEND_API_KEY, {
		message: "RESEND_API_KEY is required in production",
		path: ["RESEND_API_KEY"],
	});

export const config = envSchema.parse(process.env);
