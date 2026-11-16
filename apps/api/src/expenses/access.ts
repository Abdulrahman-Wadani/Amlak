import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Prisma } from "../generated/prisma/client.ts";
import { visiblePlaces } from "../places/access.ts";

export const expenseInclude = {
	place: { select: { currency: true } },
} satisfies Prisma.ExpenseInclude;

export type ExpenseRow = Prisma.ExpenseGetPayload<{
	include: typeof expenseInclude;
}>;

/** Only Managers reach expenses, and only on places they own. */
export async function findExpenseFor(
	manager: AuthUser,
	expenseId: string,
): Promise<ExpenseRow> {
	const expense = await prisma.expense.findFirst({
		where: { id: expenseId, place: visiblePlaces(manager) },
		include: expenseInclude,
	});
	if (!expense) {
		throw new AppError("NOT_FOUND", "Expense not found");
	}
	return expense;
}
