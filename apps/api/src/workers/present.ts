import type { Worker } from "@amlak/shared";
import { toUser } from "../users/present.ts";
import type { WorkerRow } from "./access.ts";

export async function toWorker(row: WorkerRow): Promise<Worker> {
	return {
		...(await toUser(row)),
		assigned_places: row.place_assignments.map((assignment) => ({
			place_id: assignment.place.id,
			place_name: assignment.place.place_name,
		})),
	};
}
