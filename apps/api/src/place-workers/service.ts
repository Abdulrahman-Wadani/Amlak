import type { AssignWorkerInput, Paginated, PlaceWorker } from "@amlak/shared";
import { auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import { type Page, paginated } from "../pagination.ts";
import { findPlaceFor } from "../places/access.ts";
import { myWorkers } from "../workers/access.ts";
import { placeWorkerInclude, toPlaceWorker } from "./present.ts";

export async function listPlaceWorkers(
	manager: AuthUser,
	placeId: string,
	page: Page,
): Promise<Paginated<PlaceWorker>> {
	const place = await findPlaceFor(manager, placeId);
	const where = { place_id: place.id, is_active: true };
	const [rows, total] = await prisma.$transaction([
		prisma.placeWorker.findMany({
			where,
			include: placeWorkerInclude,
			orderBy: [{ assigned_at: "desc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.placeWorker.count({ where }),
	]);
	return paginated(rows.map(toPlaceWorker), total, page);
}

/**
 * Assigns one of the Manager's workers to their place. A worker who was
 * assigned before gets their earlier row back, since the pair is unique.
 */
export async function assignWorker(
	manager: AuthUser,
	placeId: string,
	input: AssignWorkerInput,
	ipAddress: string | undefined,
): Promise<PlaceWorker> {
	return prisma.$transaction(async (tx) => {
		const place = await findPlaceFor(manager, placeId, tx);
		const worker = await tx.user.findFirst({
			where: {
				id: input.worker_id,
				...myWorkers(manager),
				status: { not: "DEACTIVATED" },
			},
			select: { id: true },
		});
		if (!worker) {
			throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
				fields: {
					worker_id: "Choose one of your workers who is not deactivated",
				},
			});
		}

		const pair = { place_id: place.id, worker_id: worker.id };
		const earlier = await tx.placeWorker.findUnique({
			where: { place_id_worker_id: pair },
		});
		if (earlier?.is_active) {
			throw new AppError(
				"CONFLICT",
				"This worker is already assigned to this place",
			);
		}

		const assignment = {
			is_active: true,
			assigned_by: manager.user_id,
			assigned_at: new Date(),
		};
		const row = await tx.placeWorker.upsert({
			where: { place_id_worker_id: pair },
			create: { ...pair, ...assignment },
			update: assignment,
			include: placeWorkerInclude,
		});
		await auditLog(tx, manager.user_id, {
			action: "WORKER_ASSIGN",
			entityType: "PlaceWorker",
			entityId: row.id,
			newValues: toPlaceWorker(row),
			ipAddress,
		});
		return toPlaceWorker(row);
	});
}

/**
 * Ends an assignment but keeps its row. Refused while the worker still has
 * approved tickets on this place, so no work is left without a worker.
 */
export async function unassignWorker(
	manager: AuthUser,
	placeId: string,
	workerId: string,
	ipAddress: string | undefined,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const place = await findPlaceFor(manager, placeId, tx);
		const assignment = await tx.placeWorker.findFirst({
			where: { place_id: place.id, worker_id: workerId, is_active: true },
			include: placeWorkerInclude,
		});
		if (!assignment) {
			throw new AppError(
				"NOT_FOUND",
				"This worker is not assigned to this place",
			);
		}

		const approvedTickets = await tx.maintenanceTicket.findMany({
			where: { place_id: place.id, assignee_id: workerId, status: "APPROVED" },
			select: { id: true },
		});
		if (approvedTickets.length > 0) {
			throw new AppError(
				"CONFLICT",
				"Reassign this worker's approved tickets on this place first",
				{ ticket_ids: approvedTickets.map((ticket) => ticket.id) },
			);
		}

		await tx.placeWorker.update({
			where: { id: assignment.id },
			data: { is_active: false },
		});
		await auditLog(tx, manager.user_id, {
			action: "WORKER_UNASSIGN",
			entityType: "PlaceWorker",
			entityId: assignment.id,
			oldValues: toPlaceWorker(assignment),
			newValues: { is_active: false },
			ipAddress,
		});
	});
}
