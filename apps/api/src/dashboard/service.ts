import type { DashboardQuery, Paginated, PlaceHealth } from "@amlak/shared";
import type { AuthUser } from "../auth/tokens.ts";
import { addMonths, toDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import type { Place as PlaceRow } from "../generated/prisma/client.ts";
import { type Page, paginated } from "../pagination.ts";
import { visiblePlaces } from "../places/access.ts";
import { type PlaceCounts, toPlaceHealth } from "./present.ts";

/** Property and asset health, one row per place the user can see. */
export async function getDashboard(
	user: AuthUser,
	query: DashboardQuery,
	page: Page,
): Promise<Paginated<PlaceHealth>> {
	const where = { ...visiblePlaces(user), id: query.place_id };
	const [places, total] = await prisma.$transaction([
		prisma.place.findMany({
			where,
			orderBy: [{ created_at: "desc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.place.count({ where }),
	]);
	const counts = await countPlaces(places);
	return paginated(
		places.map((place) => toPlaceHealth(place, counts, user.role)),
		total,
		page,
	);
}

/**
 * Counts for a page of places with a few grouped queries, not a query per
 * place. "Today" depends on each place's time zone, so the date-based
 * counts run once per time zone on the page.
 */
async function countPlaces(places: PlaceRow[]): Promise<PlaceCounts> {
	const placeIds = places.map((place) => place.id);
	const [assets, tickets] = await prisma.$transaction([
		prisma.asset.groupBy({
			by: ["place_id", "status"],
			where: { place_id: { in: placeIds }, deleted_at: null },
			_count: { _all: true },
		}),
		prisma.maintenanceTicket.groupBy({
			by: ["place_id", "status"],
			where: {
				place_id: { in: placeIds },
				status: { in: ["PENDING_REVIEW", "APPROVED"] },
			},
			_count: { _all: true },
		}),
	]);
	const counts: PlaceCounts = {
		assets,
		tickets,
		overdue: [],
		checkIns: [],
		checkOuts: [],
		spent: [],
	};

	const timeZones = new Set(places.map((place) => place.timezone));
	for (const timeZone of timeZones) {
		const zonePlaceIds = places
			.filter((place) => place.timezone === timeZone)
			.map((place) => place.id);
		const zoneCounts = await countByDate(zonePlaceIds, timeZone);
		counts.overdue.push(...zoneCounts.overdue);
		counts.checkIns.push(...zoneCounts.checkIns);
		counts.checkOuts.push(...zoneCounts.checkOuts);
		counts.spent.push(...zoneCounts.spent);
	}
	return counts;
}

/** The counts that depend on today's date, for places in one time zone. */
async function countByDate(placeIds: string[], timeZone: string) {
	const today = todayIn(timeZone);
	const monthStart = `${today.slice(0, 7)}-01`;
	const [overdue, checkIns, checkOuts, spent] = await prisma.$transaction([
		prisma.maintenanceTicket.groupBy({
			by: ["place_id"],
			where: {
				place_id: { in: placeIds },
				status: "APPROVED",
				due_date: { lt: toDbDate(today) },
			},
			_count: { _all: true },
		}),
		prisma.booking.groupBy({
			by: ["place_id"],
			where: {
				place_id: { in: placeIds },
				status: "CONFIRMED",
				check_in_date: toDbDate(today),
			},
			_count: { _all: true },
		}),
		prisma.booking.groupBy({
			by: ["place_id"],
			where: {
				place_id: { in: placeIds },
				status: "CHECKED_IN",
				check_out_date: toDbDate(today),
			},
			_count: { _all: true },
		}),
		prisma.expense.groupBy({
			by: ["place_id"],
			where: {
				place_id: { in: placeIds },
				category: "MAINTENANCE",
				expense_date: {
					gte: toDbDate(monthStart),
					lt: toDbDate(addMonths(monthStart, 1)),
				},
			},
			_sum: { amount: true },
		}),
	]);
	return { overdue, checkIns, checkOuts, spent };
}
