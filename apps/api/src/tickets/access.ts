import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
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
