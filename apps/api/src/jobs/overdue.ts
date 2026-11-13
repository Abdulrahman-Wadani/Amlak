import { fromDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import { sendEmailOrLog } from "../email.ts";
import { notify } from "../notifications.ts";
import { overdueEmail, overdueNotice } from "../tickets/messages.ts";

/**
 * Alerts the place's owner about each APPROVED ticket past its due date, in
 * the place's time zone: an email and an in-app MAINTENANCE_OVERDUE, once
 * per ticket. Returns how many alerts were sent.
 */
export async function sendOverdueAlerts(): Promise<number> {
	const tickets = await prisma.maintenanceTicket.findMany({
		where: {
			status: "APPROVED",
			overdue_alert_sent_at: null,
			place: { deleted_at: null },
		},
		include: { place: { include: { owner: true } }, assignee: true },
	});
	let sent = 0;
	for (const ticket of tickets) {
		if (!ticket.due_date) {
			continue;
		}
		const dueDate = fromDbDate(ticket.due_date);
		if (dueDate >= todayIn(ticket.place.timezone)) {
			continue;
		}

		const owner = ticket.place.owner;
		const facts = {
			placeName: ticket.place.place_name,
			description: ticket.description,
			dueDate,
		};
		// Marking the ticket first makes the alert go out once, even when two
		// runs overlap.
		const marked = await prisma.$transaction(async (tx) => {
			const { count } = await tx.maintenanceTicket.updateMany({
				where: {
					id: ticket.id,
					status: "APPROVED",
					overdue_alert_sent_at: null,
				},
				data: { overdue_alert_sent_at: new Date() },
			});
			if (count === 0) {
				return false;
			}
			await notify(tx, owner.id, {
				type: "MAINTENANCE_OVERDUE",
				notice: (language) => overdueNotice(language, facts),
			});
			return true;
		});
		if (!marked) {
			continue;
		}
		const email = overdueEmail(owner.preferred_language, {
			...facts,
			recipientName: owner.fullname,
			assigneeName: ticket.assignee?.fullname ?? "-",
		});
		await sendEmailOrLog({
			to: owner.email,
			subject: email.subject,
			text: email.body,
		});
		sent++;
	}
	return sent;
}
