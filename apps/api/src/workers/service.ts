import type {
	CreateWorkerInput,
	ListWorkersQuery,
	Paginated,
	UpdateWorkerInput,
	Worker,
} from "@amlak/shared";
import { type AuditAction, auditLog } from "../audit.ts";
import { hashCode, newLinkToken } from "../auth/codes.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { config } from "../config.ts";
import { prisma } from "../db.ts";
import { sendEmail } from "../email.ts";
import { AppError } from "../errors.ts";
import { type Page, paginated } from "../pagination.ts";
import {
	findWorkerFor,
	myWorkers,
	type WorkerRow,
	workerInclude,
} from "./access.ts";
import { toWorker } from "./present.ts";

const SETUP_LINK_MS = 7 * 24 * 60 * 60 * 1000;

export async function listWorkers(
	manager: AuthUser,
	query: ListWorkersQuery,
	page: Page,
): Promise<Paginated<Worker>> {
	const where = { ...myWorkers(manager), status: query.status };
	const [rows, total] = await prisma.$transaction([
		prisma.user.findMany({
			where,
			include: workerInclude,
			orderBy: [{ created_at: "desc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.user.count({ where }),
	]);
	return paginated(rows.map(toWorker), total, page);
}

export async function getWorker(
	manager: AuthUser,
	workerId: string,
): Promise<Worker> {
	return toWorker(await findWorkerFor(manager, workerId));
}

/** Creates an INVITED worker with no password and emails the setup link. */
export async function createWorker(
	manager: AuthUser,
	input: CreateWorkerInput,
	ipAddress: string | undefined,
): Promise<Worker> {
	const taken = await prisma.user.findUnique({
		where: { email: input.email },
		select: { id: true },
	});
	if (taken) {
		throw new AppError("CONFLICT", "This email is already registered", {
			fields: { email: "This email is already registered" },
		});
	}

	const token = newLinkToken();
	const worker = await prisma.$transaction(async (tx) => {
		const me = await tx.user.findUniqueOrThrow({
			where: { id: manager.user_id },
			select: { preferred_language: true },
		});
		const workerRole = await tx.role.findUniqueOrThrow({
			where: { name: "WORKER" },
		});
		const row = await tx.user.create({
			data: {
				fullname: input.fullname,
				email: input.email,
				phone: input.phone,
				preferred_language: input.preferred_language ?? me.preferred_language,
				status: "INVITED",
				role_id: workerRole.id,
				manager_id: manager.user_id,
				verification_tokens: {
					create: {
						token_type: "ACCOUNT_SETUP",
						token_hash: hashCode(token),
						expires_at: new Date(Date.now() + SETUP_LINK_MS),
					},
				},
			},
			include: workerInclude,
		});
		await auditLog(tx, manager.user_id, {
			action: "WORKER_CREATE",
			entityType: "User",
			entityId: row.id,
			newValues: toWorker(row),
			ipAddress,
		});
		return row;
	});

	await sendInvitation(worker, token);
	return toWorker(worker);
}

/**
 * Edits a worker. Deactivating revokes their sessions; reactivating needs a
 * deactivated worker who set up their account. Sending the current status
 * changes nothing.
 */
export async function updateWorker(
	manager: AuthUser,
	workerId: string,
	input: UpdateWorkerInput,
	ipAddress: string | undefined,
): Promise<Worker> {
	return prisma.$transaction(async (tx) => {
		const worker = await findWorkerFor(manager, workerId, tx);
		const change = statusChange(worker, input.status);
		const row = await tx.user.update({
			where: { id: worker.id },
			data: input,
			include: workerInclude,
		});
		if (change === "WORKER_DEACTIVATE") {
			await tx.refreshToken.updateMany({
				where: { user_id: worker.id, revoked_at: null },
				data: { revoked_at: new Date() },
			});
		}
		if (change) {
			await auditLog(tx, manager.user_id, {
				action: change,
				entityType: "User",
				entityId: worker.id,
				oldValues: { status: worker.status },
				newValues: { status: row.status },
				ipAddress,
			});
		}
		return toWorker(row);
	});
}

/** Removes a worker who never set up their account, with their assignments. */
export async function deleteWorker(
	manager: AuthUser,
	workerId: string,
	ipAddress: string | undefined,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const worker = await findWorkerFor(manager, workerId, tx);
		if (worker.email_verified_at) {
			throw new AppError(
				"CONFLICT",
				"This worker has set up their account; deactivate them instead",
			);
		}
		await tx.placeWorker.deleteMany({ where: { worker_id: worker.id } });
		await tx.user.delete({ where: { id: worker.id } });
		await auditLog(tx, manager.user_id, {
			action: "WORKER_DELETE",
			entityType: "User",
			entityId: worker.id,
			oldValues: toWorker(worker),
			ipAddress,
		});
	});
}

function statusChange(
	worker: WorkerRow,
	wanted: UpdateWorkerInput["status"],
): Extract<AuditAction, "WORKER_DEACTIVATE" | "WORKER_REACTIVATE"> | null {
	if (wanted === undefined || wanted === worker.status) {
		return null;
	}
	if (wanted === "DEACTIVATED") {
		return "WORKER_DEACTIVATE";
	}
	if (worker.status !== "DEACTIVATED" || !worker.email_verified_at) {
		throw new AppError(
			"CONFLICT",
			"Only a deactivated worker who set up their account can be reactivated",
		);
	}
	return "WORKER_REACTIVATE";
}

function sendInvitation(worker: WorkerRow, token: string): Promise<void> {
	const link = new URL("/account-setup", config.APP_URL);
	link.searchParams.set("email", worker.email);
	link.searchParams.set("token", token);
	return sendEmail({
		to: worker.email,
		subject: "Set up your Amlak account",
		text: `Hi ${worker.fullname}, set your password to start using Amlak:\n${link}\n\nThe link expires in 7 days.`,
	});
}
