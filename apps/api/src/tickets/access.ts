import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";

/** Loads a ticket's photos, oldest first. */
export const ticketInclude = {
	attachments: { orderBy: { created_at: "asc" } },
} satisfies Prisma.MaintenanceTicketInclude;

export type TicketRow = Prisma.MaintenanceTicketGetPayload<{
	include: typeof ticketInclude;
}>;

/**
 * The tickets a user may see: a Manager sees every ticket on their places,
 * a Worker sees the ones they reported or are assigned to.
 */
export function visibleTickets(
	user: AuthUser,
): Prisma.MaintenanceTicketWhereInput {
	switch (user.role) {
		case "MANAGER":
			return { place: { owner_id: user.user_id, deleted_at: null } };
		case "WORKER":
			return {
				place: { deleted_at: null },
				OR: [{ reporter_id: user.user_id }, { assignee_id: user.user_id }],
			};
		default:
			throw new AppError("FORBIDDEN", "Your role cannot use tickets");
	}
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
