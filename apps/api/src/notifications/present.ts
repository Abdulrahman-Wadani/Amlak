import type { Notification } from "@amlak/shared";
import type { Notification as NotificationRow } from "../generated/prisma/client.ts";

export function toNotification(row: NotificationRow): Notification {
	return {
		id: row.id,
		type: row.type,
		title: row.title,
		message: row.message,
		is_read: row.is_read,
		sender_id: row.sender_id,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
}
