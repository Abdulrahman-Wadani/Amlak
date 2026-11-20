import type { Language } from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { fromDbDate, toDbDate } from "../dates.ts";
import { AppError } from "../errors.ts";
import type { Place, Prisma } from "../generated/prisma/client.ts";
import { type Notice, notify } from "../notifications.ts";
import { lockPlace } from "./service.ts";

/*
 * Bookings and repairs never share a day. A corrective ticket takes up its
 * due date at its place, from the moment the Manager approves it until it is
 * completed. Preventive (scheduled) maintenance does not take up the place.
 * A stay takes up its nights: from the check-in day up to, not including,
 * the check-out day.
 */

/** A booking whose stay has the repair day among its nights. */
function coversDay(day: string): Prisma.BookingWhereInput {
	return {
		check_in_date: { lte: toDbDate(day) },
		check_out_date: { gt: toDbDate(day) },
	};
}

/**
 * Refuses a new stay when the place has a repair on one of its nights. It is
 * a 409 with the ticket and its day, so the form can say which.
 */
export async function assertNoRepairDuring(
	tx: Prisma.TransactionClient,
	placeId: string,
	checkIn: string,
	checkOut: string,
): Promise<void> {
	const repair = await tx.maintenanceTicket.findFirst({
		where: {
			place_id: placeId,
			ticket_type: "CORRECTIVE",
			status: "APPROVED",
			due_date: { gte: toDbDate(checkIn), lt: toDbDate(checkOut) },
		},
		orderBy: { due_date: "asc" },
		select: { id: true, due_date: true },
	});
	if (repair?.due_date) {
		throw new AppError(
			"CONFLICT",
			"A repair is due at this place during these dates",
			{
				maintenance_ticket_id: repair.id,
				due_date: fromDbDate(repair.due_date),
			},
		);
	}
}

type RepairTicket = {
	id: string;
	ticket_type: string;
	description: string;
	assignee_id: string | null;
};

/**
 * Clears the place for a corrective ticket's repair day, when the Manager
 * approves the ticket or moves it to another day:
 * - a guest already staying that day keeps the stay, so the day is refused
 *   (422 on due_date) and the Manager picks another;
 * - a confirmed booking covering that day is cancelled, with the repair as
 *   its reason, and the ticket's assignee is told to contact the guest.
 * Call it before the ticket is saved, in the same transaction.
 */
export async function clearPlaceForRepair(
	tx: Prisma.TransactionClient,
	manager: AuthUser,
	ticket: RepairTicket,
	place: Place,
	day: string,
	assigneeId: string,
	ipAddress: string | undefined,
): Promise<void> {
	if (ticket.ticket_type !== "CORRECTIVE") return;
	// A booking added at the same moment waits here, then sees the repair.
	await lockPlace(tx, place.id);

	const staying = await tx.booking.findFirst({
		where: { place_id: place.id, status: "CHECKED_IN", ...coversDay(day) },
		select: { id: true, guest_name: true, check_out_date: true },
	});
	if (staying) {
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields: {
				due_date:
					"A guest is staying at the place on this day. Choose a day from their check-out on",
			},
			staying_booking_id: staying.id,
			check_out_date: fromDbDate(staying.check_out_date),
		});
	}

	const booked = await tx.booking.findMany({
		where: { place_id: place.id, status: "CONFIRMED", ...coversDay(day) },
		orderBy: { check_in_date: "asc" },
	});
	if (booked.length === 0) return;

	const { preferred_language } = await tx.user.findUniqueOrThrow({
		where: { id: manager.user_id },
		select: { preferred_language: true },
	});
	const reason = repairReason(preferred_language, day, ticket.description);
	for (const booking of booked) {
		const { count } = await tx.booking.updateMany({
			where: { id: booking.id, status: "CONFIRMED" },
			data: {
				status: "CANCELLED",
				cancelled_at: new Date(),
				cancelled_by: manager.user_id,
				cancellation_reason: reason,
			},
		});
		if (count === 0) continue;
		await auditLog(tx, manager.user_id, {
			action: "BOOKING_CANCEL",
			entityType: "Booking",
			entityId: booking.id,
			oldValues: { status: booking.status },
			newValues: {
				status: "CANCELLED",
				cancellation_reason: reason,
				maintenance_ticket_id: ticket.id,
			},
			ipAddress,
		});
		const facts: CancelledFacts = {
			placeName: place.place_name,
			guestName: booking.guest_name,
			guestPhone: booking.guest_phone,
			checkIn: fromDbDate(booking.check_in_date),
			checkOut: fromDbDate(booking.check_out_date),
			repairDay: day,
		};
		// The assignee contacts the guest, even when it is the Manager.
		await notify(tx, assigneeId, {
			type: "BOOKING_CANCELLED",
			notice: (language) => cancelledForRepairNotice(language, facts),
			senderId: manager.user_id,
		});
	}
}

// The reason kept on the booking, in the Manager's language. Reasons are
// limited to 1000 characters; the description is cut to fit.
function repairReason(language: Language, day: string, description: string) {
	const short =
		description.length > 300 ? `${description.slice(0, 300)}…` : description;
	return language === "ar"
		? `أُلغي بسبب صيانة في ${day}: ${short}`
		: `Cancelled for a repair on ${day}: ${short}`;
}

type CancelledFacts = {
	placeName: string;
	guestName: string;
	guestPhone: string;
	checkIn: string;
	checkOut: string;
	repairDay: string;
};

function cancelledForRepairNotice(
	language: Language,
	facts: CancelledFacts,
): Notice {
	if (language === "ar") {
		return {
			title: `أُلغي حجز في ${facts.placeName} بسبب صيانة: تواصل مع الضيف`,
			message: `${facts.guestName} (${facts.guestPhone})، من ${facts.checkIn} إلى ${facts.checkOut}. الصيانة في ${facts.repairDay}.`,
		};
	}
	return {
		title: `Booking at ${facts.placeName} cancelled for a repair: contact the guest`,
		message: `${facts.guestName} (${facts.guestPhone}), ${facts.checkIn} to ${facts.checkOut}. The repair is on ${facts.repairDay}.`,
	};
}
