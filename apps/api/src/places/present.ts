import type { Place } from "@amlak/shared";
import type { AuthUser } from "../auth/tokens.ts";
import type { Place as PlaceRow } from "../generated/prisma/client.ts";

export function toPlace(row: PlaceRow, role: AuthUser["role"]): Place {
	const place: Place = {
		id: row.id,
		owner_id: row.owner_id,
		place_name: row.place_name,
		place_type: row.place_type,
		description: row.description,
		address: row.address,
		city: row.city,
		latitude: row.latitude?.toNumber() ?? null,
		longitude: row.longitude?.toNumber() ?? null,
		status: row.status,
		currency: row.currency,
		timezone: row.timezone,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
	if (role !== "WORKER") {
		place.monthly_maintenance_budget =
			row.monthly_maintenance_budget?.toNumber() ?? null;
	}
	return place;
}
