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
		RESEND_API_KEY: z.literal("").or(z.string().startsWith("re_")).optional(),
		EMAIL_FROM: z.string().default("Amlak <onboarding@resend.dev>"),
		APP_URL: z.url().default("http://localhost:5173"),
		S3_BUCKET: z.string().min(1),
		S3_REGION: z.string().min(1),
		S3_ACCESS_KEY_ID: z.string().min(1).optional(),
		S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
	})
	.refine((env) => env.NODE_ENV !== "production" || env.RESEND_API_KEY, {
		message: "RESEND_API_KEY is required in production",
		path: ["RESEND_API_KEY"],
	})
	.refine((env) => !env.S3_ACCESS_KEY_ID === !env.S3_SECRET_ACCESS_KEY, {
		message: "Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY together",
		path: ["S3_SECRET_ACCESS_KEY"],
	});

export const config = envSchema.parse(process.env);
