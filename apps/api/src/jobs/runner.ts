import { sendOverdueAlerts } from "./overdue.ts";
import { createPreventiveTickets } from "./preventive-tickets.ts";
import { sendReminders } from "./reminders.ts";

const ONE_HOUR = 60 * 60 * 1000;

/**
 * Runs every background job once, in order: new preventive tickets first,
 * since the reminders and alerts then cover them. Each job is safe to run
 * again: what it already did is not done twice. A failure is logged and the
 * API keeps running.
 */
export async function runJobs(): Promise<void> {
	try {
		const tickets = await createPreventiveTickets();
		const reminders = await sendReminders();
		const alerts = await sendOverdueAlerts();
		if (tickets + reminders + alerts > 0) {
			console.log(
				`Jobs: ${tickets} preventive tickets, ${reminders} reminders, ${alerts} overdue alerts`,
			);
		}
	} catch (error) {
		console.error("Jobs failed", error);
	}
}

/**
 * Runs the jobs now and then every hour. Hourly rather than daily, so each
 * place's new day is picked up soon after its own midnight, whatever its
 * time zone.
 */
export function startJobs(): void {
	void runJobs();
	setInterval(runJobs, ONE_HOUR);
}
