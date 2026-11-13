import { addDays, fromDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import { sendEmail } from "../email.ts";
import { assignedEmail } from "./messages.ts";

/**
 * Emails the assignee that a ticket is now theirs, in their language. Called
 * after the change is saved. A failure is only logged: the assignment stands
 * and the in-app notification is already there.
 */
export async function emailAssignee(ticketId: string): Promise<void> {
	try {
		const ticket = await prisma.maintenanceTicket.findUniqueOrThrow({
			where: { id: ticketId },
			include: { place: true, assignee: true },
		});
		if (!ticket.assignee || !ticket.due_date) {
			return;
		}
		const email = assignedEmail(ticket.assignee.preferred_language, {
			recipientName: ticket.assignee.fullname,
			placeName: ticket.place.place_name,
			description: ticket.description,
			dueDate: fromDbDate(ticket.due_date),
		});
		await sendEmail({
			to: ticket.assignee.email,
			subject: email.subject,
			text: email.body,
		});
	} catch (error) {
		console.error("Could not email the assignee of ticket", ticketId, error);
	}
}

/**
 * What reminder_sent_at should be when a ticket is assigned. Assigned the
 * day before it is due, or on the day, the assignment email already reminds
 * the assignee, so the reminder counts as sent. Otherwise it stays empty and
 * the reminder job sends it the day before.
 */
export function reminderSentAtOnAssign(
	dueDate: string,
	timeZone: string,
): Date | null {
	const tomorrow = addDays(todayIn(timeZone), 1);
	return dueDate <= tomorrow ? new Date() : null;
}
