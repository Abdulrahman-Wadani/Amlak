import type { Booking } from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { fromDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import { type BookingRow, findBookingFor, stayingBookingId } from "./access.ts";
import { toBooking } from "./present.ts";
import { lockPlace, moveBooking } from "./service.ts";

/**
 * Checks the guest in. The booking must be CONFIRMED, its check-in date
 * must have come, and no other guest may be staying at the place.
 */
export async function checkIn(
	user: AuthUser,
	bookingId: string,
	ipAddress: string | undefined,
): Promise<Booking> {
	return prisma.$transaction(async (tx) => {
		const booking = await findBookingFor(user, bookingId, tx);
		// Two guests checking in at once would both see an empty place.
		await lockPlace(tx, booking.place_id);
		const stayingId = await stayingBookingId(tx, booking.place_id);
		// A booking that is not CONFIRMED gets the status error from
		// moveBooking, not a "too early" or "occupied" one.
		if (booking.status === "CONFIRMED") {
			assertReadyForCheckIn(booking, stayingId);
		}
		const checkedIn = await moveBooking(tx, booking, "CONFIRMED", {
			status: "CHECKED_IN",
			checked_in_at: new Date(),
			checked_in_by: user.user_id,
		});
		await auditLog(tx, user.user_id, {
			action: "BOOKING_CHECK_IN",
			entityType: "Booking",
			entityId: booking.id,
			oldValues: { status: booking.status },
			newValues: { status: checkedIn.status },
			ipAddress,
		});
		return toBooking(checkedIn, await stayingBookingId(tx, booking.place_id));
	});
}

/** Checks the guest out. The place is then free for the next guest. */
export async function checkOut(
	user: AuthUser,
	bookingId: string,
	ipAddress: string | undefined,
): Promise<Booking> {
	return prisma.$transaction(async (tx) => {
		const booking = await findBookingFor(user, bookingId, tx);
		const checkedOut = await moveBooking(tx, booking, "CHECKED_IN", {
			status: "CHECKED_OUT",
			checked_out_at: new Date(),
			checked_out_by: user.user_id,
		});
		await auditLog(tx, user.user_id, {
			action: "BOOKING_CHECK_OUT",
			entityType: "Booking",
			entityId: booking.id,
			oldValues: { status: booking.status },
			newValues: { status: checkedOut.status },
			ipAddress,
		});
		return toBooking(checkedOut, await stayingBookingId(tx, booking.place_id));
	});
}

function assertReadyForCheckIn(booking: BookingRow, stayingId: string | null) {
	const today = todayIn(booking.place.timezone);
	if (fromDbDate(booking.check_in_date) > today) {
		throw new AppError(
			"CONFLICT",
			"The guest cannot check in before the check-in date",
			{ reason: "BEFORE_CHECK_IN_DATE" },
		);
	}
	if (stayingId) {
		throw new AppError("CONFLICT", "Another guest is staying at the place", {
			reason: "PLACE_OCCUPIED",
			occupied_by_booking_id: stayingId,
		});
	}
}
