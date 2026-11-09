import type { Ticket, TicketAttachment } from "@amlak/shared";
import type { AuthUser } from "../auth/tokens.ts";
import { fromDbDate } from "../dates.ts";
import type { TicketAttachment as AttachmentRow } from "../generated/prisma/client.ts";
import { imageUrl } from "../uploads/storage.ts";
import type { TicketRow } from "./access.ts";

export async function toTicket(
	row: TicketRow,
	role: AuthUser["role"],
): Promise<Ticket> {
	const ticket: Ticket = {
		id: row.id,
		place_id: row.place_id,
		asset_id: row.asset_id,
		periodic_maintenance_id: row.periodic_maintenance_id,
		ticket_type: row.ticket_type,
		priority: row.priority,
		status: row.status,
		description: row.description,
		reporter_id: row.reporter_id,
		assignee_id: row.assignee_id,
		reviewed_by: row.reviewed_by,
		reviewed_at: row.reviewed_at?.toISOString() ?? null,
		rejection_reason: row.rejection_reason,
		actual_cost: row.actual_cost?.toNumber() ?? null,
		due_date: row.due_date ? fromDbDate(row.due_date) : null,
		completed_at: row.completed_at?.toISOString() ?? null,
		completion_notes: row.completion_notes,
		attachments: await Promise.all(row.attachments.map(toAttachment)),
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
	if (role !== "WORKER") {
		ticket.estimated_cost = row.estimated_cost?.toNumber() ?? null;
	}
	return ticket;
}

// file_url holds the photo's S3 key; the response turns it into a signed link.
async function toAttachment(row: AttachmentRow): Promise<TicketAttachment> {
	return {
		id: row.id,
		attachment_type: row.attachment_type,
		file_url: await imageUrl(row.file_url),
		uploaded_by: row.uploaded_by,
		created_at: row.created_at.toISOString(),
	};
}
