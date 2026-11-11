import type {
	Booking,
	CancelBookingInput,
	CreateBookingInput,
	ListBookingsQuery,
	Paginated,
} from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { toDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { BookingStatus, Prisma } from "../generated/prisma/client.ts";
import { type Page, paginated } from "../pagination.ts";
import { findPlaceFor } from "../places/access.ts";
import {
	type BookingRow,
	bookingInclude,
	findBookingFor,
	stayingBookingId,
} from "./access.ts";
import { toBooking } from "./present.ts";

/**
 * The booking calendar: a place's bookings whose stay touches the days
 * from `from` to `to`. A guest who leaves on `from` is not in it.
 */
export async function listBookings(
	user: AuthUser,
	placeId: string,
	query: ListBookingsQuery,
	page: Page,
): Promise<Paginated<Booking>> {
	const place = await findPlaceFor(user, placeId);
	const where: Prisma.BookingWhereInput = {
		place_id: place.id,
		status: query.status,
		check_in_date: { lte: toDbDate(query.to) },
		check_out_date: { gt: toDbDate(query.from) },
	};
	const [rows, total] = await prisma.$transaction([
		prisma.booking.findMany({
			where,
			include: bookingInclude,
			orderBy: [{ check_in_date: "asc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.booking.count({ where }),
	]);
	const stayingId = await stayingBookingId(prisma, place.id);
	return paginated(
		rows.map((row) => toBooking(row, stayingId)),
		total,
		page,
	);
}

export async function getBooking(
	user: AuthUser,
	bookingId: string,
): Promise<Booking> {
	const row = await findBookingFor(user, bookingId);
	return toBooking(row, await stayingBookingId(prisma, row.place_id));
}

/**
 * A Manager or an assigned Worker adds a booking. Its dates must not overlap
 * a booking whose guest is coming or staying. The check-out day is free, so
 * the next guest can arrive on it.
 */
export async function createBooking(
	user: AuthUser,
	placeId: string,
	input: CreateBookingInput,
	ipAddress: string | undefined,
): Promise<Booking> {
	return prisma.$transaction(async (tx) => {
		const place = await findPlaceFor(user, placeId, tx);
		if (place.status !== "ACTIVE") {
			throw new AppError("VALIDATION_ERROR", "This place is not active", {
				status: place.status,
			});
		}
		// A stay that started earlier can be added late, but not one that is
		// already over.
		if (input.check_out_date < todayIn(place.timezone)) {
			throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
				fields: { check_out_date: "This stay has already ended" },
			});
		}

		await lockPlace(tx, place.id);
		const conflicting = await tx.booking.findFirst({
			where: {
				place_id: place.id,
				status: { in: ["CONFIRMED", "CHECKED_IN"] },
				check_in_date: { lt: toDbDate(input.check_out_date) },
				check_out_date: { gt: toDbDate(input.check_in_date) },
			},
			select: { id: true },
		});
		if (conflicting) {
			throw new AppError("CONFLICT", "These dates overlap another booking", {
				conflicting_booking_id: conflicting.id,
			});
		}

		const booking = await tx.booking.create({
			data: {
				place_id: place.id,
				created_by: user.user_id,
				guest_name: input.guest_name,
				guest_phone: input.guest_phone,
				guest_email: input.guest_email,
				guest_count: input.guest_count,
				check_in_date: toDbDate(input.check_in_date),
				check_out_date: toDbDate(input.check_out_date),
				total_price: input.total_price,
				notes: input.notes,
			},
			include: bookingInclude,
		});
		await auditLog(tx, user.user_id, {
			action: "BOOKING_CREATE",
			entityType: "Booking",
			entityId: booking.id,
			newValues: {
				place_id: booking.place_id,
				guest_name: input.guest_name,
				check_in_date: input.check_in_date,
				check_out_date: input.check_out_date,
				total_price: input.total_price,
				status: booking.status,
			},
			ipAddress,
		});
		return toBooking(booking, await stayingBookingId(tx, place.id));
	});
}

/** Cancels a CONFIRMED booking. Its dates become free for other guests. */
export async function cancelBooking(
	user: AuthUser,
	bookingId: string,
	input: CancelBookingInput,
	ipAddress: string | undefined,
): Promise<Booking> {
	return prisma.$transaction(async (tx) => {
		const booking = await findBookingFor(user, bookingId, tx);
		const cancelled = await moveBooking(tx, booking, "CONFIRMED", {
			status: "CANCELLED",
			cancelled_at: new Date(),
			cancelled_by: user.user_id,
			cancellation_reason: input.reason,
		});
		await auditLog(tx, user.user_id, {
			action: "BOOKING_CANCEL",
			entityType: "Booking",
			entityId: booking.id,
			oldValues: { status: booking.status },
			newValues: {
				status: cancelled.status,
				cancellation_reason: input.reason,
			},
			ipAddress,
		});
		return toBooking(cancelled, await stayingBookingId(tx, booking.place_id));
	});
}

/**
 * Updates the booking only if it still has the expected status, so two
 * requests at once cannot both go through. Otherwise it is a 409.
 */
export async function moveBooking(
	tx: Prisma.TransactionClient,
	booking: BookingRow,
	expected: BookingStatus,
	data: Prisma.BookingUncheckedUpdateManyInput,
): Promise<BookingRow> {
	const { count } = await tx.booking.updateMany({
		where: { id: booking.id, status: expected },
		data,
	});
	if (count === 0) {
		throw new AppError(
			"CONFLICT",
			`This booking is ${booking.status}, not ${expected}`,
			{ status: booking.status },
		);
	}
	return tx.booking.findUniqueOrThrow({
		where: { id: booking.id },
		include: bookingInclude,
	});
}

/**
 * Locks the place's row until the transaction ends. A second booking for
 * the same place waits here, then sees the first one in its overlap check.
 */
async function lockPlace(tx: Prisma.TransactionClient, placeId: string) {
	await tx.$queryRaw`SELECT id FROM places WHERE id = ${placeId}::uuid FOR UPDATE`;
}
