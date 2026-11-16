import { z } from "zod";

export const EXPENSE_CATEGORIES = [
	"MAINTENANCE",
	"UTILITIES",
	"TAXES",
	"CLEANING",
	"SUPPLIES",
	"OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const expenseSchema = z
	.object({
		id: z.uuid(),
		place_id: z.uuid(),
		ticket_id: z.uuid().nullable(),
		created_by: z.uuid(),
		category: z.enum(EXPENSE_CATEGORIES),
		description: z.string().nullable(),
		amount: z.number(),
		currency: z.string().meta({ description: "The place's currency" }),
		expense_date: z.iso.date(),
		receipt_url: z.string().nullable().meta({
			description: "A signed link to the receipt photo; works for one hour",
		}),
		created_at: z.iso.datetime(),
		updated_at: z.iso.datetime(),
	})
	.meta({ id: "Expense" });
export type Expense = z.infer<typeof expenseSchema>;

// The body is multipart/form-data, so the amount arrives as text.
const amountField = z
	.string()
	.trim()
	.regex(/^\d+(\.\d{1,2})?$/, "Use a number like 320 or 320.50")
	.transform(Number)
	.refine((amount) => amount > 0, "Must be more than 0")
	.meta({ description: "In the place's currency, at most 2 decimals" });

/** The text fields of a new expense; the receipt photo comes as a file. */
export const createExpenseSchema = z.object({
	category: z.enum(EXPENSE_CATEGORIES),
	amount: amountField,
	expense_date: z.iso.date("Use the YYYY-MM-DD format"),
	description: z.string().trim().max(2000).optional(),
	ticket_id: z
		.uuid()
		.optional()
		.meta({ description: "A maintenance ticket of the same place" }),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

/** Every field is optional; a new receipt photo replaces the old one. */
export const updateExpenseSchema = z.object({
	category: z.enum(EXPENSE_CATEGORIES).optional(),
	amount: amountField.optional(),
	expense_date: z.iso.date("Use the YYYY-MM-DD format").optional(),
	description: z.string().trim().max(2000).optional(),
	ticket_id: z
		.union([z.literal(""), z.uuid()])
		.optional()
		.meta({ description: "An empty value unlinks the ticket" }),
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

// Either date can be left out; when both are sent, "to" cannot come first.
function toNotBeforeFrom(query: { from?: string; to?: string }): boolean {
	if (!query.from || !query.to) {
		return true;
	}
	return query.to >= query.from;
}

export const listExpensesQuerySchema = z
	.object({
		from: z.iso
			.date("Use the YYYY-MM-DD format")
			.optional()
			.meta({ description: "On or after this expense_date" }),
		to: z.iso
			.date("Use the YYYY-MM-DD format")
			.optional()
			.meta({ description: "On or before this expense_date" }),
		category: z.enum(EXPENSE_CATEGORIES).optional(),
	})
	.refine(toNotBeforeFrom, {
		path: ["to"],
		message: "Must be on or after from",
	});
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
