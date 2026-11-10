import { z } from "zod";

export const INTERVAL_UNITS = ["DAY", "WEEK", "MONTH", "YEAR"] as const;
export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

export const scheduleSchema = z
	.object({
		id: z.uuid(),
		asset_id: z.uuid(),
		description: z.string(),
		interval_count: z.number().int(),
		interval_unit: z.enum(INTERVAL_UNITS),
		next_due_date: z.iso
			.date()
			.meta({ description: "When the next preventive ticket is due" }),
		lead_days: z.number().int(),
		default_assignee_id: z.uuid().nullable(),
		created_at: z.iso.datetime(),
		updated_at: z.iso.datetime(),
	})
	.meta({ id: "PeriodicMaintenance" });
export type Schedule = z.infer<typeof scheduleSchema>;

export const createScheduleSchema = z.object({
	description: z.string().trim().min(1).max(2000),
	interval_count: z.number().int().min(1).max(365).meta({
		description:
			"With interval_unit, how often it repeats: 2 + WEEK is every two weeks",
	}),
	interval_unit: z.enum(INTERVAL_UNITS),
	next_due_date: z.iso.date("Use the YYYY-MM-DD format"),
	lead_days: z.number().int().min(0).max(60).default(7).meta({
		description: "The ticket is created this many days before next_due_date",
	}),
	default_assignee_id: z.uuid().optional().meta({
		description:
			"Who gets the generated tickets: an ACTIVE worker on the place, or its owner",
	}),
});
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
