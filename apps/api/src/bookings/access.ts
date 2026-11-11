import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { visiblePlaces } from "../places/access.ts";

export const bookingInclude = {
	place: { select: { timezone: true, currency: true } },
} satisfies Prisma.BookingInclude;

export type BookingRow = Prisma.BookingGetPayload<{
	include: typeof bookingInclude;
}>;

/**
 * Bookings follow their place: a Manager sees the bookings on places they
 * own, a Worker sees the bookings on places they are assigned to.
 */
export function visibleBookings(user: AuthUser): Prisma.BookingWhereInput {
	return { place: visiblePlaces(user) };
}

export async function findBookingFor(
	user: AuthUser,
	bookingId: string,
	db: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<BookingRow> {
	const booking = await db.booking.findFirst({
		where: { id: bookingId, ...visibleBookings(user) },
		include: bookingInclude,
	});
	if (!booking) {
		throw new AppError("NOT_FOUND", "Booking not found");
	}
	return booking;
}

/** The booking of the guest staying at the place now, if there is one. */
export async function stayingBookingId(
	db: PrismaClient | Prisma.TransactionClient,
	placeId: string,
): Promise<string | null> {
	const staying = await db.booking.findFirst({
		where: { place_id: placeId, status: "CHECKED_IN" },
		select: { id: true },
	});
	if (!staying) {
		return null;
	}
	return staying.id;
}
