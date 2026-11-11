import type { Booking } from "@amlak/shared";
import { fromDbDate, todayIn } from "../dates.ts";
import type { BookingRow } from "./access.ts";

/**
 * `stayingId` is the place's CHECKED_IN booking, if any. While another guest
 * is staying, the next one cannot be checked in.
 */
export function toBooking(row: BookingRow, stayingId: string | null): Booking {
	const checkInDate = fromDbDate(row.check_in_date);
	return {
		id: row.id,
		place_id: row.place_id,
		created_by: row.created_by,
		guest_name: row.guest_name,
		guest_phone: row.guest_phone,
		guest_email: row.guest_email,
		guest_count: row.guest_count,
		check_in_date: checkInDate,
		check_out_date: fromDbDate(row.check_out_date),
		total_price: row.total_price.toNumber(),
		currency: row.place.currency,
		status: row.status,
		notes: row.notes,
		ready_for_check_in:
			row.status === "CONFIRMED" &&
			checkInDate <= todayIn(row.place.timezone) &&
			stayingId === null,
		cancelled_at: row.cancelled_at?.toISOString() ?? null,
		cancelled_by: row.cancelled_by,
		cancellation_reason: row.cancellation_reason,
		checked_in_at: row.checked_in_at?.toISOString() ?? null,
		checked_in_by: row.checked_in_by,
		checked_out_at: row.checked_out_at?.toISOString() ?? null,
		checked_out_by: row.checked_out_by,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
}
