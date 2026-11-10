import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type {
	Place as PlaceRow,
	Prisma,
	PrismaClient,
} from "../generated/prisma/client.ts";
import { visiblePlaces } from "../places/access.ts";

export const ticketListInclude = {
	place: { select: { timezone: true } },
} satisfies Prisma.MaintenanceTicketInclude;

export const ticketInclude = {
	...ticketListInclude,
	attachments: { orderBy: [{ created_at: "asc" }, { id: "asc" }] },
} satisfies Prisma.MaintenanceTicketInclude;

export type TicketListRow = Prisma.MaintenanceTicketGetPayload<{
	include: typeof ticketListInclude;
}>;
export type TicketRow = Prisma.MaintenanceTicketGetPayload<{
	include: typeof ticketInclude;
}>;

/**
 * Tickets follow their place: a Manager sees the tickets on places they own,
 * a Worker sees the tickets on places they are assigned to.
 */
export function visibleTickets(
	user: AuthUser,
): Prisma.MaintenanceTicketWhereInput {
	return { place: visiblePlaces(user) };
}

export async function findTicketFor(
	user: AuthUser,
	ticketId: string,
	db: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<TicketRow> {
	const ticket = await db.maintenanceTicket.findFirst({
		where: { id: ticketId, ...visibleTickets(user) },
		include: ticketInclude,
	});
	if (!ticket) {
		throw new AppError("NOT_FOUND", "Ticket not found");
	}
	return ticket;
}

/**
 * The assignee is an ACTIVE worker assigned to the place, or the place's
 * owner, so a Manager without workers can handle their own tickets.
 */
export async function canBeAssignee(
	db: PrismaClient | Prisma.TransactionClient,
	assigneeId: string,
	place: PlaceRow,
): Promise<boolean> {
	if (assigneeId === place.owner_id) {
		return true;
	}
	const assignment = await db.placeWorker.findFirst({
		where: {
			place_id: place.id,
			worker_id: assigneeId,
			is_active: true,
			worker: { status: "ACTIVE" },
		},
		select: { id: true },
	});
	return assignment !== null;
}

/**
 * Throws a 422 when the assignee is not allowed. `field` names the body
 * field in the error, since schedules call it differently.
 */
export async function assertCanBeAssignee(
	db: PrismaClient | Prisma.TransactionClient,
	assigneeId: string,
	place: PlaceRow,
	field: "assignee_id" | "default_assignee_id",
) {
	if (!(await canBeAssignee(db, assigneeId, place))) {
		const fields: Record<string, string> = {};
		fields[field] = "Choose an active worker on this place, or yourself";
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields,
		});
	}
}
