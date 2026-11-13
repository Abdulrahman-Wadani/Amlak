import type { Expense } from "@amlak/shared";
import { fromDbDate } from "../dates.ts";
import { imageUrl } from "../uploads/storage.ts";
import type { ExpenseRow } from "./access.ts";

// receipt_url holds the photo's S3 key; the response turns it into a link.
export async function toExpense(row: ExpenseRow): Promise<Expense> {
	let receiptUrl: string | null = null;
	if (row.receipt_url) {
		receiptUrl = await imageUrl(row.receipt_url);
	}
	return {
		id: row.id,
		place_id: row.place_id,
		ticket_id: row.ticket_id,
		created_by: row.created_by,
		category: row.category,
		description: row.description,
		amount: row.amount.toNumber(),
		currency: row.place.currency,
		expense_date: fromDbDate(row.expense_date),
		receipt_url: receiptUrl,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
}

/** What the audit log keeps: the stored values, with the receipt's key. */
export function auditValues(row: ExpenseRow) {
	return {
		place_id: row.place_id,
		ticket_id: row.ticket_id,
		category: row.category,
		description: row.description,
		amount: row.amount.toNumber(),
		expense_date: fromDbDate(row.expense_date),
		receipt: row.receipt_url,
	};
}
