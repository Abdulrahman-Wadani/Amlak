import { addDays, addMonths, fromDbDate, toDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import type { Prisma } from "../generated/prisma/client.ts";
import { notify } from "../notifications.ts";
import { canBeAssignee } from "../tickets/access.ts";
import { emailAssignee, reminderSentAtOnAssign } from "../tickets/emails.ts";

const scheduleInclude = {
	asset: { include: { place: true } },
} satisfies Prisma.PeriodicMaintenanceInclude;

type ScheduleRow = Prisma.PeriodicMaintenanceGetPayload<{
	include: typeof scheduleInclude;
}>;

// A guard against a loop that never ends; real schedules stop long before.
const MAX_TICKETS_PER_SCHEDULE = 60;

/**
 * Creates a PREVENTIVE ticket for every active schedule whose ticket is due
 * (today ≥ next_due_date − lead_days, in the place's time zone), then moves
 * the schedule to its next date. Returns how many tickets were created.
 */
export async function createPreventiveTickets(): Promise<number> {
	const schedules = await prisma.periodicMaintenance.findMany({
		where: {
			is_active: true,
			asset: { deleted_at: null, place: { deleted_at: null } },
		},
		include: scheduleInclude,
	});
	let created = 0;
	for (const schedule of schedules) {
		let current: ScheduleRow | null = schedule;
		let count = 0;
		while (current && isDue(current) && count < MAX_TICKETS_PER_SCHEDULE) {
			current = await createTicketFor(current);
			if (current) {
				count++;
			}
		}
		created += count;
	}
	return created;
}

function isDue(schedule: ScheduleRow): boolean {
	const dueDate = fromDbDate(schedule.next_due_date);
	const createOn = addDays(dueDate, -schedule.lead_days);
	return createOn <= todayIn(schedule.asset.place.timezone);
}

function nextDueDate(schedule: ScheduleRow): string {
	const dueDate = fromDbDate(schedule.next_due_date);
	const count = schedule.interval_count;
	switch (schedule.interval_unit) {
		case "DAY":
			return addDays(dueDate, count);
		case "WEEK":
			return addDays(dueDate, 7 * count);
		case "MONTH":
			return addMonths(dueDate, count);
		case "YEAR":
			return addMonths(dueDate, 12 * count);
	}
}

/**
 * Moves the schedule forward and creates the ticket for the date it had, in
 * one transaction. The move only happens if the schedule still has that
 * date, so a second run at the same time creates nothing. Returns the moved
 * schedule, or null when another run got there first.
 */
async function createTicketFor(
	schedule: ScheduleRow,
): Promise<ScheduleRow | null> {
	const result = await prisma.$transaction(async (tx) => {
		const { count } = await tx.periodicMaintenance.updateMany({
			where: {
				id: schedule.id,
				is_active: true,
				next_due_date: schedule.next_due_date,
			},
			data: { next_due_date: toDbDate(nextDueDate(schedule)) },
		});
		if (count === 0) {
			return null;
		}

		const place = schedule.asset.place;
		const dueDate = fromDbDate(schedule.next_due_date);
		// The default assignee may have been unassigned or deactivated since
		// the schedule was made. Then the ticket waits for review instead.
		let assigneeId: string | null = null;
		if (
			schedule.default_assignee_id &&
			(await canBeAssignee(tx, schedule.default_assignee_id, place))
		) {
			assigneeId = schedule.default_assignee_id;
		}

		const ticket = await tx.maintenanceTicket.create({
			data: {
				place_id: place.id,
				asset_id: schedule.asset_id,
				periodic_maintenance_id: schedule.id,
				ticket_type: "PREVENTIVE",
				priority: "MEDIUM",
				description: schedule.description,
				status: assigneeId ? "APPROVED" : "PENDING_REVIEW",
				assignee_id: assigneeId,
				due_date: schedule.next_due_date,
				reminder_sent_at: assigneeId
					? reminderSentAtOnAssign(dueDate, place.timezone)
					: null,
			},
		});
		if (assigneeId) {
			await tx.asset.update({
				where: { id: schedule.asset_id },
				data: { status: "NEEDS_MAINTENANCE" },
			});
			await notify(tx, assigneeId, {
				type: "TICKET_ASSIGNED",
				title: "Maintenance ticket assigned to you",
				message: `${place.place_name}: ${schedule.description} (due ${dueDate})`,
			});
		} else {
			await notify(tx, place.owner_id, {
				type: "TICKET_SUBMITTED",
				title: "New maintenance ticket",
				message: `${place.place_name}: ${schedule.description} (due ${dueDate})`,
			});
		}
		const moved = await tx.periodicMaintenance.findUniqueOrThrow({
			where: { id: schedule.id },
			include: scheduleInclude,
		});
		return { moved, assignedTicketId: assigneeId ? ticket.id : null };
	});
	if (!result) {
		return null;
	}
	// The email goes after the transaction, once the ticket is saved.
	if (result.assignedTicketId) {
		await emailAssignee(result.assignedTicketId);
	}
	return result.moved;
}
