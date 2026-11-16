import { z } from "zod";

export const financialReportQuerySchema = z
	.object({
		from: z.iso.date("Use the YYYY-MM-DD format"),
		to: z.iso.date("Use the YYYY-MM-DD format"),
		place_id: z
			.uuid()
			.optional()
			.meta({ description: "One place; otherwise all your places" }),
	})
	.refine((query) => query.to >= query.from, {
		path: ["to"],
		message: "Must be on or after from",
	});
export type FinancialReportQuery = z.infer<typeof financialReportQuerySchema>;

const money = z.number();

export const placeFinancialsSchema = z
	.object({
		place_id: z.uuid(),
		place_name: z.string(),
		currency: z.string(),
		total_income: money.meta({
			description:
				"total_price of bookings that are not CANCELLED and check in during the period",
		}),
		total_expenses: money.meta({
			description: "Expenses dated in the period",
		}),
		profit: money.meta({ description: "Income minus expenses" }),
		expenses_by_category: z
			.object({
				MAINTENANCE: money,
				UTILITIES: money,
				TAXES: money,
				CLEANING: money,
				SUPPLIES: money,
				OTHER: money,
			})
			.meta({ description: "One key per category, 0 when empty" }),
	})
	.meta({ id: "FinancialReport" });
export type PlaceFinancials = z.infer<typeof placeFinancialsSchema>;

export const currencyTotalsSchema = z.object({
	currency: z.string(),
	total_income: money,
	total_expenses: money,
	profit: money,
});
export type CurrencyTotals = z.infer<typeof currencyTotalsSchema>;

export const financialReportSchema = z.object({
	period: z.object({ from: z.iso.date(), to: z.iso.date() }),
	places: z.array(placeFinancialsSchema),
	totals_by_currency: z.array(currencyTotalsSchema).meta({
		description:
			"Places can use different currencies, so totals are per currency",
	}),
});
export type FinancialReport = z.infer<typeof financialReportSchema>;
