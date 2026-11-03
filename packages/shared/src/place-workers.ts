import { z } from "zod";
import { USER_STATUSES } from "./users.ts";

export const placeWorkerSchema = z
	.object({
		place_id: z.uuid(),
		worker: z.object({
			id: z.uuid(),
			fullname: z.string(),
			phone: z.string(),
			status: z.enum(USER_STATUSES),
		}),
		assigned_by: z.uuid(),
		assigned_at: z.iso.datetime(),
	})
	.meta({ id: "PlaceWorker" });
export type PlaceWorker = z.infer<typeof placeWorkerSchema>;

export const assignWorkerSchema = z.object({
	worker_id: z
		.uuid()
		.meta({ description: "One of your workers who is not DEACTIVATED" }),
});
export type AssignWorkerInput = z.infer<typeof assignWorkerSchema>;
