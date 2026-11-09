import type {
	NotificationType,
	Prisma,
	PrismaClient,
} from "./generated/prisma/client.ts";

export type NotificationEntry = {
	type: NotificationType;
	title: string;
	message: string;
	senderId?: string;
};

/** Adds an in-app notification to a user's list. */
export async function notify(
	db: PrismaClient | Prisma.TransactionClient,
	userId: string,
	entry: NotificationEntry,
): Promise<void> {
	await db.notification.create({
		data: {
			user_id: userId,
			sender_id: entry.senderId,
			type: entry.type,
			title: entry.title,
			message: entry.message,
		},
	});
}
