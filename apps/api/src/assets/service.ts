import type {
	Asset,
	CreateAssetInput,
	ListAssetsQuery,
	Paginated,
	UpdateAssetInput,
} from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { toDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import { type Page, paginated } from "../pagination.ts";
import { findPlaceFor } from "../places/access.ts";
import { findAssetFor } from "./access.ts";
import { toAsset } from "./present.ts";

export async function listAssets(
	user: AuthUser,
	placeId: string,
	query: ListAssetsQuery,
	page: Page,
): Promise<Paginated<Asset>> {
	const place = await findPlaceFor(user, placeId);
	const where = { place_id: place.id, deleted_at: null, status: query.status };
	const [rows, total] = await prisma.$transaction([
		prisma.asset.findMany({
			where,
			orderBy: [{ created_at: "desc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.asset.count({ where }),
	]);
	return paginated(rows.map(toAsset), total, page);
}

export async function getAsset(
	user: AuthUser,
	assetId: string,
): Promise<Asset> {
	return toAsset(await findAssetFor(user, assetId));
}

export async function createAsset(
	user: AuthUser,
	placeId: string,
	input: CreateAssetInput,
): Promise<Asset> {
	const place = await findPlaceFor(user, placeId);
	const { purchase_date, ...fields } = input;
	const row = await prisma.asset.create({
		data: {
			...fields,
			place_id: place.id,
			purchase_date: purchaseDate(purchase_date, place.timezone),
		},
	});
	return toAsset(row);
}

export async function updateAsset(
	user: AuthUser,
	assetId: string,
	input: UpdateAssetInput,
): Promise<Asset> {
	const asset = await findAssetFor(user, assetId);
	const { purchase_date, ...fields } = input;
	const row = await prisma.asset.update({
		where: { id: asset.id },
		data: {
			...fields,
			purchase_date: purchaseDate(purchase_date, asset.place.timezone),
		},
	});
	return toAsset(row);
}

export async function deleteAsset(
	user: AuthUser,
	assetId: string,
	ipAddress: string | undefined,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const asset = await findAssetFor(user, assetId, tx);
		const openTickets = await tx.maintenanceTicket.findMany({
			where: {
				asset_id: asset.id,
				status: { in: ["PENDING_REVIEW", "APPROVED"] },
			},
			select: { id: true },
		});
		if (openTickets.length > 0) {
			throw new AppError(
				"CONFLICT",
				"This asset has open maintenance tickets",
				{ ticket_ids: openTickets.map((ticket) => ticket.id) },
			);
		}
		const deletedAt = new Date();
		await tx.asset.update({
			where: { id: asset.id },
			data: { deleted_at: deletedAt },
		});
		await tx.periodicMaintenance.updateMany({
			where: { asset_id: asset.id, is_active: true },
			data: { is_active: false },
		});
		await auditLog(tx, user.user_id, {
			action: "ASSET_DELETE",
			entityType: "Asset",
			entityId: asset.id,
			oldValues: toAsset(asset),
			newValues: { deleted_at: deletedAt.toISOString() },
			ipAddress,
		});
	});
}

function purchaseDate(
	date: string | null | undefined,
	timeZone: string,
): Date | null | undefined {
	if (date === undefined || date === null) {
		return date;
	}
	if (date > todayIn(timeZone)) {
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields: { purchase_date: "The purchase date cannot be in the future" },
		});
	}
	return toDbDate(date);
}
