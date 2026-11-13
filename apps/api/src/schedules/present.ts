import type { Schedule } from "@amlak/shared";
import { fromDbDate } from "../dates.ts";
import type { PeriodicMaintenance as ScheduleRow } from "../generated/prisma/client.ts";

export function toSchedule(row: ScheduleRow): Schedule {
	return {
		id: row.id,
		asset_id: row.asset_id,
		description: row.description,
		interval_count: row.interval_count,
		interval_unit: row.interval_unit,
		next_due_date: fromDbDate(row.next_due_date),
		lead_days: row.lead_days,
		default_assignee_id: row.default_assignee_id,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
}
