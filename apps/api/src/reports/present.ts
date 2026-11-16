import type { ExpenseCategory, PlaceFinancials } from "@amlak/shared";
import type { Place as PlaceRow, Prisma } from "../generated/prisma/client.ts";

// Money stays a Decimal while it is added up, so no cents are lost.
export type Money = Prisma.Decimal;

/** One place's sums for the period, before they become numbers. */
export type PlaceSums = {
	place: PlaceRow;
	income: Money;
	expenses: Money;
	byCategory: Record<ExpenseCategory, Money>;
};

/** The sums as the response shows them: plain numbers. */
export function toPlaceFinancials(sums: PlaceSums): PlaceFinancials {
	return {
		place_id: sums.place.id,
		place_name: sums.place.place_name,
		currency: sums.place.currency,
		total_income: sums.income.toNumber(),
		total_expenses: sums.expenses.toNumber(),
		profit: sums.income.minus(sums.expenses).toNumber(),
		expenses_by_category: {
			MAINTENANCE: sums.byCategory.MAINTENANCE.toNumber(),
			UTILITIES: sums.byCategory.UTILITIES.toNumber(),
			TAXES: sums.byCategory.TAXES.toNumber(),
			CLEANING: sums.byCategory.CLEANING.toNumber(),
			SUPPLIES: sums.byCategory.SUPPLIES.toNumber(),
			OTHER: sums.byCategory.OTHER.toNumber(),
		},
	};
}
