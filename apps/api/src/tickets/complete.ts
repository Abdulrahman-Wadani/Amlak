import type { CompleteTicketInput, Ticket } from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import { notify } from "../notifications.ts";
import { type ImageFile, storeImage } from "../uploads/storage.ts";
import { findTicketFor } from "./access.ts";
import { completedNotice } from "./messages.ts";
import { toTicketWithPhotos } from "./present.ts";
import { moveTicket } from "./review.ts";

/**
 * The assignee finishes an approved ticket with photos of the repaired work.
 * The asset is back to GOOD once it has no other open tickets, and the
 * place's owner is notified.
 */
export async function completeTicket(
	user: AuthUser,
	ticketId: string,
	input: CompleteTicketInput,
	photos: ImageFile[],
	ipAddress: string | undefined,
): Promise<Ticket> {
	if (photos.length === 0) {
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields: { photos: "Add at least one photo of the finished work" },
		});
	}
	const ticket = await findTicketFor(user, ticketId);
	if (ticket.assignee_id !== user.user_id) {
		throw new AppError(
			"FORBIDDEN",
			"Only the assignee can complete this ticket",
		);
	}
	// Checked here so photos are not uploaded for a ticket that cannot be
	// completed. moveTicket checks again, in case another request got there
	// first.
	if (ticket.status !== "APPROVED") {
		throw new AppError(
			"CONFLICT",
			`This ticket is ${ticket.status}, not APPROVED`,
			{ status: ticket.status },
		);
	}

	const photoKeys: string[] = [];
	for (const photo of photos) {
		photoKeys.push(await storeImage(photo, `tickets/${ticket.id}`));
	}

	const row = await prisma.$transaction(async (tx) => {
		await tx.ticketAttachment.createMany({
			data: photoKeys.map((key) => ({
				ticket_id: ticket.id,
				uploaded_by: user.user_id,
				file_url: key,
				attachment_type: "AFTER_REPAIR" as const,
			})),
		});
		const completed = await moveTicket(tx, ticket, "APPROVED", {
			status: "COMPLETED",
			actual_cost: input.actual_cost,
			completion_notes: input.completion_notes || null,
			completed_at: new Date(),
		});
		if (ticket.asset_id) {
			const openTickets = await tx.maintenanceTicket.count({
				where: {
					asset_id: ticket.asset_id,
					status: { in: ["PENDING_REVIEW", "APPROVED"] },
				},
			});
			if (openTickets === 0) {
				await tx.asset.update({
					where: { id: ticket.asset_id },
					data: { status: "GOOD" },
				});
			}
		}
		await auditLog(tx, user.user_id, {
			action: "TICKET_COMPLETE",
			entityType: "MaintenanceTicket",
			entityId: ticket.id,
			oldValues: { status: ticket.status },
			newValues: {
				status: completed.status,
				actual_cost: input.actual_cost,
				completion_notes: completed.completion_notes,
				photos: photoKeys.length,
			},
			ipAddress,
		});
		const place = await tx.place.findUniqueOrThrow({
			where: { id: ticket.place_id },
		});
		if (place.owner_id !== user.user_id) {
			await notify(tx, place.owner_id, {
				type: "TICKET_COMPLETED",
				notice: (language) =>
					completedNotice(language, {
						placeName: place.place_name,
						description: ticket.description,
					}),
				senderId: user.user_id,
			});
		}
		return completed;
	});
	return toTicketWithPhotos(row, user.role);
}
