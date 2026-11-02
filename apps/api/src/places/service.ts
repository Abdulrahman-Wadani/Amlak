import type {
	CreatePlaceInput,
	ListPlacesQuery,
	Paginated,
	Place,
	UpdatePlaceInput,
} from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import { type Page, paginated } from "../pagination.ts";
import { findPlaceFor, visiblePlaces } from "./access.ts";
import { toPlace } from "./present.ts";

export async function listPlaces(
	user: AuthUser,
	query: ListPlacesQuery,
	page: Page,
): Promise<Paginated<Place>> {
	const where = { ...visiblePlaces(user), status: query.status };
	const [rows, total] = await prisma.$transaction([
		prisma.place.findMany({
			where,
			orderBy: [{ created_at: "desc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.place.count({ where }),
	]);
	return paginated(
		rows.map((row) => toPlace(row, user.role)),
		total,
		page,
	);
}

export async function getPlace(
	user: AuthUser,
	placeId: string,
): Promise<Place> {
	return toPlace(await findPlaceFor(user, placeId), user.role);
}

export async function createPlace(
	user: AuthUser,
	input: CreatePlaceInput,
): Promise<Place> {
	await assertNameFree(user.user_id, input.place_name);
	const row = await prisma.place.create({
		data: { ...input, owner_id: user.user_id },
	});
	return toPlace(row, user.role);
}

export async function updatePlace(
	user: AuthUser,
	placeId: string,
	input: UpdatePlaceInput,
): Promise<Place> {
	const place = await findPlaceFor(user, placeId);
	if (input.place_name && input.place_name !== place.place_name) {
		await assertNameFree(user.user_id, input.place_name);
	}
	const row = await prisma.place.update({
		where: { id: place.id },
		data: input,
	});
	return toPlace(row, user.role);
}

/**
 * Hides the place everywhere by setting deleted_at. Refused while guests are
 * booked or staying, since their stays would vanish with it.
 */
export async function deletePlace(
	user: AuthUser,
	placeId: string,
	ipAddress: string | undefined,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const place = await findPlaceFor(user, placeId, tx);
		const activeBookings = await tx.booking.findMany({
			where: {
				place_id: place.id,
				status: { in: ["CONFIRMED", "CHECKED_IN"] },
			},
			select: { id: true },
		});
		if (activeBookings.length > 0) {
			throw new AppError(
				"CONFLICT",
				"This place has upcoming or current stays",
				{
					booking_ids: activeBookings.map((booking) => booking.id),
				},
			);
		}
		const deleted = await tx.place.update({
			where: { id: place.id },
			data: { deleted_at: new Date() },
		});
		await auditLog(tx, user.user_id, {
			action: "PLACE_DELETE",
			entityType: "Place",
			entityId: place.id,
			oldValues: toPlace(place, user.role),
			newValues: { deleted_at: deleted.deleted_at?.toISOString() ?? null },
			ipAddress,
		});
	});
}

async function assertNameFree(ownerId: string, placeName: string) {
	const taken = await prisma.place.findFirst({
		where: { owner_id: ownerId, place_name: placeName, deleted_at: null },
		select: { id: true },
	});
	if (taken) {
		throw new AppError("CONFLICT", "You already have a place with this name", {
			fields: { place_name: "You already have a place with this name" },
		});
	}
}
