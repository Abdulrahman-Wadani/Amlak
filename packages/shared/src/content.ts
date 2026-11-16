import { z } from "zod";
import { LANGUAGES } from "./users.ts";

export const webContentSchema = z
	.object({
		id: z.uuid(),
		author_id: z.uuid(),
		title: z.string(),
		language: z.enum(LANGUAGES),
		slug: z.string(),
		body: z.string(),
		is_published: z.boolean(),
		created_at: z.iso.datetime(),
		updated_at: z.iso.datetime(),
	})
	.meta({ id: "WebContent" });
export type WebContent = z.infer<typeof webContentSchema>;

const slugField = z
	.string()
	.trim()
	.max(100)
	.regex(
		/^[a-z0-9]+(-[a-z0-9]+)*$/,
		"Use lowercase letters, digits and single dashes, e.g. about-us",
	)
	.meta({ description: "Unique per language, e.g. about-us" });

export const listContentQuerySchema = z.object({
	language: z.enum(LANGUAGES).optional(),
	slug: z
		.string()
		.optional()
		.meta({ description: "With language, finds one page" }),
});
export type ListContentQuery = z.infer<typeof listContentQuerySchema>;

export const createContentSchema = z.object({
	title: z.string().trim().min(1).max(200),
	language: z.enum(LANGUAGES),
	slug: slugField,
	body: z.string().min(1).max(100_000),
	is_published: z.boolean().default(false),
});
export type CreateContentInput = z.infer<typeof createContentSchema>;

/** Every field is optional. The language cannot change: each translation is its own page. */
export const updateContentSchema = z.object({
	title: z.string().trim().min(1).max(200).optional(),
	slug: slugField.optional(),
	body: z.string().min(1).max(100_000).optional(),
	is_published: z.boolean().optional(),
});
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
