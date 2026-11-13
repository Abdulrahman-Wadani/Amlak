import type {
	CurrencyTotals,
	ExpenseCategory,
	FinancialReport,
	FinancialReportQuery,
} from "@amlak/shared";
import type { AuthUser } from "../auth/tokens.ts";
import { toDbDate } from "../dates.ts";
import { prisma } from "../db.ts";
import { type Place as PlaceRow, Prisma } from "../generated/prisma/client.ts";
import { findPlaceFor, visiblePlaces } from "../places/access.ts";
import { type Money, type PlaceSums, toPlaceFinancials } from "./present.ts";

type IncomeRow = { place_id: string; _sum: { total_price: Money | null } };
type ExpenseRow = {
	place_id: string;
	category: ExpenseCategory;
	_sum: { amount: Money | null };
};

/**
 * Income, expenses and profit for a period, computed on request. Income is
 * the total_price of bookings that are not CANCELLED and check in during the
 * period; expenses are those dated in it. Tickets' actual_cost never counts.
 */
export async function financialReport(
	manager: AuthUser,
	query: FinancialReportQuery,
): Promise<FinancialReport> {
	const places = await reportPlaces(manager, query.place_id);
	const placeIds = places.map((place) => place.id);
	const from = toDbDate(query.from);
	const to = toDbDate(query.to);
	const [incomeRows, expenseRows] = await prisma.$transaction([
		prisma.booking.groupBy({
			by: ["place_id"],
			where: {
				place_id: { in: placeIds },
				status: { not: "CANCELLED" },
				check_in_date: { gte: from, lte: to },
			},
			_sum: { total_price: true },
		}),
		prisma.expense.groupBy({
			by: ["place_id", "category"],
			where: {
				place_id: { in: placeIds },
				expense_date: { gte: from, lte: to },
			},
			_sum: { amount: true },
		}),
	]);

	const sums = places.map((place) => sumPlace(place, incomeRows, expenseRows));
	return {
		period: { from: query.from, to: query.to },
		places: sums.map(toPlaceFinancials),
		totals_by_currency: totalsByCurrency(sums),
	};
}

/** The one place asked for, or all the Manager's places by name. */
async function reportPlaces(
	manager: AuthUser,
	placeId: string | undefined,
): Promise<PlaceRow[]> {
	if (placeId) {
		return [await findPlaceFor(manager, placeId)];
	}
	return prisma.place.findMany({
		where: visiblePlaces(manager),
		orderBy: [{ place_name: "asc" }, { id: "asc" }],
	});
}

function sumPlace(
	place: PlaceRow,
	incomeRows: IncomeRow[],
	expenseRows: ExpenseRow[],
): PlaceSums {
	const zero = new Prisma.Decimal(0);
	let income = zero;
	const incomeRow = incomeRows.find((row) => row.place_id === place.id);
	if (incomeRow?._sum.total_price) {
		income = incomeRow._sum.total_price;
	}

	const byCategory: Record<ExpenseCategory, Money> = {
		MAINTENANCE: zero,
		UTILITIES: zero,
		TAXES: zero,
		CLEANING: zero,
		SUPPLIES: zero,
		OTHER: zero,
	};
	let expenses = zero;
	for (const row of expenseRows) {
		if (row.place_id === place.id && row._sum.amount) {
			byCategory[row.category] = row._sum.amount;
			expenses = expenses.plus(row._sum.amount);
		}
	}
	return { place, income, expenses, byCategory };
}

/** Riyals and dollars cannot be added together, so each currency has a row. */
function totalsByCurrency(sums: PlaceSums[]): CurrencyTotals[] {
	const totals = new Map<string, { income: Money; expenses: Money }>();
	for (const place of sums) {
		const currency = place.place.currency;
		const current = totals.get(currency) ?? {
			income: new Prisma.Decimal(0),
			expenses: new Prisma.Decimal(0),
		};
		totals.set(currency, {
			income: current.income.plus(place.income),
			expenses: current.expenses.plus(place.expenses),
		});
	}

	const rows: CurrencyTotals[] = [];
	for (const [currency, total] of totals) {
		rows.push({
			currency,
			total_income: total.income.toNumber(),
			total_expenses: total.expenses.toNumber(),
			profit: total.income.minus(total.expenses).toNumber(),
		});
	}
	rows.sort((a, b) => a.currency.localeCompare(b.currency));
	return rows;
}
