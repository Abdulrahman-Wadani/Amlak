import type { Language } from "@amlak/shared";
import type {
	NotificationType,
	Prisma,
	PrismaClient,
} from "./generated/prisma/client.ts";

/** An in-app notification's text in one language. */
export type Notice = { title: string; message: string };

export type NotificationEntry = {
	type: NotificationType;
	/** Writes the text in the recipient's language. */
	notice: (language: Language) => Notice;
	senderId?: string;
};

/**
 * Adds an in-app notification to a user's list, written in the user's
 * preferred language.
 */
export async function notify(
	db: PrismaClient | Prisma.TransactionClient,
	userId: string,
	entry: NotificationEntry,
): Promise<void> {
	const recipient = await db.user.findUniqueOrThrow({
		where: { id: userId },
		select: { preferred_language: true },
	});
	const { title, message } = entry.notice(recipient.preferred_language);
	await db.notification.create({
		data: {
			user_id: userId,
			sender_id: entry.senderId,
			type: entry.type,
			title,
			message,
		},
	});
}
