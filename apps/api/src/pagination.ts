import type { Paginated } from "@amlak/shared";
import { z } from "zod";
import { parse } from "./validation.ts";

export const pageQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type Page = {
	page: number;
	pageSize: number;
	skip: number;
	take: number;
};

export function parsePage(query: unknown): Page {
	const { page, page_size } = parse(pageQuerySchema, query);
	return {
		page,
		pageSize: page_size,
		skip: (page - 1) * page_size,
		take: page_size,
	};
}

export function paginated<T>(
	data: T[],
	total: number,
	page: Page,
): Paginated<T> {
	return {
		data,
		pagination: {
			page: page.page,
			page_size: page.pageSize,
			total,
			total_pages: Math.ceil(total / page.pageSize),
		},
	};
}
