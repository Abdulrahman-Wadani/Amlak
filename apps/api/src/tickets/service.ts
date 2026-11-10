import { randomUUID } from "node:crypto";
import type {
	CreateTicketInput,
	ListTicketsQuery,
	Paginated,
	Ticket,
} from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { toDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Prisma } from "../generated/prisma/client.ts";
import { notify } from "../notifications.ts";
import { type Page, paginated } from "../pagination.ts";
import { findPlaceFor, visiblePlaces } from "../places/access.ts";
import { type ImageFile, storeImage } from "../uploads/storage.ts";
import {
	findTicketFor,
	ticketInclude,
	ticketListInclude,
	visibleTickets,
} from "./access.ts";
import { submittedNotice } from "./messages.ts";
import { toTicket, toTicketWithPhotos } from "./present.ts";

export async function listTickets(
	user: AuthUser,
	query: ListTicketsQuery,
	page: Page,
): Promise<Paginated<Ticket>> {
	const { overdue, ...filters } = query;
	const where: Prisma.MaintenanceTicketWhereInput = {
		...visibleTickets(user),
		...filters,
	};
	if (overdue === true) {
		where.AND = [await overdueTickets(user)];
	}
	if (overdue === false) {
		where.NOT = [await overdueTickets(user)];
	}
	const [rows, total] = await prisma.$transaction([
		prisma.maintenanceTicket.findMany({
			where,
			include: ticketListInclude,
			orderBy: [{ created_at: "desc" }, { id: "asc" }],
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
		const ticket = await tx.maintenanceTicket.create({
			data: {
				id: ticketId,
				place_id: place.id,
				asset_id: input.asset_id,
				reporter_id: user.user_id,
				ticket_type: "CORRECTIVE",
				priority: input.priority,
				description: input.description,
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
