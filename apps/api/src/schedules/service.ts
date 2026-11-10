import type { CreateScheduleInput, Paginated, Schedule } from "@amlak/shared";
import { findAssetFor } from "../assets/access.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { toDbDate, todayIn } from "../dates.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import { type Page, paginated } from "../pagination.ts";
import { visiblePlaces } from "../places/access.ts";
import { assertCanBeAssignee } from "../tickets/access.ts";
import { toSchedule } from "./present.ts";

/** An asset's active schedules. Stopped schedules are not listed. */
export async function listSchedules(
	user: AuthUser,
	assetId: string,
	page: Page,
): Promise<Paginated<Schedule>> {
	const asset = await findAssetFor(user, assetId);
	const where = { asset_id: asset.id, is_active: true };
	const [rows, total] = await prisma.$transaction([
		prisma.periodicMaintenance.findMany({
			where,
			orderBy: [{ next_due_date: "asc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.periodicMaintenance.count({ where }),
	]);
	return paginated(rows.map(toSchedule), total, page);
}

export async function createSchedule(
	manager: AuthUser,
	assetId: string,
	input: CreateScheduleInput,
): Promise<Schedule> {
	const asset = await findAssetFor(manager, assetId);
	if (input.next_due_date < todayIn(asset.place.timezone)) {
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields: { next_due_date: "The date cannot be in the past" },
		});
	}
	if (input.default_assignee_id) {
		await assertCanBeAssignee(
			prisma,
			input.default_assignee_id,
			asset.place,
			"default_assignee_id",
		);
	}
	const row = await prisma.periodicMaintenance.create({
		data: {
			asset_id: asset.id,
			description: input.description,
			interval_count: input.interval_count,
			interval_unit: input.interval_unit,
			next_due_date: toDbDate(input.next_due_date),
			lead_days: input.lead_days,
			default_assignee_id: input.default_assignee_id,
		},
	});
	return toSchedule(row);
}

/**
 * Stops a schedule; it is never deleted. Tickets it already created stay.
 * To change a schedule, stop it and create a new one.
 */
export async function stopSchedule(
	manager: AuthUser,
	scheduleId: string,
): Promise<void> {
	const { count } = await prisma.periodicMaintenance.updateMany({
		where: {
			id: scheduleId,
			is_active: true,
			asset: { deleted_at: null, place: visiblePlaces(manager) },
		},
		data: { is_active: false },
	});
	if (count === 0) {
		throw new AppError("NOT_FOUND", "Schedule not found");
	}
}
