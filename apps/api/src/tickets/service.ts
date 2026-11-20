import { randomUUID } from "node:crypto";
import {
	type CreateTicketInput,
	type ListTicketsQuery,
	OPEN_TICKET_STATUSES,
	type Paginated,
	type Ticket,
} from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { clearPlaceForRepair } from "../bookings/repairs.ts";
import { toDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Prisma } from "../generated/prisma/client.ts";
import { notify } from "../notifications.ts";
import { type Page, paginated } from "../pagination.ts";
import { findPlaceFor, visiblePlaces } from "../places/access.ts";
import { type ImageFile, storeImage } from "../uploads/storage.ts";
import {
	assertCanBeAssignee,
	findTicketFor,
	ticketInclude,
	ticketListInclude,
	visibleTickets,
} from "./access.ts";
import { emailAssignee, reminderSentAtOnAssign } from "./emails.ts";
import { submittedNotice } from "./messages.ts";
import { toTicket, toTicketWithPhotos } from "./present.ts";
import { assertNotPast, notifyAssignee } from "./review.ts";

export async function listTickets(
	user: AuthUser,
	query: ListTicketsQuery,
	page: Page,
): Promise<Paginated<Ticket>> {
	const { open, overdue, sort, ...filters } = query;
	const where: Prisma.MaintenanceTicketWhereInput = {
		...visibleTickets(user),
		...filters,
	};
	// Each condition narrows the list, so status=APPROVED&open=true is the
	// APPROVED tickets, and status=COMPLETED&open=true is none.
	const conditions: Prisma.MaintenanceTicketWhereInput[] = [];
	if (open === true) {
		conditions.push({ status: { in: OPEN_TICKET_STATUSES } });
	}
	if (open === false) {
		conditions.push({ status: { notIn: OPEN_TICKET_STATUSES } });
	}
	if (overdue === true) {
		conditions.push(await overdueTickets(user));
	}
	where.AND = conditions;
	if (overdue === false) {
		where.NOT = [await overdueTickets(user)];
	}
	const [rows, total] = await prisma.$transaction([
		prisma.maintenanceTicket.findMany({
			where,
			include: ticketListInclude,
			orderBy: ticketOrder(sort),
			skip: page.skip,
			take: page.take,
		}),
		prisma.maintenanceTicket.count({ where }),
	]);
	return paginated(
		rows.map((row) => toTicket(row, user.role)),
		total,
		page,
	);
}

function ticketOrder(
	sort: ListTicketsQuery["sort"],
): Prisma.MaintenanceTicketOrderByWithRelationInput[] {
	if (sort === "due_date") {
		return [{ due_date: { sort: "asc", nulls: "last" } }, { id: "asc" }];
	}
	return [{ created_at: "desc" }, { id: "asc" }];
}

export async function getTicket(
	user: AuthUser,
	ticketId: string,
): Promise<Ticket> {
	return toTicketWithPhotos(await findTicketFor(user, ticketId), user.role);
}

/**
 * A Worker assigned to the place, or its Manager, reports damage with
 * photos. The ticket waits for the Manager's review, and the Manager is
 * notified unless they reported it themselves.
 *
 * The place's Manager can approve it as they add it, with the approval's
 * fields (assignee, due date, estimated cost): it is saved APPROVED and
 * follows the same rules as an approval, repair day included.
 */
export async function createTicket(
	user: AuthUser,
	placeId: string,
	input: CreateTicketInput,
	photos: ImageFile[],
	ipAddress: string | undefined,
): Promise<Ticket> {
	if (photos.length === 0) {
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields: { photos: "Add at least one photo of the damage" },
		});
	}
	const place = await findPlaceFor(user, placeId);
	const approval =
		input.assignee_id && input.due_date
			? { assigneeId: input.assignee_id, dueDate: input.due_date }
			: null;
	if (approval && place.owner_id !== user.user_id) {
		throw new AppError(
			"FORBIDDEN",
			"Only the place's Manager can approve a ticket",
		);
	}
	if (approval) assertNotPast(approval.dueDate, place.timezone);
	if (input.asset_id) {
		await assertAssetInPlace(input.asset_id, place.id);
	}

	// The id is made here so the photos can be stored under it before the
	// ticket exists. If saving the ticket fails, they stay behind unused.
	const ticketId = randomUUID();
	const photoKeys: string[] = [];
	for (const photo of photos) {
		photoKeys.push(await storeImage(photo, `tickets/${ticketId}`));
	}

	const row = await prisma.$transaction(async (tx) => {
		if (approval) {
			await assertCanBeAssignee(tx, approval.assigneeId, place, "assignee_id");
			await clearPlaceForRepair(
				tx,
				user,
				{
					id: ticketId,
					ticket_type: "CORRECTIVE",
					description: input.description,
					assignee_id: approval.assigneeId,
				},
				place,
				approval.dueDate,
				approval.assigneeId,
				ipAddress,
			);
		}
		const ticket = await tx.maintenanceTicket.create({
			data: {
				id: ticketId,
				place_id: place.id,
				asset_id: input.asset_id,
				reporter_id: user.user_id,
				ticket_type: "CORRECTIVE",
				priority: input.priority,
				description: input.description,
				...(approval && {
					status: "APPROVED" as const,
					assignee_id: approval.assigneeId,
					due_date: toDbDate(approval.dueDate),
					estimated_cost: input.estimated_cost,
					reminder_sent_at: reminderSentAtOnAssign(
						approval.dueDate,
						place.timezone,
					),
					reviewed_by: user.user_id,
					reviewed_at: new Date(),
				}),
				attachments: {
					create: photoKeys.map((key) => ({
						uploaded_by: user.user_id,
						file_url: key,
						attachment_type: "DAMAGE" as const,
					})),
				},
			},
			include: ticketInclude,
		});
		await auditLog(tx, user.user_id, {
			action: "TICKET_CREATE",
			entityType: "MaintenanceTicket",
			entityId: ticket.id,
			newValues: {
				place_id: ticket.place_id,
				asset_id: ticket.asset_id,
				priority: ticket.priority,
				description: ticket.description,
				photos: photoKeys.length,
			},
			ipAddress,
		});
		if (approval) {
			if (ticket.asset_id) {
				await tx.asset.update({
					where: { id: ticket.asset_id },
					data: { status: "NEEDS_MAINTENANCE" },
				});
			}
			await auditLog(tx, user.user_id, {
				action: "TICKET_APPROVE",
				entityType: "MaintenanceTicket",
				entityId: ticket.id,
				oldValues: { status: "PENDING_REVIEW" },
				newValues: {
					status: ticket.status,
					assignee_id: approval.assigneeId,
					due_date: approval.dueDate,
					estimated_cost: input.estimated_cost ?? null,
				},
				ipAddress,
			});
			await notifyAssignee(tx, user, ticket, place);
		}
		if (place.owner_id !== user.user_id) {
			await notify(tx, place.owner_id, {
				type: "TICKET_SUBMITTED",
				notice: (language) =>
					submittedNotice(language, {
						placeName: place.place_name,
						description: ticket.description,
					}),
				senderId: user.user_id,
			});
		}
		return ticket;
	});
	if (row.assignee_id && row.assignee_id !== user.user_id) {
		void emailAssignee(row.id);
	}
	return toTicketWithPhotos(row, user.role);
}

async function assertAssetInPlace(assetId: string, placeId: string) {
	const asset = await prisma.asset.findFirst({
		where: { id: assetId, place_id: placeId, deleted_at: null },
		select: { id: true },
	});
	if (!asset) {
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields: { asset_id: "This asset is not in this place" },
		});
	}
}

/**
 * APPROVED tickets whose due date has passed. "Today" depends on each
 * place's time zone, so the condition is built once per time zone in use.
 */
async function overdueTickets(
	user: AuthUser,
): Promise<Prisma.MaintenanceTicketWhereInput> {
	const zones = await prisma.place.findMany({
		where: visiblePlaces(user),
		distinct: ["timezone"],
		select: { timezone: true },
	});
	return {
		status: "APPROVED",
		OR: zones.map(({ timezone }) => ({
			place: { timezone },
			due_date: { lt: toDbDate(todayIn(timezone)) },
		})),
	};
}
