import type { WebContent } from "@amlak/shared";
import type { WebContent as WebContentRow } from "../generated/prisma/client.ts";

export function toWebContent(row: WebContentRow): WebContent {
	return {
		id: row.id,
		author_id: row.author_id,
		title: row.title,
		language: row.language,
		slug: row.slug,
		body: row.body,
		is_published: row.is_published,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
}
