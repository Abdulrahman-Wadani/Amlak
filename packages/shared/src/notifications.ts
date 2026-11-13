import { z } from "zod";
import { paginatedSchema } from "./pagination.ts";
import { ROLES } from "./roles.ts";

export const NOTIFICATION_TYPES = [
	"TICKET_SUBMITTED",
	"TICKET_ASSIGNED",
	"TICKET_REJECTED",
	"TICKET_COMPLETED",
	"MAINTENANCE_REMINDER",
	"MAINTENANCE_OVERDUE",
	"SUPPORT_RESOLVED",
	"ANNOUNCEMENT",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notificationSchema = z
	.object({
		id: z.uuid(),
		type: z.enum(NOTIFICATION_TYPES),
		title: z.string().meta({ description: "In the recipient's language" }),
		message: z.string().meta({ description: "In the recipient's language" }),
		is_read: z.boolean(),
		sender_id: z
			.uuid()
			.nullable()
			.meta({ description: "null for system notifications" }),
		created_at: z.iso.datetime(),
		updated_at: z.iso.datetime(),
	})
	.meta({ id: "Notification" });
export type Notification = z.infer<typeof notificationSchema>;

export const listNotificationsQuerySchema = z.object({
	is_read: z.stringbool().optional(),
});
export type ListNotificationsQuery = z.infer<
	typeof listNotificationsQuerySchema
>;

export const notificationPageSchema = paginatedSchema(
	notificationSchema,
).extend({
	unread_count: z
		.number()
		.int()
		.meta({ description: "All my unread notifications, for the badge" }),
});
export type NotificationPage = z.infer<typeof notificationPageSchema>;

const text = (max: number) => z.string().trim().min(1).max(max);

// The recipients are chosen by role or by list: one of the two, not both.
function hasOneAudience(input: { role?: string; user_ids?: string[] }) {
	if (input.role && input.user_ids) {
		return false;
	}
	if (!input.role && !input.user_ids) {
		return false;
	}
	return true;
}

export const announcementSchema = z
	.object({
		role: z
			.enum(ROLES)
			.optional()
			.meta({ description: "Every ACTIVE user with this role" }),
		user_ids: z
			.array(z.uuid())
			.min(1)
			.max(1000)
			.optional()
			.meta({ description: "These users, if ACTIVE" }),
		title_en: text(200),
		message_en: text(5000),
		title_ar: text(200),
		message_ar: text(5000),
	})
	.refine(hasOneAudience, {
		path: ["role"],
		message: "Send role or user_ids, but not both",
	});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const announcementResultSchema = z.object({
	recipient_count: z.number().int(),
});
export type AnnouncementResult = z.infer<typeof announcementResultSchema>;
