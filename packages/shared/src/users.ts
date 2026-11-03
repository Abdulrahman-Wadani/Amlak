import { z } from "zod";
import { ROLES } from "./roles.ts";

export const LANGUAGES = ["ar", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const USER_STATUSES = [
	"INVITED",
	"PENDING_VERIFICATION",
	"ACTIVE",
	"DEACTIVATED",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const userSchema = z
	.object({
		id: z.uuid(),
		email: z.email(),
		fullname: z.string(),
		phone: z.string(),
		picture_url: z.string().nullable(),
		role: z.enum(ROLES),
		status: z.enum(USER_STATUSES),
		preferred_language: z.enum(LANGUAGES),
		email_verified_at: z.iso.datetime().nullable(),
		manager_id: z.uuid().nullable(),
		created_at: z.iso.datetime(),
		updated_at: z.iso.datetime(),
	})
	.meta({ id: "User" });
export type User = z.infer<typeof userSchema>;
