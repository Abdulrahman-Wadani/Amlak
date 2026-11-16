import type {
	AnnouncementInput,
	AnnouncementResult,
	ListNotificationsQuery,
	Notification,
	NotificationPage,
} from "@amlak/shared";
import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { type Email, sendEmailsOrLog } from "../email.ts";
import { AppError } from "../errors.ts";
import type { Language, Prisma } from "../generated/prisma/client.ts";
import { type Page, paginated } from "../pagination.ts";
import { toNotification } from "./present.ts";

/** My notifications, newest first, with how many are still unread. */
export async function listNotifications(
	user: AuthUser,
	query: ListNotificationsQuery,
	page: Page,
): Promise<NotificationPage> {
	const where = { user_id: user.user_id, is_read: query.is_read };
	const [rows, total, unreadCount] = await prisma.$transaction([
		prisma.notification.findMany({
			where,
			orderBy: [{ created_at: "desc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.notification.count({ where }),
		prisma.notification.count({
			where: { user_id: user.user_id, is_read: false },
		}),
	]);
	return {
		...paginated(rows.map(toNotification), total, page),
		unread_count: unreadCount,
	};
}

/** Marks one of my notifications as read. Marking it again changes nothing. */
export async function markRead(
	user: AuthUser,
	notificationId: string,
): Promise<Notification> {
	const { count } = await prisma.notification.updateMany({
		where: { id: notificationId, user_id: user.user_id },
		data: { is_read: true },
	});
	if (count === 0) {
		throw new AppError("NOT_FOUND", "Notification not found");
	}
	const row = await prisma.notification.findUniqueOrThrow({
		where: { id: notificationId },
	});
	return toNotification(row);
}

/**
 * The Admin sends an announcement to every ACTIVE user with a role, or to a
 * list of users. Each gets it in their language, in-app and by email. The
 * emails go out after the response, so a big announcement does not keep the
 * Admin waiting.
 */
export async function sendAnnouncement(
	admin: AuthUser,
	input: AnnouncementInput,
): Promise<AnnouncementResult> {
	const where: Prisma.UserWhereInput = { status: "ACTIVE" };
	if (input.role) {
		where.role = { name: input.role };
	}
	if (input.user_ids) {
		where.id = { in: input.user_ids };
	}
	const recipients = await prisma.user.findMany({
		where,
		select: { id: true, email: true, preferred_language: true },
	});

	await prisma.notification.createMany({
		data: recipients.map((recipient) => {
			const text = announcementIn(recipient.preferred_language, input);
			return {
				user_id: recipient.id,
				sender_id: admin.user_id,
				type: "ANNOUNCEMENT" as const,
				title: text.title,
				message: text.message,
			};
		}),
	});

	const emails: Email[] = recipients.map((recipient) => {
		const text = announcementIn(recipient.preferred_language, input);
		return { to: recipient.email, subject: text.title, text: text.message };
	});
	void sendEmailsOrLog(emails);
	return { recipient_count: recipients.length };
}

function announcementIn(language: Language, input: AnnouncementInput) {
	if (language === "ar") {
		return { title: input.title_ar, message: input.message_ar };
	}
	return { title: input.title_en, message: input.message_en };
}
