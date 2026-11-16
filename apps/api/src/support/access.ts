import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type {
	Prisma,
	PrismaClient,
	SupportTicket as SupportTicketRow,
} from "../generated/prisma/client.ts";

/** Admins see every support ticket; everyone else sees their own. */
export function visibleSupportTickets(
	user: AuthUser,
): Prisma.SupportTicketWhereInput {
	if (user.role === "ADMIN") {
		return {};
	}
	return { user_id: user.user_id };
}

export async function findSupportTicketFor(
	user: AuthUser,
	ticketId: string,
	db: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<SupportTicketRow> {
	const ticket = await db.supportTicket.findFirst({
		where: { id: ticketId, ...visibleSupportTickets(user) },
	});
	if (!ticket) {
		throw new AppError("NOT_FOUND", "Support ticket not found");
	}
	return ticket;
}
