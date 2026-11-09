import type { UpdateProfileInput, User } from "@amlak/shared";
import type { AuthUser } from "../auth/tokens.ts";
import { prisma } from "../db.ts";
import { type ImageFile, removeImage, storeImage } from "../uploads/storage.ts";
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
	picture: ImageFile | undefined,
): Promise<User> {
	const before = await prisma.user.findUniqueOrThrow({
		where: { id: user.user_id },
		select: { picture_path: true },
	});

	let picturePath: string | undefined;
	if (picture) {
		picturePath = await storeImage(picture, `users/${user.user_id}`);
	}

	const row = await prisma.user.update({
		where: { id: user.user_id },
		// picture_path: undefined tells Prisma to leave the column as it is.
		data: { ...input, picture_path: picturePath },
		include: { role: true },
	});

	if (picturePath && before.picture_path) {
		await removeOldPicture(before.picture_path);
	}
	return toUser(row);
}

async function removeOldPicture(key: string): Promise<void> {
	try {
		await removeImage(key);
	} catch (error) {
		console.error("Could not remove the old picture", key, error);
	}
}
