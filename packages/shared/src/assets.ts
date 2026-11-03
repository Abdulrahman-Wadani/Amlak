import { z } from "zod";

export const ASSET_STATUSES = [
	"GOOD",
	"NEEDS_MAINTENANCE",
	"UNDER_MAINTENANCE",
	"OUT_OF_SERVICE",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const assetSchema = z
	.object({
		id: z.uuid(),
		place_id: z.uuid(),
		name: z.string(),
		type: z.string(),
		status: z.enum(ASSET_STATUSES),
		purchase_date: z.iso.date().nullable(),
		created_at: z.iso.datetime(),
		updated_at: z.iso.datetime(),
	})
	.meta({ id: "Asset" });
export type Asset = z.infer<typeof assetSchema>;

const assetFields = z.object({
	name: z.string().trim().min(1),
	type: z.string().trim().min(1),
	purchase_date: z.iso.date("Use the YYYY-MM-DD format").nullable().optional(),
	status: z.enum(ASSET_STATUSES).optional(),
});

export const createAssetSchema = assetFields;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

/** Every field is optional; send purchase_date as null to clear it. */
export const updateAssetSchema = assetFields.partial();
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const listAssetsQuerySchema = z.object({
	status: z.enum(ASSET_STATUSES).optional(),
});
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
