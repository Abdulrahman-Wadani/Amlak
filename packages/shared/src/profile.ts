import { z } from "zod";
import { phoneSchema } from "./auth.ts";
import { LANGUAGES } from "./users.ts";

/** Every field is optional; email, role and status cannot change here. */
export const updateProfileSchema = z.object({
	fullname: z.string().trim().min(1).optional(),
	phone: phoneSchema.optional(),
	preferred_language: z.enum(LANGUAGES).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
