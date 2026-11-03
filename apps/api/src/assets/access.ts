import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type {
	Asset as AssetRow,
	Place as PlaceRow,
	Prisma,
	PrismaClient,
} from "../generated/prisma/client.ts";
import { visiblePlaces } from "../places/access.ts";

export async function findAssetFor(
	user: AuthUser,
	assetId: string,
	db: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<AssetRow & { place: PlaceRow }> {
	const asset = await db.asset.findFirst({
		where: { id: assetId, deleted_at: null, place: visiblePlaces(user) },
		include: { place: true },
	});
	if (!asset) {
		throw new AppError("NOT_FOUND", "Asset not found");
	}
	return asset;
}
