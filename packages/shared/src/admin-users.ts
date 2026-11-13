import { z } from "zod";
import { phoneSchema } from "./auth.ts";
import { ROLES } from "./roles.ts";
import { USER_STATUSES } from "./users.ts";

export const listUsersQuerySchema = z.object({
	role: z.enum(ROLES).optional(),
	status: z.enum(USER_STATUSES).optional(),
	search: z
		.string()
		.trim()
		.min(1)
		.max(200)
		.optional()
		.meta({ description: "Part of the name or the email" }),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

/** What an Admin can change on any account. Every field is optional. */
export const adminUpdateUserSchema = z.object({
	fullname: z.string().trim().min(1).optional(),
	phone: phoneSchema.optional(),
	status: z.enum(["ACTIVE", "DEACTIVATED"]).optional().meta({
		description:
			"DEACTIVATED from any status; ACTIVE only for a DEACTIVATED user whose email was verified",
	}),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
