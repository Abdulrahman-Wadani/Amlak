import { z } from "zod";

export const ASSET_STATUSES = [
	"GOOD",
	"NEEDS_MAINTENANCE",
	"UNDER_MAINTENANCE",
	"OUT_OF_SERVICE",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export type Asset = {
	id: string;
	place_id: string;
	name: string;
	type: string;
	status: AssetStatus;
	/** YYYY-MM-DD, or null when unknown. */
	purchase_date: string | null;
	created_at: string;
	updated_at: string;
};

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
