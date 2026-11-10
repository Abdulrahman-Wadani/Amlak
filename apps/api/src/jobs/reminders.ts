import { addDays, fromDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import { sendEmailOrLog } from "../email.ts";
import { notify } from "../notifications.ts";
import { reminderMessage } from "../tickets/messages.ts";

/**
 * Reminds each assignee of their APPROVED tickets due tomorrow, in the
 * place's time zone: an email and an in-app MAINTENANCE_REMINDER, once per
 * ticket. Returns how many reminders were sent.
 */
export async function sendReminders(): Promise<number> {
	const tickets = await prisma.maintenanceTicket.findMany({
		where: {
			status: "APPROVED",
			reminder_sent_at: null,
			place: { deleted_at: null },
		},
		include: { place: true, assignee: true },
	});
	let sent = 0;
	for (const ticket of tickets) {
		const assignee = ticket.assignee;
		if (!assignee || !ticket.due_date) {
			continue;
		}
		const dueDate = fromDbDate(ticket.due_date);
		if (dueDate !== addDays(todayIn(ticket.place.timezone), 1)) {
			continue;
		}

		const message = reminderMessage(assignee.preferred_language, {
			recipientName: assignee.fullname,
			placeName: ticket.place.place_name,
			description: ticket.description,
			dueDate,
		});
		// Marking the ticket first makes the reminder go out once, even when
		// two runs overlap.
		const marked = await prisma.$transaction(async (tx) => {
			const { count } = await tx.maintenanceTicket.updateMany({
				where: { id: ticket.id, status: "APPROVED", reminder_sent_at: null },
				data: { reminder_sent_at: new Date() },
			});
			if (count === 0) {
				return false;
			}
			await notify(tx, assignee.id, {
				type: "MAINTENANCE_REMINDER",
				title: message.subject,
				message: message.summary,
			});
			return true;
		});
		if (!marked) {
			continue;
		}
		await sendEmailOrLog({
			to: assignee.email,
			subject: message.subject,
			text: message.body,
		});
		sent++;
	}
	return sent;
}
