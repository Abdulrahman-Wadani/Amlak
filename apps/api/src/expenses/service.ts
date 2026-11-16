import { randomUUID } from "node:crypto";
import type {
	CreateExpenseInput,
	Expense,
	ListExpensesQuery,
	Paginated,
	UpdateExpenseInput,
} from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { toDbDate } from "../dates.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Prisma } from "../generated/prisma/client.ts";
import { type Page, paginated } from "../pagination.ts";
import { findPlaceFor } from "../places/access.ts";
import { type ImageFile, removeImage, storeImage } from "../uploads/storage.ts";
import { expenseInclude, findExpenseFor } from "./access.ts";
import { auditValues, toExpense } from "./present.ts";

export async function listExpenses(
	manager: AuthUser,
	placeId: string,
	query: ListExpensesQuery,
	page: Page,
): Promise<Paginated<Expense>> {
	const place = await findPlaceFor(manager, placeId);
	const where: Prisma.ExpenseWhereInput = {
		place_id: place.id,
		category: query.category,
	};
	if (query.from || query.to) {
		where.expense_date = {};
		if (query.from) {
			where.expense_date.gte = toDbDate(query.from);
		}
		if (query.to) {
			where.expense_date.lte = toDbDate(query.to);
		}
	}
	const [rows, total] = await prisma.$transaction([
		prisma.expense.findMany({
			where,
			include: expenseInclude,
			orderBy: [
				{ expense_date: "desc" },
				{ created_at: "desc" },
				{ id: "asc" },
			],
			skip: page.skip,
			take: page.take,
		}),
		prisma.expense.count({ where }),
	]);
	return paginated(await Promise.all(rows.map(toExpense)), total, page);
}

export async function getExpense(
	manager: AuthUser,
	expenseId: string,
): Promise<Expense> {
	return toExpense(await findExpenseFor(manager, expenseId));
}

export async function createExpense(
	manager: AuthUser,
	placeId: string,
	input: CreateExpenseInput,
	receipt: ImageFile | undefined,
	ipAddress: string | undefined,
): Promise<Expense> {
	const place = await findPlaceFor(manager, placeId);
	if (input.ticket_id) {
		await assertTicketInPlace(input.ticket_id, place.id);
	}

	// The id is made here so the receipt can be stored under it first.
	const expenseId = randomUUID();
	let receiptKey: string | undefined;
	if (receipt) {
		receiptKey = await storeImage(receipt, `expenses/${expenseId}`);
	}

	const row = await prisma.$transaction(async (tx) => {
		const expense = await tx.expense.create({
			data: {
				id: expenseId,
				place_id: place.id,
				created_by: manager.user_id,
				category: input.category,
				amount: input.amount,
				expense_date: toDbDate(input.expense_date),
				description: input.description,
				ticket_id: input.ticket_id,
				receipt_url: receiptKey,
			},
			include: expenseInclude,
		});
		await auditLog(tx, manager.user_id, {
			action: "EXPENSE_CREATE",
			entityType: "Expense",
			entityId: expense.id,
			newValues: auditValues(expense),
			ipAddress,
		});
		return expense;
	});
	return toExpense(row);
}

/**
 * Changes only the fields sent. An empty ticket_id unlinks the ticket, and a
 * new receipt replaces the old one, which is then removed from storage.
 */
export async function updateExpense(
	manager: AuthUser,
	expenseId: string,
	input: UpdateExpenseInput,
	receipt: ImageFile | undefined,
	ipAddress: string | undefined,
): Promise<Expense> {
	const expense = await findExpenseFor(manager, expenseId);
	let ticketId: string | null | undefined = input.ticket_id;
	if (input.ticket_id === "") {
		ticketId = null;
	}
	if (ticketId) {
		await assertTicketInPlace(ticketId, expense.place_id);
	}
	let expenseDate: Date | undefined;
	if (input.expense_date) {
		expenseDate = toDbDate(input.expense_date);
	}
	let receiptKey: string | undefined;
	if (receipt) {
		receiptKey = await storeImage(receipt, `expenses/${expense.id}`);
	}

	const row = await prisma.$transaction(async (tx) => {
		// A field left undefined is not changed.
		const updated = await tx.expense.update({
			where: { id: expense.id },
			data: {
				category: input.category,
				amount: input.amount,
				expense_date: expenseDate,
				description: input.description,
				ticket_id: ticketId,
				receipt_url: receiptKey,
			},
			include: expenseInclude,
		});
		await auditLog(tx, manager.user_id, {
			action: "EXPENSE_UPDATE",
			entityType: "Expense",
			entityId: expense.id,
			oldValues: auditValues(expense),
			newValues: auditValues(updated),
			ipAddress,
		});
		return updated;
	});
	if (receiptKey && expense.receipt_url) {
		await removeReceipt(expense.receipt_url);
	}
	return toExpense(row);
}

/** Deletes the row and its receipt. The audit log keeps the old values. */
export async function deleteExpense(
	manager: AuthUser,
	expenseId: string,
	ipAddress: string | undefined,
): Promise<void> {
	const expense = await findExpenseFor(manager, expenseId);
	await prisma.$transaction(async (tx) => {
		await tx.expense.delete({ where: { id: expense.id } });
		await auditLog(tx, manager.user_id, {
			action: "EXPENSE_DELETE",
			entityType: "Expense",
			entityId: expense.id,
			oldValues: auditValues(expense),
			ipAddress,
		});
	});
	if (expense.receipt_url) {
		await removeReceipt(expense.receipt_url);
	}
}

async function assertTicketInPlace(ticketId: string, placeId: string) {
	const ticket = await prisma.maintenanceTicket.findFirst({
		where: { id: ticketId, place_id: placeId },
		select: { id: true },
	});
	if (!ticket) {
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields: { ticket_id: "This ticket is not in this place" },
		});
	}
}

// The expense is already saved, so a failed removal is logged, not thrown.
async function removeReceipt(key: string): Promise<void> {
	try {
		await removeImage(key);
	} catch (error) {
		console.error("Could not remove the old receipt", key, error);
	}
}
