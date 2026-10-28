import { z } from "zod";

export const assetSchema = z.object({
  id: z.uuid(),
  place_id: z.uuid(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  purchase_date: z.coerce.date().nullable(),
  deleted_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const createAssetSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  status: z.string().min(1).optional(),
  purchase_date: z.coerce.date().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const assetIdSchema = z.object({
  assetId: z.uuid(),
});

export const placeIdSchema = z.object({
  placeId: z.uuid(),
});

export type Asset = z.infer<typeof assetSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;