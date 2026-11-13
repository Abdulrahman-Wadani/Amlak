import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";

/** Loads a worker's role and their active assignments to places that still exist. */
export const workerInclude = {
	role: true,
	place_assignments: {
		where: { is_active: true, place: { deleted_at: null } },
		include: { place: { select: { id: true, place_name: true } } },
	},
} satisfies Prisma.UserInclude;

export type WorkerRow = Prisma.UserGetPayload<{
	include: typeof workerInclude;
}>;

/** The workers a Manager may see: the ones they created. */
export function myWorkers(manager: AuthUser): Prisma.UserWhereInput {
	return { manager_id: manager.user_id, role: { name: "WORKER" } };
}

export async function findWorkerFor(
	manager: AuthUser,
	workerId: string,
	db: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<WorkerRow> {
	const worker = await db.user.findFirst({
		where: { id: workerId, ...myWorkers(manager) },
		include: workerInclude,
	});
	if (!worker) {
		throw new AppError("NOT_FOUND", "Worker not found");
	}
	return worker;
}
