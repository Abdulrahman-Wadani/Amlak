import type { Prisma, PrismaClient } from "./generated/prisma/client.ts";

export type AuditAction =
	| "LOGIN"
	| "PLACE_DELETE"
	| "ASSET_DELETE"
	| "WORKER_CREATE"
	| "WORKER_DELETE"
	| "WORKER_DEACTIVATE"
	| "WORKER_REACTIVATE"
	| "WORKER_ASSIGN"
	| "WORKER_UNASSIGN"
	| "TICKET_CREATE"
	| "TICKET_APPROVE"
	| "TICKET_REJECT"
	| "TICKET_REASSIGN"
	| "TICKET_COMPLETE";
export type AuditEntity =
	| "User"
	| "Place"
	| "Asset"
	| "PlaceWorker"
	| "MaintenanceTicket";

export type AuditEntry = {
	action: AuditAction;
	entityType: AuditEntity;
	entityId: string;
	oldValues?: Prisma.InputJsonValue;
	newValues?: Prisma.InputJsonValue;
	ipAddress?: string;
};

export async function auditLog(
	db: PrismaClient | Prisma.TransactionClient,
	userId: string,
	entry: AuditEntry,
): Promise<void> {
	await db.auditLog.create({
		data: {
			user_id: userId,
			action: entry.action,
			entity_type: entry.entityType,
			entity_id: entry.entityId,
			old_values: entry.oldValues,
			new_values: entry.newValues,
			ip_address: entry.ipAddress,
		},
	});
}
