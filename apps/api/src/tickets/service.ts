import { randomUUID } from "node:crypto";
import type {
	CreateTicketInput,
	ListTicketsQuery,
	Paginated,
	Ticket,
} from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import { notify } from "../notifications.ts";
import { type Page, paginated } from "../pagination.ts";
import { findPlaceFor } from "../places/access.ts";
import { type ImageFile, storeImage } from "../uploads/storage.ts";
import { findTicketFor, ticketInclude, visibleTickets } from "./access.ts";
import { toTicket } from "./present.ts";

export async function listTickets(
	user: AuthUser,
	query: ListTicketsQuery,
	page: Page,
): Promise<Paginated<Ticket>> {
	const where = { ...visibleTickets(user), ...query };
	const [rows, total] = await prisma.$transaction([
		prisma.maintenanceTicket.findMany({
			where,
			include: ticketInclude,
			orderBy: [{ created_at: "desc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.maintenanceTicket.count({ where }),
	]);
	const tickets = await Promise.all(
		rows.map((row) => toTicket(row, user.role)),
	);
	return paginated(tickets, total, page);
}

export async function getTicket(
	user: AuthUser,
	ticketId: string,
): Promise<Ticket> {
	return toTicket(await findTicketFor(user, ticketId), user.role);
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
				title: "New maintenance ticket",
				message: `${place.place_name}: ${ticket.description}`,
				senderId: user.user_id,
			});
		}
		return ticket;
	});
	return toTicket(row, user.role);
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
