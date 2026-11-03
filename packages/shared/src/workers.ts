import { z } from "zod";
import { emailSchema, phoneSchema } from "./auth.ts";
import { LANGUAGES, USER_STATUSES, userSchema } from "./users.ts";

export const workerSchema = userSchema
	.extend({
		assigned_places: z
			.array(z.object({ place_id: z.uuid(), place_name: z.string() }))
			.meta({ description: "Places with an active assignment" }),
	})
	.meta({ id: "Worker" });
export type Worker = z.infer<typeof workerSchema>;

export const createWorkerSchema = z.object({
	fullname: z.string().trim().min(1),
	email: emailSchema,
	phone: phoneSchema,
	preferred_language: z
		.enum(LANGUAGES)
		.optional()
		.meta({ description: "Defaults to the Manager's language" }),
});
export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;

/** Every field is optional. ACTIVE reactivates, DEACTIVATED deactivates. */
export const updateWorkerSchema = z.object({
	fullname: z.string().trim().min(1).optional(),
	phone: phoneSchema.optional(),
	status: z.enum(["ACTIVE", "DEACTIVATED"]).optional(),
});
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;

export const listWorkersQuerySchema = z.object({
	status: z.enum(USER_STATUSES).optional(),
});
export type ListWorkersQuery = z.infer<typeof listWorkersQuerySchema>;
