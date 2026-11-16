import type {
	CreateSupportTicketInput,
	ListSupportTicketsQuery,
	Paginated,
	ResolveSupportTicketInput,
	SupportTicket,
} from "@amlak/shared";
import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { sendEmail } from "../email.ts";
import { AppError } from "../errors.ts";
import { notify } from "../notifications.ts";
import { type Page, paginated } from "../pagination.ts";
import { findSupportTicketFor, visibleSupportTickets } from "./access.ts";
import { resolvedEmail, resolvedNotice } from "./messages.ts";
import { toSupportTicket } from "./present.ts";

export async function listSupportTickets(
	user: AuthUser,
	query: ListSupportTicketsQuery,
	page: Page,
): Promise<Paginated<SupportTicket>> {
	const where = { ...visibleSupportTickets(user), status: query.status };
	const [rows, total] = await prisma.$transaction([
		prisma.supportTicket.findMany({
			where,
			orderBy: [{ created_at: "desc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.supportTicket.count({ where }),
	]);
	return paginated(rows.map(toSupportTicket), total, page);
}

export async function getSupportTicket(
	user: AuthUser,
	ticketId: string,
): Promise<SupportTicket> {
	return toSupportTicket(await findSupportTicketFor(user, ticketId));
}

export async function createSupportTicket(
	user: AuthUser,
	input: CreateSupportTicketInput,
): Promise<SupportTicket> {
	const row = await prisma.supportTicket.create({
		data: {
			user_id: user.user_id,
			subject: input.subject,
			description: input.description,
		},
	});
	return toSupportTicket(row);
}

/**
 * The Admin answers an OPEN ticket. The submitter is notified in-app and by
 * email. If the problem comes back, they submit a new ticket.
 */
export async function resolveSupportTicket(
	admin: AuthUser,
	ticketId: string,
	input: ResolveSupportTicketInput,
): Promise<SupportTicket> {
	const row = await prisma.$transaction(async (tx) => {
		const ticket = await findSupportTicketFor(admin, ticketId, tx);
		// Only an OPEN ticket changes, so two Admins cannot both resolve it.
		const { count } = await tx.supportTicket.updateMany({
			where: { id: ticket.id, status: "OPEN" },
			data: {
				status: "RESOLVED",
				admin_response: input.admin_response,
				resolved_by: admin.user_id,
				resolved_at: new Date(),
			},
		});
		if (count === 0) {
			throw new AppError("CONFLICT", "This support ticket is already resolved");
		}
		await notify(tx, ticket.user_id, {
			type: "SUPPORT_RESOLVED",
			notice: (language) =>
				resolvedNotice(language, {
					subject: ticket.subject,
					response: input.admin_response,
				}),
			senderId: admin.user_id,
		});
		return tx.supportTicket.findUniqueOrThrow({ where: { id: ticket.id } });
	});

	void emailSubmitter(row.user_id, {
		subject: row.subject,
		response: input.admin_response,
	});
	return toSupportTicket(row);
}

/** Emails the Admin's response to the submitter. A failure is logged. */
async function emailSubmitter(
	userId: string,
	facts: { subject: string; response: string },
): Promise<void> {
	try {
		const submitter = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
		});
		const email = resolvedEmail(submitter.preferred_language, {
			...facts,
			recipientName: submitter.fullname,
		});
		await sendEmail({
			to: submitter.email,
			subject: email.subject,
			text: email.body,
		});
	} catch (error) {
		console.error("Could not email the support ticket's submitter", error);
	}
}
