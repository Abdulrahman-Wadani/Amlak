import type { User } from "@amlak/shared";
import type { Role, User as UserRow } from "../generated/prisma/client.ts";

export function toUser(row: UserRow & { role: Role }): User {
	return {
		id: row.id,
		email: row.email,
		fullname: row.fullname,
		phone: row.phone,
		picture_url: null,
		role: row.role.name as User["role"],
		status: row.status,
		preferred_language: row.preferred_language,
		email_verified_at: row.email_verified_at?.toISOString() ?? null,
		manager_id: row.manager_id,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
}
