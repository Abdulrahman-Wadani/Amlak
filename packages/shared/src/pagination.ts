import { z } from "zod";

export const paginationSchema = z
	.object({
		page: z.number().int(),
		page_size: z.number().int(),
		total: z.number().int(),
		total_pages: z.number().int(),
	})
	.meta({ id: "Pagination" });
export type Pagination = z.infer<typeof paginationSchema>;

export type Paginated<T> = { data: T[]; pagination: Pagination };

/** The list response shape around an item schema, for the API docs. */
export function paginatedSchema<Item extends z.ZodType>(item: Item) {
	return z.object({ data: z.array(item), pagination: paginationSchema });
}
