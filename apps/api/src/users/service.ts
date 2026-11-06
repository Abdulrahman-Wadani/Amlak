import type { UpdateProfileInput, User } from "@amlak/shared";
import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { toUser } from "./present.ts";

export async function getMe(user: AuthUser): Promise<User> {
	const row = await prisma.user.findUniqueOrThrow({
		where: { id: user.user_id },
		include: { role: true },
	});
	return toUser(row);
}

export async function updateMe(
	user: AuthUser,
	input: UpdateProfileInput,
): Promise<User> {
	const row = await prisma.user.update({
		where: { id: user.user_id },
		data: input,
		include: { role: true },
	});
	return toUser(row);
}
