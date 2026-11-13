import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type {
	Place as PlaceRow,
	Prisma,
	PrismaClient,
} from "../generated/prisma/client.ts";

export function visiblePlaces(user: AuthUser): Prisma.PlaceWhereInput {
	switch (user.role) {
		case "MANAGER":
			return { owner_id: user.user_id, deleted_at: null };
		case "WORKER":
			return {
				deleted_at: null,
				place_workers: { some: { worker_id: user.user_id, is_active: true } },
			};
		default:
			throw new AppError("FORBIDDEN", "Your role cannot use places");
	}
}

export async function findPlaceFor(
	user: AuthUser,
	placeId: string,
	db: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<PlaceRow> {
	const place = await db.place.findFirst({
		where: { id: placeId, ...visiblePlaces(user) },
	});
	if (!place) {
		throw new AppError("NOT_FOUND", "Place not found");
	}
	return place;
}
