import type { PlaceHealth } from "@amlak/shared";
import type { AuthUser } from "../auth/tokens.ts";
import {
	type AssetStatus,
	type Place as PlaceRow,
	Prisma,
	type TicketStatus,
} from "../generated/prisma/client.ts";

/** A grouped count: how many rows one place has. */
type Counted = { place_id: string; _count: { _all: number } };

/** The counts for one page of places, as the grouped queries return them. */
export type PlaceCounts = {
	assets: (Counted & { status: AssetStatus })[];
	tickets: (Counted & { status: TicketStatus })[];
	overdue: Counted[];
	checkIns: Counted[];
	checkOuts: Counted[];
	spent: { place_id: string; _sum: { amount: Prisma.Decimal | null } }[];
};

export function toPlaceHealth(
	place: PlaceRow,
	counts: PlaceCounts,
	role: AuthUser["role"],
): PlaceHealth {
	const health: PlaceHealth = {
		place_id: place.id,
		place_name: place.place_name,
		status: place.status,
		assets: {
			GOOD: countOf(withStatus(counts.assets, "GOOD"), place.id),
			NEEDS_MAINTENANCE: countOf(
				withStatus(counts.assets, "NEEDS_MAINTENANCE"),
				place.id,
			),
			UNDER_MAINTENANCE: countOf(
				withStatus(counts.assets, "UNDER_MAINTENANCE"),
				place.id,
			),
			OUT_OF_SERVICE: countOf(
				withStatus(counts.assets, "OUT_OF_SERVICE"),
				place.id,
			),
		},
		open_tickets: {
			PENDING_REVIEW: countOf(
				withStatus(counts.tickets, "PENDING_REVIEW"),
				place.id,
			),
			APPROVED: countOf(withStatus(counts.tickets, "APPROVED"), place.id),
			overdue: countOf(counts.overdue, place.id),
		},
		today: {
			check_ins: countOf(counts.checkIns, place.id),
			check_outs: countOf(counts.checkOuts, place.id),
		},
	};
	if (role !== "WORKER") {
		health.maintenance_budget = budgetOf(place, counts.spent);
	}
	return health;
}

function withStatus<Row extends { status: string }>(
	rows: Row[],
	status: Row["status"],
): Row[] {
	return rows.filter((row) => row.status === status);
}

// A place with no rows in the group has a count of 0.
function countOf(rows: Counted[], placeId: string): number {
	const row = rows.find((candidate) => candidate.place_id === placeId);
	if (!row) {
		return 0;
	}
	return row._count._all;
}

function budgetOf(
	place: PlaceRow,
	spentRows: PlaceCounts["spent"],
): PlaceHealth["maintenance_budget"] {
	if (place.monthly_maintenance_budget === null) {
		return null;
	}
	const row = spentRows.find((candidate) => candidate.place_id === place.id);
	let spent = new Prisma.Decimal(0);
	if (row?._sum.amount) {
		spent = row._sum.amount;
	}
	return {
		currency: place.currency,
		budget: place.monthly_maintenance_budget.toNumber(),
		spent: spent.toNumber(),
		remaining: place.monthly_maintenance_budget.minus(spent).toNumber(),
	};
}
