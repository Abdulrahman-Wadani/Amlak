import type {
	ApproveTicketInput,
	ReassignTicketInput,
	RejectTicketInput,
	Ticket,
} from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { fromDbDate, toDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type {
	Place,
	Prisma,
	TicketStatus,
} from "../generated/prisma/client.ts";
import { notify } from "../notifications.ts";
import { findTicketFor, type TicketRow, ticketInclude } from "./access.ts";
import { toTicketWithPhotos } from "./present.ts";

/**
 * The Manager approves a ticket that waits for review: they choose who does
 * the work and by when. The ticket's asset now needs maintenance.
 */
export async function approveTicket(
	manager: AuthUser,
	ticketId: string,
	input: ApproveTicketInput,
	ipAddress: string | undefined,
): Promise<Ticket> {
	const row = await prisma.$transaction(async (tx) => {
		const ticket = await findTicketFor(manager, ticketId, tx);
		const place = await tx.place.findUniqueOrThrow({
			where: { id: ticket.place_id },
		});
		await assertCanBeAssignee(tx, input.assignee_id, place);
		assertNotPast(input.due_date, place.timezone);

		const approved = await moveTicket(tx, ticket, "PENDING_REVIEW", {
			status: "APPROVED",
			assignee_id: input.assignee_id,
			due_date: toDbDate(input.due_date),
			estimated_cost: input.estimated_cost,
			reviewed_by: manager.user_id,
			reviewed_at: new Date(),
		});
		if (ticket.asset_id) {
			await tx.asset.update({
				where: { id: ticket.asset_id },
				data: { status: "NEEDS_MAINTENANCE" },
			});
		}
		await auditLog(tx, manager.user_id, {
			action: "TICKET_APPROVE",
			entityType: "MaintenanceTicket",
			entityId: ticket.id,
			oldValues: { status: ticket.status },
			newValues: {
				status: approved.status,
				assignee_id: input.assignee_id,
				due_date: input.due_date,
				estimated_cost: input.estimated_cost ?? null,
			},
			ipAddress,
		});
		await notifyAssignee(tx, manager, approved, place);
		return approved;
	});
	return toTicketWithPhotos(row, manager.role);
}

/** The Manager rejects a ticket that waits for review, with a reason. */
export async function rejectTicket(
	manager: AuthUser,
	ticketId: string,
	input: RejectTicketInput,
	ipAddress: string | undefined,
): Promise<Ticket> {
	const row = await prisma.$transaction(async (tx) => {
		const ticket = await findTicketFor(manager, ticketId, tx);
		const rejected = await moveTicket(tx, ticket, "PENDING_REVIEW", {
			status: "REJECTED",
			rejection_reason: input.reason,
			reviewed_by: manager.user_id,
			reviewed_at: new Date(),
		});
		await auditLog(tx, manager.user_id, {
			action: "TICKET_REJECT",
			entityType: "MaintenanceTicket",
			entityId: ticket.id,
			oldValues: { status: ticket.status },
			newValues: { status: rejected.status, rejection_reason: input.reason },
			ipAddress,
		});
		// Scheduler tickets have no reporter, and nobody is told about their
		// own action.
		if (ticket.reporter_id && ticket.reporter_id !== manager.user_id) {
			await notify(tx, ticket.reporter_id, {
				type: "TICKET_REJECTED",
				title: "Maintenance ticket rejected",
				message: `${ticket.description}: ${input.reason}`,
				senderId: manager.user_id,
			});
		}
		return rejected;
	});
	return toTicketWithPhotos(row, manager.role);
}

/**
 * The Manager gives an approved ticket a new assignee and due date. The
 * reminders start over for the new date.
 */
export async function reassignTicket(
	manager: AuthUser,
	ticketId: string,
	input: ReassignTicketInput,
	ipAddress: string | undefined,
): Promise<Ticket> {
	const row = await prisma.$transaction(async (tx) => {
		const ticket = await findTicketFor(manager, ticketId, tx);
		const place = await tx.place.findUniqueOrThrow({
			where: { id: ticket.place_id },
		});
		await assertCanBeAssignee(tx, input.assignee_id, place);
		assertNotPast(input.due_date, place.timezone);

		const changed = await moveTicket(tx, ticket, "APPROVED", {
			assignee_id: input.assignee_id,
			due_date: toDbDate(input.due_date),
			reminder_sent_at: null,
			overdue_alert_sent_at: null,
		});
		await auditLog(tx, manager.user_id, {
			action: "TICKET_REASSIGN",
			entityType: "MaintenanceTicket",
			entityId: ticket.id,
			oldValues: {
				assignee_id: ticket.assignee_id,
				due_date: ticket.due_date ? fromDbDate(ticket.due_date) : null,
			},
			newValues: { assignee_id: input.assignee_id, due_date: input.due_date },
			ipAddress,
		});
		await notifyAssignee(tx, manager, changed, place);
		return changed;
	});
	return toTicketWithPhotos(row, manager.role);
}

/**
 * Updates the ticket only if it still has the expected status, so two
 * requests at once cannot both go through. Otherwise it is a 409.
 */
export async function moveTicket(
	tx: Prisma.TransactionClient,
	ticket: TicketRow,
	expected: TicketStatus,
	data: Prisma.MaintenanceTicketUncheckedUpdateManyInput,
): Promise<TicketRow> {
	const { count } = await tx.maintenanceTicket.updateMany({
		where: { id: ticket.id, status: expected },
		data,
	});
	if (count === 0) {
		throw new AppError(
			"CONFLICT",
			`This ticket is ${ticket.status}, not ${expected}`,
			{ status: ticket.status },
		);
	}
	return tx.maintenanceTicket.findUniqueOrThrow({
		where: { id: ticket.id },
		include: ticketInclude,
	});
}

/**
 * The assignee is an ACTIVE worker assigned to the place, or the place's
 * owner, so a Manager without workers can handle their own tickets.
 */
async function assertCanBeAssignee(
	tx: Prisma.TransactionClient,
	assigneeId: string,
	place: Place,
) {
	if (assigneeId === place.owner_id) {
		return;
	}
	const assignment = await tx.placeWorker.findFirst({
		where: {
			place_id: place.id,
			worker_id: assigneeId,
			is_active: true,
			worker: { status: "ACTIVE" },
		},
		select: { id: true },
	});
	if (!assignment) {
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields: {
				assignee_id: "Choose an active worker on this place, or yourself",
			},
		});
	}
}

function assertNotPast(date: string, timeZone: string) {
	if (date < todayIn(timeZone)) {
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields: { due_date: "The due date cannot be in the past" },
		});
	}
}

// A Manager who assigns the ticket to themselves needs no notification.
async function notifyAssignee(
	tx: Prisma.TransactionClient,
	manager: AuthUser,
	ticket: TicketRow,
	place: Place,
) {
	if (!ticket.assignee_id || ticket.assignee_id === manager.user_id) {
		return;
	}
	const due = ticket.due_date ? fromDbDate(ticket.due_date) : "";
	await notify(tx, ticket.assignee_id, {
		type: "TICKET_ASSIGNED",
		title: "Maintenance ticket assigned to you",
		message: `${place.place_name}: ${ticket.description} (due ${due})`,
		senderId: manager.user_id,
	});
}
