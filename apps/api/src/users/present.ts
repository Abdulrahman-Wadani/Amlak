import type { User } from "@amlak/shared";
import type { Role, User as UserRow } from "../generated/prisma/client.ts";
import { imageUrl } from "../uploads/storage.ts";

export async function toUser(row: UserRow & { role: Role }): Promise<User> {
	let pictureUrl: string | null = null;
	if (row.picture_path) {
		pictureUrl = await imageUrl(row.picture_path);
	}
	return {
		id: row.id,
		email: row.email,
		fullname: row.fullname,
		phone: row.phone,
		picture_url: pictureUrl,
		role: row.role.name as User["role"],
		status: row.status,
		preferred_language: row.preferred_language,
		email_verified_at: row.email_verified_at?.toISOString() ?? null,
		manager_id: row.manager_id,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	};
}
