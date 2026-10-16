import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	PORT: z.coerce.number().int().positive().default(3001),
	DATABASE_URL: z.url(),
	JWT_SECRET: z.string().min(32),
});

export const config = envSchema.parse(process.env);
