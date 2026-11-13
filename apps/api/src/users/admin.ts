import type {
	AdminUpdateUserInput,
	ListUsersQuery,
	Paginated,
	User,
} from "@amlak/shared";
import { type AuditAction, auditLog } from "../audit.ts";
import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { AppError } from "../errors.ts";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { type Page, paginated } from "../pagination.ts";
import { toUser } from "./present.ts";

type UserRow = Prisma.UserGetPayload<{ include: { role: true } }>;

/** Every account, for the Admin, newest first. */
export async function listUsers(
	query: ListUsersQuery,
	page: Page,
): Promise<Paginated<User>> {
	const where: Prisma.UserWhereInput = { status: query.status };
	if (query.role) {
		where.role = { name: query.role };
	}
	if (query.search) {
		where.OR = [
			{ fullname: { contains: query.search, mode: "insensitive" } },
			{ email: { contains: query.search, mode: "insensitive" } },
		];
	}
	const [rows, total] = await prisma.$transaction([
		prisma.user.findMany({
			where,
			include: { role: true },
			orderBy: [{ created_at: "desc" }, { id: "asc" }],
			skip: page.skip,
			take: page.take,
		}),
		prisma.user.count({ where }),
	]);
	return paginated(await Promise.all(rows.map(toUser)), total, page);
}

export async function getUser(userId: string): Promise<User> {
	return toUser(await findUser(prisma, userId));
}

/**
 * The Admin edits any account. Deactivating logs the user out everywhere,
 * and a Manager's workers too, since they cannot work without their Manager.
 * Sending the current status changes nothing.
 */
export async function updateUser(
	admin: AuthUser,
	userId: string,
	input: AdminUpdateUserInput,
	ipAddress: string | undefined,
): Promise<User> {
	const row = await prisma.$transaction(async (tx) => {
		const user = await findUser(tx, userId);
		const change = statusChange(admin, user, input.status);
		const updated = await tx.user.update({
			where: { id: user.id },
			data: input,
			include: { role: true },
		});
		if (change === "USER_DEACTIVATE") {
			await tx.refreshToken.updateMany({
				where: {
					revoked_at: null,
					OR: [{ user_id: user.id }, { user: { manager_id: user.id } }],
				},
				data: { revoked_at: new Date() },
			});
		}
		if (change) {
			await auditLog(tx, admin.user_id, {
				action: change,
				entityType: "User",
				entityId: user.id,
				oldValues: { status: user.status },
				newValues: { status: updated.status },
				ipAddress,
			});
		}
		return updated;
	});
	return toUser(row);
}

async function findUser(
	db: PrismaClient | Prisma.TransactionClient,
	userId: string,
): Promise<UserRow> {
	const user = await db.user.findUnique({
		where: { id: userId },
		include: { role: true },
	});
	if (!user) {
		throw new AppError("NOT_FOUND", "User not found");
	}
	return user;
}

function statusChange(
	admin: AuthUser,
	user: UserRow,
	wanted: AdminUpdateUserInput["status"],
): Extract<AuditAction, "USER_DEACTIVATE" | "USER_REACTIVATE"> | null {
	if (wanted === undefined || wanted === user.status) {
		return null;
	}
	// So an Admin cannot lock themselves out, and one Admin always remains.
	if (user.id === admin.user_id) {
		throw new AppError("VALIDATION_ERROR", "Some fields are invalid", {
			fields: { status: "You cannot change your own status" },
		});
	}
	if (wanted === "DEACTIVATED") {
		return "USER_DEACTIVATE";
	}
	if (user.status !== "DEACTIVATED" || !user.email_verified_at) {
		throw new AppError(
			"CONFLICT",
			"Only a deactivated user whose email was verified can be reactivated",
		);
	}
	return "USER_REACTIVATE";
}
