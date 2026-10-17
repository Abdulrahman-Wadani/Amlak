import type { z } from "zod";
import { AppError } from "./errors.ts";

export function parse<Schema extends z.ZodType>(
	schema: Schema,
	data: unknown,
): z.infer<Schema> {
	const result = schema.safeParse(data);
	if (!result.success) {
		const fields: Record<string, string> = {};
		for (const issue of result.error.issues) {
			const field = issue.path.join(".") || "body";
			fields[field] ??= issue.message;
		}
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields,
		});
	}
	return result.data;
}
