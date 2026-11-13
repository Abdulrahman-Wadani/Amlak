import type { Asset } from "@amlak/shared";
import { fromDbDate } from "../dates.ts";
import type { Asset as AssetRow } from "../generated/prisma/client.ts";

export function toAsset(row: AssetRow): Asset {
	return {
		id: row.id,
		place_id: row.place_id,
		name: row.name,
		type: row.type,
		status: row.status,
		purchase_date: row.purchase_date ? fromDbDate(row.purchase_date) : null,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
}
