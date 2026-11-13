import type { SupportTicket } from "@amlak/shared";
import type { SupportTicket as SupportTicketRow } from "../generated/prisma/client.ts";

export function toSupportTicket(row: SupportTicketRow): SupportTicket {
	return {
		id: row.id,
		user_id: row.user_id,
		subject: row.subject,
		description: row.description,
		status: row.status,
		admin_response: row.admin_response,
		resolved_by: row.resolved_by,
		resolved_at: row.resolved_at?.toISOString() ?? null,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
}
