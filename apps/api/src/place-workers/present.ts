import type { PlaceWorker } from "@amlak/shared";
import type { Prisma } from "../generated/prisma/client.ts";

export const placeWorkerInclude = {
	worker: { select: { id: true, fullname: true, phone: true, status: true } },
} satisfies Prisma.PlaceWorkerInclude;

export type PlaceWorkerRow = Prisma.PlaceWorkerGetPayload<{
	include: typeof placeWorkerInclude;
}>;

export function toPlaceWorker(row: PlaceWorkerRow): PlaceWorker {
	return {
		place_id: row.place_id,
		worker: row.worker,
		assigned_by: row.assigned_by,
		assigned_at: row.assigned_at.toISOString(),
	};
}
